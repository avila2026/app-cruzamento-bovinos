import { useCallback, useState, useRef } from 'react';
import { streamChat as streamOllamaChat, type ChatMessage } from '../services/ollamaClient';
import { askAssistant } from '../services/supabaseAiClient';

export type Message = ChatMessage;
export type ProviderType = 'supabase' | 'ollama';

// Contexto do domínio: o assistente é um zootecnista virtual do CattleGen.
const SYSTEM_PROMPT: Message = {
  role: 'system',
  content: [
    'Você é o assistente de melhoramento genético do CattleGen, um aplicativo de gestão',
    'de cruzamento de bovinos de corte (foco em Nelore e raças zebuínas no Brasil).',
    'Ajude o pecuarista a: interpretar DEPs e índices (Geneplus, PMGZ, ANCP),',
    'comparar touros e matrizes, sugerir acasalamentos dirigidos segundo o objetivo',
    '(novilhas precoces, reposição, terminal), e explicar conceitos de genética de forma',
    'simples e prática. Responda sempre em português do Brasil, de forma objetiva.',
    'Quando faltar dado, diga qual informação é necessária. Não invente números de DEP.',
  ].join(' '),
};

export function useChat(
  initialMessages: Message[] = [],
  onMessagesChange?: (messages: Message[]) => void,
  animalId?: string,
  sessionId?: string
) {
  const [messages, setMessagesState] = useState<Message[]>(initialMessages);
  const [prevSessionId, setPrevSessionId] = useState<string | undefined>(sessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Backends
  const [provider, setProviderState] = useState<ProviderType>('supabase');
  const [model, setModel] = useState<string>('claude-3-5-sonnet-20241022');
  const [thinkLevel, setThinkLevel] = useState<string>('medium');
  
  const abortRef = useRef<AbortController | null>(null);

  // Sync state when session changes
  if (sessionId !== prevSessionId) {
    setPrevSessionId(sessionId);
    setMessagesState(initialMessages);
  }

  const setProvider = useCallback((newProvider: ProviderType) => {
    setProviderState(newProvider);
    if (newProvider === 'ollama') {
      setModel('gpt-oss:120b-cloud');
    } else {
      setModel('claude-3-5-sonnet-20241022');
    }
  }, []);

  const setMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setMessagesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onMessagesChange?.(next);
        return next;
      });
    },
    [onMessagesChange]
  );

  const send = useCallback(
    async (userInput: string) => {
      const text = userInput.trim();
      if (!text || isLoading) return;

      setError(null);
      const userMsg: Message = { role: 'user', content: text };
      const history = [...messages, userMsg];
      
      setMessages([...history, { role: 'assistant', content: '', thinking: '' }]);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (provider === 'ollama') {
          let thinkParam: boolean | 'low' | 'medium' | 'high' = 'medium';
          if (thinkLevel === 'false') thinkParam = false;
          else if (thinkLevel === 'true') thinkParam = true;
          else if (thinkLevel === 'low' || thinkLevel === 'medium' || thinkLevel === 'high') {
            thinkParam = thinkLevel as 'low' | 'medium' | 'high';
          }

          // Ollama usa streaming e o prompt de sistema local
          await streamOllamaChat([SYSTEM_PROMPT, ...history], {
            model: model,
            think: thinkParam,
            signal: controller.signal,
            onDelta: ({ content, thinking }) => {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = {
                    ...last,
                    content: last.content + (content || ''),
                    thinking: (last.thinking || '') + (thinking || ''),
                  };
                }
                return next;
              });
            },
          });
        } else {
          // Supabase usa requisição HTTP padrão (não-streaming)
          const res = await askAssistant(text, animalId, model);
          
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              let sourcesText = '';
              if (res.sources && res.sources.length > 0) {
                sourcesText = '\n\n**Fontes:**\n' + res.sources.map(s => `- [${s.title || 'Link'}](${s.url || '#'})`).join('\n');
              }
              next[next.length - 1] = {
                role: 'assistant',
                content: res.answer + sourcesText,
              };
            }
            return next;
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') return;
          setError(err.message);
        } else {
          setError('Falha ao obter resposta do assistente.');
        }
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last.content === '' && (!last.thinking || last.thinking === '')) {
            next.pop();
          }
          return next;
        });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, setMessages, provider, model, thinkLevel, animalId]
  );

  const stop = useCallback(() => {
    if (provider === 'ollama') {
      abortRef.current?.abort();
    }
  }, [provider]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, [setMessages]);

  return { 
    messages, 
    isLoading, 
    error, 
    send, 
    stop, 
    clear, 
    setMessages, 
    provider, 
    setProvider, 
    model, 
    setModel,
    thinkLevel,
    setThinkLevel
  };
}
