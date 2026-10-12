// Push obavijesti: šalje neposlane retke iz tablice notifications na uređaje iz push_subscriptions (Web Push, VAPID).
// Poziva se iz aplikacije (s korisničkim JWT-om) nakon dodavanja zadatka/cateringa/eventa i pri otvaranju aplikacije.
//   { action: "key" }   -> { key } javni VAPID ključ za pretplatu preglednika
//   { action: "flush" } -> { sent, failed, removed, queued } pošalje što čeka
// VAPID ključevi se generiraju pri prvom pozivu i čuvaju u tablici app_keys (čita je samo service role).
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CONTACT = Deno.env.get("VAPID_CONTACT") ?? "https://nezlica44.github.io/polaris-app/";
const TTL = 86400; // sekunde koliko push servis čuva poruku dok uređaj nije na mreži

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// PostgREST sa service role ključem (zaobilazi RLS; samo unutar ove funkcije)
async function rest(path: string, init: RequestInit = {}, prefer?: string) {
  const headers: Record<string, string> = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Tko zove: PostgREST s korisnikovim tokenom provjerava potpis, my_role() vraća ulogu samo za aktivan profil
async function callerRole(auth: string | null): Promise<string | null> {
  if (!auth?.startsWith("Bearer ")) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/my_role`, { method: "POST", headers: { apikey: ANON_KEY, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) return null;
  const role = await r.json();
  return typeof role === "string" && role ? role : null;
}

type Keys = { pair: CryptoKeyPair; publicKey: string };
let cached: Keys | null = null;

async function getVapid(): Promise<Keys> {
  if (cached) return cached;
  let rows = await rest("app_keys?name=eq.vapid&select=value");
  if (!rows?.length) {
    const fresh = await webpush.generateVapidKeys({ extractable: true });
    const exported = await webpush.exportVapidKeys(fresh);
    // ako dvije instance generiraju istodobno, prva pobjeđuje (ignore-duplicates), pa ponovno čitamo
    await rest("app_keys", { method: "POST", body: JSON.stringify({ name: "vapid", value: JSON.stringify(exported) }) }, "resolution=ignore-duplicates,return=minimal");
    rows = await rest("app_keys?name=eq.vapid&select=value");
  }
  const exported = JSON.parse(rows[0].value) as webpush.ExportedVapidKeys;
  const pair = await webpush.importVapidKeys(exported, { extractable: false });
  cached = { pair, publicKey: await webpush.exportApplicationServerKey(pair) };
  return cached;
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s); // push servisi odbijaju tijelo > 4 KB

type Notification = { id: string; user_id: string; title: string; body: string | null; url: string | null };
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

async function flush() {
  const keys = await getVapid();
  // preuzmi što čeka (sent_at se postavlja odmah, da dvije istodobne instance ne šalju isto dvaput)
  const pending = await rest("notifications?sent_at=is.null&select=id&order=created_at&limit=100") as { id: string }[];
  if (!pending.length) return { sent: 0, failed: 0, removed: 0, queued: 0 };
  const ids = pending.map((n) => n.id).join(",");
  const claimed = await rest(`notifications?sent_at=is.null&id=in.(${ids})`, {
    method: "PATCH",
    body: JSON.stringify({ sent_at: new Date().toISOString() }),
  }, "return=representation") as Notification[];
  if (!claimed.length) return { sent: 0, failed: 0, removed: 0, queued: 0 };

  // obavijesti koje zbog prolazne greške nisu stigle ni na jedan uređaj vraćaju se u red (najviše 24 h od nastanka)
  const unclaim = (ids: string[]) => ids.length
    ? rest(`notifications?id=in.(${ids.join(",")})&created_at=gt.${new Date(Date.now() - 24 * 3600e3).toISOString()}`, { method: "PATCH", body: JSON.stringify({ sent_at: null }) }, "return=minimal")
    : Promise.resolve(null);

  const userIds = [...new Set(claimed.map((n) => n.user_id))].join(",");
  let subs: Subscription[], server: webpush.ApplicationServer;
  try {
    subs = await rest(`push_subscriptions?user_id=in.(${userIds})&select=id,user_id,endpoint,p256dh,auth`) as Subscription[];
    if (!subs.length) return { sent: 0, failed: 0, removed: 0, queued: claimed.length, retry: 0 };
    server = await webpush.ApplicationServer.new({ contactInformation: CONTACT, vapidKeys: keys.pair });
  } catch (e) {
    await unclaim(claimed.map((n) => n.id)).catch(() => {}); // ništa nije poslano: oslobodi red
    throw e;
  }
  let sent = 0, failed = 0;
  const dead = new Set<string>(), delivered = new Set<string>(), transient = new Set<string>();
  const jobs: Promise<void>[] = [];
  for (const n of claimed) {
    const payload = JSON.stringify({ title: cut(n.title, 100), body: cut(n.body ?? "", 300), url: n.url ?? "#/", tag: n.id });
    for (const s of subs) {
      if (s.user_id !== n.user_id || dead.has(s.id)) continue;
      jobs.push((async () => {
        try {
          await server.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }).pushTextMessage(payload, { ttl: TTL, urgency: webpush.Urgency.High });
          sent++; delivered.add(n.id);
        } catch (e) {
          failed++;
          const status = e instanceof webpush.PushMessageError ? e.response.status : 0;
          // 404/410 pretplata više ne postoji; 401/403 vezana je uz drugi VAPID ključ -> uređaj se ponovno registrira
          if ([401, 403, 404, 410].includes(status)) dead.add(s.id);
          else {
            if (status === 429 || status >= 500 || status === 0) transient.add(n.id); // push servis zauzet / mreža: pokušaj kasnije
            console.error("push failed", s.endpoint.slice(0, 60), status || String(e));
          }
        }
      })());
    }
  }
  await Promise.all(jobs);
  if (dead.size) await rest(`push_subscriptions?id=in.(${[...dead].join(",")})`, { method: "DELETE" }, "return=minimal");
  const retry = [...transient].filter((id) => !delivered.has(id));
  if (retry.length) await unclaim(retry).catch(() => {});
  return { sent, failed, removed: dead.size, queued: claimed.length, retry: retry.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Samo POST" }, 405);

  let action = "flush";
  try {
    const body = await req.json();
    if (body?.action) action = String(body.action);
  } catch { /* bez tijela = flush */ }

  try {
    // samo prijavljen i aktivan korisnik (potpis tokena provjerava PostgREST)
    if (!(await callerRole(req.headers.get("Authorization")))) return json({ error: "Nije dopušteno" }, 401);
    if (action === "key") return json({ key: (await getVapid()).publicKey });
    if (action === "flush") return json(await flush());
    return json({ error: "Nepoznata akcija" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
