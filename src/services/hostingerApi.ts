// Cliente para a API PHP hospedada na Hostinger (camada aditiva ao Supabase).
//
// Em produção o app e a API ficam no mesmo domínio, então a base padrão é o
// caminho relativo "/api". Em dev, defina VITE_API_BASE_URL apontando para a
// URL pública da API (ex.: https://seu-site.hostingersite.com/api).
//
// Esta camada NÃO substitui o Supabase: use-a apenas para funcionalidades
// novas que se apoiam no MySQL da Hostinger.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiHealth {
  status: string;
  db: string;
  mysql_version: string | null;
  server_time: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object' && 'error' in body) {
        detail = String((body as { error: unknown }).error);
      }
    } catch {
      // resposta sem corpo JSON
    }
    throw new Error(detail || `API respondeu ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

/** Valida que a API PHP está no ar e conectada ao MySQL. */
export function checkApiHealth(): Promise<ApiHealth> {
  return request<ApiHealth>('/health.php');
}
