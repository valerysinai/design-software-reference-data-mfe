export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

// The host owns the session. This single mounted remote reads the current token
// for each request and never persists credentials or derives authorization itself.
let tokenProvider: (() => string | null) | undefined;
export function setReferenceDataTokenProvider(provider?: () => string | null): () => void {
  tokenProvider = provider;
  return () => { if (tokenProvider === provider) tokenProvider = undefined; };
}

export class ReferenceDataHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ReferenceDataHttpError';
  }
}

export class MissingReferenceDataConfigurationError extends Error {
  constructor() {
    super('Falta configurar VITE_REFERENCE_DATA_API_BASE_URL.');
    this.name = 'MissingReferenceDataConfigurationError';
  }
}

const baseUrlWithSlash = (baseUrl: string): string =>
  baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export const buildReferenceDataUrl = (baseUrl: string, path: string): URL => {
  const normalizedBaseUrl = baseUrl.trim();
  if (!normalizedBaseUrl) throw new MissingReferenceDataConfigurationError();
  return new URL(path.replace(/^\//, ''), baseUrlWithSlash(normalizedBaseUrl));
};

export async function requestReferenceData<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = buildReferenceDataUrl(baseUrl, path);
  let response: Response;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = tokenProvider?.();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error(
      'No fue posible conectar con Reference Data. Verifica la conexión e intenta nuevamente.',
      { cause: error },
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ReferenceDataHttpError(
      body?.error?.message ?? `La solicitud falló (HTTP ${response.status}).`,
      response.status,
      body?.error?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const jsonBody = (body: unknown): string => JSON.stringify(body);
