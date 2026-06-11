import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Moon, Sun, Loader2 } from 'lucide-react';
import type { Farm } from '../types';
import type { FormEvent } from 'react';

const THEME_KEY = 'cattlegen-theme';

function getSavedTheme(): boolean {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_KEY) : null;
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return true;
}

export default function Config() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [nome, setNome] = useState('');
  const [isDark, setIsDark] = useState(getSavedTheme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyTheme = useCallback((dark: boolean) => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark, applyTheme]);

  useEffect(() => {
    let cancelled = false;

    async function loadFarm() {
      const { data, error } = await supabase.from('farm').select('*').limit(1).single();
      if (cancelled) return;
      if (data && !error) {
        setFarm(data);
        setNome(data.nome);
      }
      setLoading(false);
    }

    loadFarm();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!farm) return;
    setSaving(true);
    const { error } = await supabase.from('farm').update({ nome }).eq('id', farm.id);
    if (!error) {
      setFarm((prev: Farm | null) => (prev ? { ...prev, nome } : prev));
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold text-gray-100">Configurações</h1>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-100">Fazenda</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="farm-name" className="mb-1 block text-sm font-medium text-neutral-300">
              Nome da fazenda
            </label>
            <input
              id="farm-name"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-gray-100 placeholder-neutral-500 outline-none ring-emerald-500 focus:border-emerald-500 focus:ring-1"
              placeholder="Ex: Fazenda Santa Clara"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            {saving && (
              <span className="inline-flex items-center text-sm text-neutral-400">
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Salvando...
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-100">Aparência</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-100">Tema</p>
            <p className="text-sm text-neutral-400">{isDark ? 'Escuro' : 'Claro'}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            className="relative inline-flex h-7 w-12 items-center rounded-full border border-neutral-700 bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
            aria-pressed={isDark}
          >
            <span
              className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-neutral-200 transition ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            >
              {isDark ? (
                <Moon className="h-3 w-3 text-neutral-900" />
              ) : (
                <Sun className="h-3 w-3 text-amber-600" />
              )}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
