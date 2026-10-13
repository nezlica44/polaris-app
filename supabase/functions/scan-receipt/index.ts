// Slikaj račun: fotografija računa -> stavke (naziv, količina, cijena, PDV) preko Claude vision API-ja,
// uz prijedlog kojem postojećem artiklu iz Nabavke stavka pripada. Ništa se ne mijenja u bazi;
// aplikacija pokaže pregled "je li sve u redu?" i tek potvrda admina mijenja cijene.
//   POST { image: base64, mime: "image/jpeg", supplier_id?: uuid }
//   -> { store, date, total, lines: [{ name, qty, unit, unit_price_gross, vat_rate, total, pack, price_net, match }] }
// Treba tajnu ANTHROPIC_API_KEY (Supabase -> Edge Functions -> Secrets); bez nje vraća 503 { error: "no_key" }.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const API_URL = (Deno.env.get("ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com") + "/v1/messages";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";
const MAX_IMAGE = 6 * 1024 * 1024; // base64 znakova (cca 4,5 MB slike); aplikacija smanjuje sliku na 1600 px

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function rest(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
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

const PROMPT = `Ovo je fotografija računa ili dostavnice (Hrvatska, cijene u eurima). Pročitaj sve stavke s računa.
Vrati SAMO JSON ovog oblika, bez objašnjenja i bez markdowna:
{"store":"naziv trgovine/dobavljača ili null","date":"YYYY-MM-DD ili null","total":ukupan iznos računa s PDV-om kao broj ili null,
 "lines":[{"name":"naziv artikla kako piše na računu, bez šifri i bez cijene","qty":broj,"unit":"kg|g|l|ml|kom|pak",
  "unit_price_gross":jedinična cijena s PDV-om kao broj,"total":iznos stavke s PDV-om kao broj,
  "vat_rate":stopa PDV-a stavke kao broj (25, 13, 5 ili 0) prema oznaci stope na računu ili null ako se ne vidi,
  "pack":{"size":broj,"unit":"kg|g|l|ml"} ako naziv ili stavka sadrži veličinu pakiranja (npr. "Pelat 2,5 kg", "Ulje 1 l"), inače null}]}
Pravila: decimalni zarez pretvori u točku; popusti i povrati ambalaže nisu stavke; ako je jedinična cijena izražena po kg, unit je "kg" i qty je težina u kg.
Ako slika nije račun ili je nečitljiva, vrati {"store":null,"date":null,"total":null,"lines":[],"error":"kratko objašnjenje"}.`;

type Line = { name: string; qty: number | null; unit: string; unit_price_gross: number | null; total: number | null; vat_rate: number | null; pack: { size: number; unit: string } | null };
type Item = { id: string; name: string; unit: string; price_net: number | null; vat_rate: number | null; supplier_id: string | null; suppliers: { name: string } | null };

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const UNITS = new Set(["kg", "g", "l", "ml", "kom", "pak"]);
const unitOf = (u: unknown): string => { const s = String(u ?? "").toLowerCase().trim(); if (UNITS.has(s)) return s; if (s === "lit" || s === "lt") return "l"; if (s === "kom." || s === "pc" || s === "pcs" || s === "x") return "kom"; return "kom"; };

// tolerantno čitanje JSON-a iz odgovora modela (bez ili s ``` ogradom)
export function parseModelJson(text: string): { store: string | null; date: string | null; total: number | null; error?: string; lines: Line[] } {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("Model nije vratio JSON");
  const raw = JSON.parse(text.slice(a, b + 1));
  const lines: Line[] = (Array.isArray(raw.lines) ? raw.lines : []).map((l: Record<string, unknown>) => {
    const pack = l.pack && typeof l.pack === "object" ? { size: num((l.pack as Record<string, unknown>).size) ?? 0, unit: unitOf((l.pack as Record<string, unknown>).unit) } : null;
    return {
      name: String(l.name ?? "").trim().slice(0, 120),
      qty: num(l.qty), unit: unitOf(l.unit),
      unit_price_gross: num(l.unit_price_gross), total: num(l.total),
      vat_rate: [25, 13, 5, 0].includes(num(l.vat_rate) as number) ? num(l.vat_rate) : null,
      pack: pack && pack.size > 0 && ["kg", "g", "l", "ml"].includes(pack.unit) ? pack : null,
    };
  }).filter((l: Line) => l.name);
  return { store: raw.store ? String(raw.store).slice(0, 80) : null, date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date ?? "")) ? raw.date : null, total: num(raw.total), error: raw.error ? String(raw.error) : undefined, lines };
}

// Usporedba naziva: mala slova, bez dijakritike, bez šifri i zagrada; točan pogodak 1, sadržavanje 0,85, preklapanje riječi (Jaccard)
const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (s: string) => new Set(normName(s).split(" ").filter((t) => t.length >= 3 && !/^\d/.test(t))); // bez brojeva i veličina (1kg, 2,5l)
export function matchScore(a: string, b: string): number {
  const x = normName(a), y = normName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const tx = tokens(a), ty = tokens(b);
  if (!tx.size || !ty.size) return 0;
  let inter = 0; for (const t of tx) if (ty.has(t)) inter++;
  return inter / (tx.size + ty.size - inter);
}
export function bestMatch(name: string, items: Item[], supplierId?: string | null) {
  let best: { item: Item; score: number } | null = null;
  for (const it of items) {
    let s = matchScore(name, it.name);
    if (s && supplierId && it.supplier_id === supplierId) s += 0.1;
    if (s >= 0.5 && (!best || s > best.score)) best = { item: it, score: s };
  }
  return best;
}
// neto cijena po jedinici s računa i, ako postoji pakiranje, po kg/l
const BASE: Record<string, [string, number]> = { kg: ["kg", 1], g: ["kg", 0.001], l: ["l", 1], ml: ["l", 0.001] };
export function enrich(l: Line, items: Item[], supplierId?: string | null) {
  const vat = l.vat_rate ?? 25;
  const gross = l.unit_price_gross ?? (l.total != null && l.qty ? l.total / l.qty : null);
  const price_net = gross != null ? +(gross / (1 + vat / 100)).toFixed(4) : null;
  let per: { unit: string; price_net: number } | null = null;
  if (price_net != null && l.pack && BASE[l.pack.unit]) {
    const [bu, f] = BASE[l.pack.unit];
    per = { unit: bu, price_net: +(price_net / (l.pack.size * f)).toFixed(4) };
  } else if (price_net != null && BASE[l.unit] && l.unit !== BASE[l.unit][0]) {
    const [bu, f] = BASE[l.unit];
    per = { unit: bu, price_net: +(price_net / f).toFixed(4) };
  }
  const m = bestMatch(l.name, items, supplierId);
  return {
    ...l, vat_rate_used: vat, price_net, per,
    match: m ? { item_id: m.item.id, item_name: m.item.name, unit: m.item.unit, price_net: m.item.price_net, vat_rate: m.item.vat_rate, supplier_id: m.item.supplier_id, supplier: m.item.suppliers?.name ?? null, score: +m.score.toFixed(2) } : null,
  };
}

async function askModel(image: string, mime: string) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 4000,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: image } }, { type: "text", text: PROMPT }] }],
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`AI ${r.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const out = (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
  return { text: out, usage: data.usage ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const role = await callerRole(req.headers.get("Authorization"));
  if (!role) return json({ error: "Nije dopušteno" }, 401);
  if (!API_KEY) return json({ error: "no_key", message: "Ključ za čitanje računa (ANTHROPIC_API_KEY) nije postavljen u Supabase tajnama." }, 503);
  let body: { image?: string; mime?: string; supplier_id?: string | null };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const image = String(body.image ?? "").replace(/^data:[^,]*,/, "");
  const mime = ["image/jpeg", "image/png", "image/webp"].includes(String(body.mime)) ? String(body.mime) : "image/jpeg";
  if (!image || image.length > MAX_IMAGE) return json({ error: "bad_image", message: "Slika nedostaje ili je prevelika." }, 400);
  try {
    const [{ text, usage }, items] = await Promise.all([
      askModel(image, mime),
      rest("items?select=id,name,unit,price_net,vat_rate,supplier_id,suppliers(name)") as Promise<Item[]>,
    ]);
    const parsed = parseModelJson(text);
    const supplierId = typeof body.supplier_id === "string" && body.supplier_id ? body.supplier_id : null;
    return json({ store: parsed.store, date: parsed.date, total: parsed.total, error: parsed.error ?? null, lines: parsed.lines.map((l) => enrich(l, items, supplierId)), model: MODEL, usage });
  } catch (e) {
    return json({ error: "ai_failed", message: String((e as Error).message ?? e).slice(0, 300) }, 502);
  }
});
