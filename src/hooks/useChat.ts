import { useCallback, useRef, useState, useEffect } from 'react';
import { streamChat, type ChatMessage } from '../services/ollamaClient';

export type Message = ChatMessage;

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
  onMessagesChange?: (messages: Message[]) => void
) {
  const [messages, setMessagesState] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync state when initialMessages change (e.g. switching sessions)
  useEffect(() => {
    setMessagesState(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Histórico enviado ao modelo (inclui o system prompt e a nova mensagem).
      const history = [...messages, userMsg];
      // Adiciona a mensagem do usuário + placeholder do assistente para streaming.
      setMessages([...history, { role: 'assistant', content: '' }]);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat([SYSTEM_PROMPT, ...history], {
          signal: controller.signal,
          onDelta: (chunk) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + chunk };
              }
              return next;
            });
          },
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Falha ao falar com o modelo.');
        // Remove o placeholder vazio do assistente em caso de erro.
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && last.content === '') next.pop();
          return next;
        });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, setMessages]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, [setMessages]);

  return { messages, isLoading, error, send, stop, clear, setMessages };
}
