import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { DEFAULT_MODEL } from '../../services/ollamaClient';
import { Bot, Send, Square, Trash2, User } from 'lucide-react';

const SUGESTOES = [
  'O que significa a DEP de Peso à Desmama?',
  'Compare um touro com DPDG alta e PN baixo: é bom para novilhas?',
  'Quais características priorizar para um acasalamento terminal?',
];

const Assistant: React.FC = () => {
  const { messages, isLoading, error, send, stop, clear } = useChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Assistente Genético</h1>
          <p className="text-sm text-neutral-500">
            Modelo: <span className="font-mono text-neutral-400">{DEFAULT_MODEL}</span>
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center space-x-2 text-neutral-400 hover:text-red-300 transition-colors text-sm"
          >
            <Trash2 size={16} />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="text-neutral-950" size={28} />
            </div>
            <p className="max-w-md">
              Pergunte sobre DEPs, índices genéticos ou peça sugestões de acasalamento para o seu rebanho.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-sm px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-950/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-neutral-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                  m.role === 'user' ? 'bg-neutral-700' : 'bg-emerald-600'
                }`}
              >
                {m.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-neutral-950" />}
              </div>
              <div
                className={`rounded-xl px-4 py-2.5 max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-neutral-800 text-gray-100'
                    : 'bg-neutral-950/60 border border-neutral-800 text-gray-200'
                }`}
              >
                {m.content || (isLoading && i === messages.length - 1 ? (
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                  </span>
                ) : '')}
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Entrada */}
      <form onSubmit={submit} className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao assistente..."
          className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 px-5 py-3 rounded-lg transition-colors"
          >
            <Square size={18} />
            <span>Parar</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 disabled:text-neutral-400 text-white px-5 py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20"
          >
            <Send size={18} />
            <span>Enviar</span>
          </button>
        )}
      </form>
    </div>
  );
};

export default Assistant;
