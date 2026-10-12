// Push obavijesti: šalje neposlane retke iz tablice notifications na uređaje iz push_subscriptions (Web Push, VAPID).
// Poziva se iz aplikacije (s korisničkim JWT-om) nakon dodavanja zadatka/cateringa/eventa i pri otvaranju aplikacije.
//   { action: "key" }   -> { key } javni VAPID ključ za pretplatu preglednika
//   { action: "flush" } -> { sent, failed, removed, queued } pošalje što čeka
// VAPID ključevi se generiraju pri prvom pozivu i čuvaju u tablici app_keys (čita je samo service role).
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

function jwtPayload(auth: string | null): { sub?: string; role?: string } | null {
  const t = auth?.replace(/^Bearer\s+/i, "");
  if (!t) return null;
  try {
    const part = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part));
  } catch {
    return null;
  }
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

  const userIds = [...new Set(claimed.map((n) => n.user_id))].join(",");
  const subs = await rest(`push_subscriptions?user_id=in.(${userIds})&select=id,user_id,endpoint,p256dh,auth`) as Subscription[];
  if (!subs.length) return { sent: 0, failed: 0, removed: 0, queued: claimed.length };

  const server = await webpush.ApplicationServer.new({ contactInformation: CONTACT, vapidKeys: keys.pair });
  let sent = 0, failed = 0;
  const dead = new Set<string>();
  const jobs: Promise<void>[] = [];
  for (const n of claimed) {
    const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.url ?? "#/", tag: n.id });
    for (const s of subs) {
      if (s.user_id !== n.user_id || dead.has(s.id)) continue;
      jobs.push((async () => {
        try {
          await server.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }).pushTextMessage(payload, { ttl: TTL, urgency: webpush.Urgency.High });
          sent++;
        } catch (e) {
          failed++;
          const status = e instanceof webpush.PushMessageError ? e.response.status : 0;
          if (status === 404 || status === 410) dead.add(s.id); // pretplata više ne postoji
          else console.error("push failed", s.endpoint.slice(0, 60), status || String(e));
        }
      })());
    }
  }
  await Promise.all(jobs);
  if (dead.size) await rest(`push_subscriptions?id=in.(${[...dead].join(",")})`, { method: "DELETE" }, "return=minimal");
  return { sent, failed, removed: dead.size, queued: claimed.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Samo POST" }, 405);

  // JWT je gateway već provjerio (verify_jwt); ovdje tražimo prijavljenog i aktivnog korisnika
  const claims = jwtPayload(req.headers.get("Authorization"));
  if (!claims?.sub || claims.role !== "authenticated") return json({ error: "Nije dopušteno" }, 401);
  const prof = await rest(`profiles?id=eq.${claims.sub}&active=is.true&select=id`);
  if (!prof?.length) return json({ error: "Nije dopušteno" }, 403);

  let action = "flush";
  try {
    const body = await req.json();
    if (body?.action) action = String(body.action);
  } catch { /* bez tijela = flush */ }

  try {
    if (action === "key") return json({ key: (await getVapid()).publicKey });
    if (action === "flush") return json(await flush());
    return json({ error: "Nepoznata akcija" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
