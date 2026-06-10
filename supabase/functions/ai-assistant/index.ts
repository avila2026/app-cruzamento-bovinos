import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
 // Preflight CORS
 if (req.method === "OPTIONS") {
   return new Response("ok", { headers: corsHeaders });
 }
 try {
   const { question, animal_id } = await req.json();
   if (!question || typeof question !== "string") {
     return json({ error: "Campo 'question' é obrigatório." }, 400);
   }
   
   const supabase = createClient(
     Deno.env.get("SUPABASE_URL")!,
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
   );
   
   // 1. Embed da pergunta via Voyage AI
   const queryEmbedding = await embed(question, "query");
   
   // 2. Busca semântica na knowledge_base
   const { data: docs, error: matchErr } = await supabase.rpc("match_knowledge", {
     query_embedding: queryEmbedding,
     match_threshold: 0.72,
     match_count: 5,
   });
   if (matchErr) console.error("match_knowledge error:", matchErr.message);
   
   // 3. Dados do animal consultado (se houver)
   let animalContext = "";
   if (animal_id) {
     const { data: animal } = await supabase
       .from("animal")
       .select(`
         name, sex, birth_date, breed,
         evaluation ( program, date,
           evaluation_trait ( code, value, accuracy, percentile )
         ),
         animal_relation ( relation_type, related_name )
       `)
       .eq("id", animal_id)
       .single();
       
     if (animal) {
       animalContext = `\n\n### Dados do Animal Consultado:\n${JSON.stringify(animal, null, 2)}`;
     }
   }
   
   // 4. Monta contexto RAG
   const context = (docs ?? [])
     .map((d: { source: string; title?: string; content: string }) => `[${d.source}] ${d.title ?? ""}\n${d.content}`)
     .join("\n\n---\n\n");
     
   // 5. Chama Claude API
   const answer = await askClaude(question, context, animalContext);
   
   return json({
     answer,
     sources: (docs ?? []).map((d: { title?: string; url?: string }) => ({ title: d.title, url: d.url })),
   });
 } catch (e: unknown) {
   const err = e as Error;
   console.error(err);
   return json({ error: err.message }, 500);
 }
});

// ---------- Helpers ----------
function json(body: unknown, status = 200) {
 return new Response(JSON.stringify(body), {
   status,
   headers: { ...corsHeaders, "Content-Type": "application/json" },
 });
}

async function embed(input: string, inputType: "query" | "document"): Promise<number[]> {
 const res = await fetch("https://api.voyageai.com/v1/embeddings", {
   method: "POST",
   headers: {
     "Authorization": `Bearer ${Deno.env.get("VOYAGE_API_KEY")}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify({ model: "voyage-3", input, input_type: inputType }),
 });
 if (!res.ok) throw new Error(`Voyage API: ${res.status} ${await res.text()}`);
 const data = await res.json();
 return data.data[0].embedding;
}

async function askClaude(question: string, context: string, animalContext: string): Promise<string> {
 const res = await fetch("https://api.anthropic.com/v1/messages", {
   method: "POST",
   headers: {
     "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
     "anthropic-version": "2023-06-01",
     "Content-Type": "application/json",
   },
   body: JSON.stringify({
     model: "claude-3-5-sonnet-20241022",
     max_tokens: 1024,
     system:
       "Você é um especialista em genética bovina zebuína, com profundo conhecimento " +
       "em DEPs, PMGZ, ANCP, Geneplus-Embrapa, iABCZ, CSG e melhoramento genético de Nelore. " +
       "Responda de forma técnica mas acessível para criadores PO brasileiros. " +
       "Use os documentos fornecidos como base. Sempre mencione a acurácia ao interpretar DEPs. " +
       "Se não houver base suficiente nos documentos, diga isso claramente em vez de inventar.",
     messages: [{
       role: "user",
       content: `Pergunta: ${question}\n\n### Documentos de Referência:\n${context || "(nenhum)"}${animalContext}`,
     }],
   }),
 });
 if (!res.ok) throw new Error(`Anthropic API: ${res.status} ${await res.text()}`);
 const data = await res.json();
 return data.content[0].text;
}
