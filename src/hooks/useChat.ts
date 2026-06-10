import { useCallback, useState, useEffect } from 'react';
import { askAssistant } from '../services/supabaseAiClient';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  thinking?: string;
}

export type Message = ChatMessage;

export function useChat(
  initialMessages: Message[] = [],
  onMessagesChange?: (messages: Message[]) => void,
  animalId?: string
) {
  const [messages, setMessagesState] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when initialMessages change (e.g. switching sessions)
  useEffect(() => {
    setMessagesState(initialMessages);
  }, [initialMessages]);

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
      
      // Adiciona a mensagem do usuário e um placeholder vazio para o assistente
      // para que a UI mostre o indicador de carregamento
      setMessages([...history, { role: 'assistant', content: '' }]);
      setIsLoading(true);

      try {
        const res = await askAssistant(text, animalId);
        
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
      } catch (err: any) {
        setError(err?.message || 'Falha ao obter resposta do assistente.');
        // Remove o placeholder vazio em caso de erro
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last.content === '') {
            next.pop();
          }
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, setMessages, animalId]
  );

  const stop = useCallback(() => {}, []); // Sem streaming, parar é um noop
  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, [setMessages]);

  return { messages, isLoading, error, send, stop, clear, setMessages };
}
