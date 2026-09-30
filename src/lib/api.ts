const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');
const TOKEN_KEY = 'casahub.token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sem armazenamento: a sessão dura só enquanto a página estiver aberta.
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const hasBody = method !== 'GET' && method !== 'DELETE';
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: hasBody ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('casahub:logout'));
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Algo deu errado');
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
