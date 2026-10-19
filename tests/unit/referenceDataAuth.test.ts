import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestReferenceData, setReferenceDataTokenProvider } from '../../src/adapter/out/http/referenceDataHttp.js';

afterEach(() => { setReferenceDataTokenProvider(); vi.unstubAllGlobals(); });
describe('host-owned IAM token', () => {
  it('reads the current host token on every request and stops sending it after logout', async () => {
    let token: string | null = 'first';
    const headers: Headers[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: URL, init: RequestInit) => {
      headers.push(new Headers(init.headers));
      return new Response('{}', { status: 200 });
    }));
    const unmount = setReferenceDataTokenProvider(() => token);
    await requestReferenceData('http://localhost/api/v1', 'parameters');
    token = 'second';
    await requestReferenceData('http://localhost/api/v1', 'parameters');
    token = null;
    await requestReferenceData('http://localhost/api/v1', 'parameters');
    unmount();
    expect(headers.map((h) => h.get('Authorization'))).toEqual(['Bearer first', 'Bearer second', null]);
  });
});
