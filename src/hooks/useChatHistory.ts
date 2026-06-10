import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage } from '../services/ollamaClient';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string; // ISO string
  archived: boolean;
}

const STORAGE_KEY = 'cattlegen_chat_sessions';

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        const recent = parsed.filter((s) => !s.archived);
        return recent[0]?.id || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Save sessions whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const generateTitle = (firstMessage: string) => {
    // Generate a short title from the first user message
    return firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
  };

  const createSession = useCallback((initialMessageContent?: string) => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: initialMessageContent ? generateTitle(initialMessageContent) : 'Nova Conversa',
      messages: [],
      createdAt: new Date().toISOString(),
      archived: false,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, []);

  const updateSessionMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          // Update title if it's "Nova Conversa" and we have user messages
          let newTitle = s.title;
          if (s.title === 'Nova Conversa' && messages.length > 0) {
            const firstUserMsg = messages.find((m) => m.role === 'user');
            if (firstUserMsg) {
              newTitle = generateTitle(firstUserMsg.content);
            }
          }
          return { ...s, messages, title: newTitle };
        }
        return s;
      })
    );
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((prevActive) => (prevActive === id ? null : prevActive));
  }, []);

  const archiveSession = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, archived: !s.archived } : s))
    );
  }, []);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) || null, [sessions, activeSessionId]);
  const recentSessions = useMemo(() => sessions.filter((s) => !s.archived), [sessions]);
  const archivedSessions = useMemo(() => sessions.filter((s) => s.archived), [sessions]);

  return {
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
  };
}
