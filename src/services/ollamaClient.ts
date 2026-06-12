// Cliente leve para o endpoint OpenAI-compatível do Ollama.
// Usa fetch nativo com streaming (SSE), sem SDK e sem chave no front:
// o app fala apenas com o daemon local (via proxy /ollama), que cuida da
// autenticação para modelos *-cloud usando o login do Ollama.

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  thinking?: string;
  images?: string[]; // base64 data URLs
}

const BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || '/ollama/v1';
export const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'gpt-oss:120b-cloud';

interface StreamOptions {
  model?: string;
  think?: boolean | 'low' | 'medium' | 'high';
  signal?: AbortSignal;
  /** Chamado a cada pedaço de texto ou pensamento recebido do modelo. */
  onDelta: (delta: { content?: string; thinking?: string }) => void;
}

/**
 * Envia o histórico de mensagens e transmite a resposta do modelo em tempo real.
 * Resolve quando o streaming termina; lança em caso de erro de rede/HTTP.
 */
export async function streamChat(messages: ChatMessage[], opts: StreamOptions): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: messages.map(({ role, content, thinking, images }) => {
        const msg: any = { role };
        if (thinking) msg.thinking = thinking;
        
        if (images && images.length > 0) {
          msg.content = [
            { type: 'text', text: content },
            ...images.map(img => ({
              type: 'image_url',
              image_url: { url: img }
            }))
          ];
        } else {
          msg.content = content;
        }
        return msg;
      }),
      stream: true,
      ...(opts.think !== undefined ? { think: opts.think } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Ollama respondeu ${res.status}. ${detail || 'Verifique se o daemon está ativo (ollama serve).'}`);
  }
  if (!res.body) throw new Error('Resposta sem corpo (streaming indisponível).');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: eventos separados por linha, prefixados com "data: ".
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const choice = json.choices?.[0];
        const content: string | undefined = choice?.delta?.content;
        // reasoning_content is standard for DeepSeek, thinking is standard for Ollama's Qwen/Llama
        const thinking: string | undefined = choice?.delta?.thinking || choice?.delta?.reasoning_content;

        if (content || thinking) {
          opts.onDelta({ content, thinking });
        }
      } catch {
        // Linha parcial/keep-alive — ignora.
      }
    }
  }
}

/**
 * Busca a lista de modelos disponíveis no daemon local do Ollama.
 */
export async function fetchOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/models`);
    if (!res.ok) throw new Error('Falha ao buscar modelos do Ollama');
    const data = await res.json();
    return data.data.map((m: any) => m.id);
  } catch (err) {
    console.warn('Erro ao carregar modelos do Ollama, usando fallback:', err);
    // Lista de fallback contendo os modelos conhecidos do usuário
    return [
      DEFAULT_MODEL,
      'qwen2.5:1.5b',
      'gemma3:27b-cloud',
      'kimi-k2.6:cloud',
      'nemotron-3-nano:30b-cloud'
    ];
  }
}
