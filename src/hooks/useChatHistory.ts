import { useState, useEffect, useCallback } from 'react';
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

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

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const recentSessions = sessions.filter((s) => !s.archived);
  const archivedSessions = sessions.filter((s) => s.archived);

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
