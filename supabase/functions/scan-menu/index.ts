// Skeniranje jelovnika: slike jelovnika -> popis jela (kategorija, naziv, opis, cijena) redom kao na jelovniku.
import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  properties: {
    dishes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          price: { type: ["number", "null"] },
        },
        required: ["category", "name", "description", "price"],
        additionalProperties: false,
      },
    },
  },
  required: ["dishes"],
  additionalProperties: false,
};

const PROMPT = `Ovo je jelovnik hrvatskog restorana (jedna ili više slika, redom kako idu stranice).
Izvuci sva jela i pića točno onako kako pišu na jelovniku, istim redoslijedom.
- category: naslov kategorije pod kojim jelo stoji na jelovniku (npr. "Roštilj", "Pizze"). Ako nema naslova, napiši "Ostalo".
- name: naziv jela kako piše, bez cijene.
- description: kratki opis ili sastojci ako pišu ispod naziva, inače prazan string.
- price: cijena u eurima kao broj (npr. 12.5). Ako postoji više veličina, uzmi prvu (standardnu) i ostale veličine dodaj u description. Ako cijene nema, null.
Ne izmišljaj jela koja nisu na slici.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Samo POST" }, 405);

  // samo admini smiju skenirati
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return json({ error: "Nije dopušteno" }, 403);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "AI ključ još nije postavljen (ANTHROPIC_API_KEY)." }, 500);

  let images: { media_type: string; data: string }[];
  try {
    ({ images } = await req.json());
  } catch {
    return json({ error: "Neispravan zahtjev" }, 400);
  }
  if (!Array.isArray(images) || !images.length || images.length > 8) return json({ error: "Pošalji 1 do 8 slika." }, 400);

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          ...images.map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.media_type, data: img.data } })),
          { type: "text" as const, text: PROMPT },
        ],
      }],
    } as any);

    if (response.stop_reason === "refusal") return json({ error: "AI je odbio obraditi sliku. Pokušaj s drugom slikom." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "Jelovnik je predug za jedno skeniranje. Skeniraj manje stranica odjednom." }, 422);
    const text = response.content.find((b: any) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text);
    return json({ dishes: parsed.dishes ?? [] });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "AI ključ nije ispravan." }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "AI je trenutno zauzet, pokušaj za minutu." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `AI greška: ${e.message}` }, 502);
    if (e instanceof SyntaxError) return json({ error: "AI je vratio neispravan odgovor, pokušaj ponovno." }, 502);
    return json({ error: String(e) }, 500);
  }
});
