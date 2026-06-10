import { supabase } from "../lib/supabase";

export interface AiSource { 
  title: string; 
  url: string; 
}

export interface AiResponse { 
  answer: string; 
  sources: AiSource[]; 
}

export async function askAssistant(
  question: string,
  animalId?: string,
  model?: string
): Promise<AiResponse> {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { question, animal_id: animalId, model },
  });
  if (error) throw new Error(`Assistente indisponível: ${error.message}`);
  return data as AiResponse;
}
