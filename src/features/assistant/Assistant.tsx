import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useChatHistory } from '../../hooks/useChatHistory';

import { Bot, Send, Square, Trash2, User, Copy, Check, Paperclip, MessageSquare, Plus, Archive, ArchiveRestore } from 'lucide-react';

const SUGESTOES = [
  'O que significa a DEP de Peso à Desmama?',
  'Compare um touro com DPDG alta e PN baixo: é bom para novilhas?',
  'Quais características priorizar para um acasalamento terminal?',
];

const Assistant: React.FC = () => {
  const {
    sessions,
    recentSessions,
    archivedSessions,
    activeSessionId,
    activeSession,
    setActiveSessionId,
    createSession,
    updateSessionMessages,
    deleteSession,
    archiveSession,
  } = useChatHistory();

  // Initialize with the active session's messages, if any
  const {
    messages,
    isLoading,
    error,
    send,
    stop,
    clear,
    provider,
    setProvider,
    model,
    setModel,
  } = useChat(
    activeSession?.messages || [],
    (newMessages) => {
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, newMessages);
      }
    }
  );

  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When there are no sessions, create one automatically
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    } else if (!activeSessionId) {
      // Pick the first recent session, or just create a new one
      const firstRecent = recentSessions[0];
      if (firstRecent) {
        setActiveSessionId(firstRecent.id);
      } else {
        createSession();
      }
    }
  }, [sessions.length, activeSessionId, createSession, recentSessions, setActiveSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId) createSession(input);
    send(input);
    setInput('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const prompt = `Por favor, analise o seguinte arquivo (${file.name}):\n\n${text}`;
      if (!activeSessionId) createSession(prompt);
      send(prompt);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const handleClearChat = () => {
    clear();
    if (activeSessionId) {
      updateSessionMessages(activeSessionId, []);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] w-full max-w-6xl mx-auto gap-4">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col gap-4 border-r border-neutral-800 pr-4 overflow-y-auto">
        <button
          onClick={() => createSession()}
          className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-4 py-3 rounded-lg transition-colors border border-emerald-500/20 w-full"
        >
          <Plus size={18} />
          <span>Novo Chat</span>
        </button>

        {recentSessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2">Recentes</h3>
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between group rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  activeSessionId === s.id ? 'bg-neutral-800 text-gray-100' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-gray-200'
                }`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate text-sm">{s.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); archiveSession(s.id); }} className="text-neutral-500 hover:text-emerald-400 p-1" title="Arquivar">
                    <Archive size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="text-neutral-500 hover:text-red-400 p-1" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {archivedSessions.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2">Arquivados</h3>
            {archivedSessions.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between group rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  activeSessionId === s.id ? 'bg-neutral-800 text-gray-100' : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-gray-300'
                }`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Archive size={14} className="shrink-0" />
                  <span className="truncate text-sm opacity-70">{s.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); archiveSession(s.id); }} className="text-neutral-500 hover:text-emerald-400 p-1" title="Desarquivar">
                    <ArchiveRestore size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="text-neutral-500 hover:text-red-400 p-1" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Assistente Genético</h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span>Conexão:</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="bg-neutral-800 text-neutral-200 border border-neutral-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
                >
                  <option value="supabase">Supabase (Nuvem)</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span>Modelo:</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-neutral-800 text-neutral-200 border border-neutral-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono cursor-pointer"
                >
                  {provider === 'supabase' ? (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-oss:120b-cloud">gpt-oss:120b-cloud</option>
                      <option value="llama3">llama3</option>
                      <option value="qwen2.5">qwen2.5</option>
                      <option value="deepseek-coder">deepseek-coder</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center space-x-2 text-neutral-400 hover:text-red-300 transition-colors text-sm"
            >
              <Trash2 size={16} />
              <span>Limpar Tela</span>
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
                    onClick={() => {
                      if (!activeSessionId) createSession(s);
                      send(s);
                    }}
                    className="text-left text-sm px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-950/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-neutral-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 group ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                  m.role === 'user' ? 'bg-neutral-700' : 'bg-emerald-600'
                }`}
              >
                {m.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-neutral-950" />}
              </div>
              <div
                className={`relative rounded-xl px-4 py-2.5 max-w-[80%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-neutral-800 text-gray-100'
                    : 'bg-neutral-950/60 border border-neutral-800 text-gray-200'
                }`}
              >
                {/* Thinking / Reasoning Block */}
                {m.thinking && (
                  <details className="mb-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-850 rounded-lg p-2 overflow-x-auto" open>
                    <summary className="cursor-pointer font-medium hover:text-neutral-300 select-none flex items-center gap-1">
                      <Bot size={12} className="text-emerald-500 animate-pulse" />
                      <span>Raciocínio Interno</span>
                    </summary>
                    <div className="mt-1.5 pl-2 border-l border-neutral-800 whitespace-pre-wrap font-mono text-[10px] leading-normal opacity-80">
                      {m.thinking}
                    </div>
                  </details>
                )}

                {/* Normal Content */}
                <div className="whitespace-pre-wrap">
                  {m.content || (isLoading && i === messages.length - 1 && !m.thinking ? (
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                    </span>
                  ) : '')}
                </div>

                {/* Copy Button */}
                {m.content && m.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(m.content, i)}
                    className="absolute -right-10 top-2 p-1.5 rounded-md text-neutral-500 hover:text-gray-300 hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
                    title="Copiar mensagem"
                  >
                    {copiedIndex === i ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                )}
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
        <form onSubmit={submit} className="mt-4 flex gap-3 shrink-0">
          <div className="flex-1 relative flex items-center bg-neutral-900/50 border border-neutral-800 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 text-neutral-400 hover:text-emerald-400 transition-colors"
              title="Anexar arquivo"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.csv,.json,.md,.xml"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao assistente ou anexe um arquivo..."
              className="flex-1 bg-transparent px-2 py-3 text-gray-200 focus:outline-none"
            />
          </div>
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
    </div>
  );
};

export default Assistant;
