import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HttpClient } from '../http-client';

beforeEach(() => {vi.useFakeTimers();});
afterEach(() => {vi.unstubAllGlobals();vi.useRealTimers();});
const client = new HttpClient('http://127.0.0.1:9',100);
function blockedFetch() {
  vi.stubGlobal('fetch',vi.fn((_url, options:RequestInit) => new Promise<Response>((_resolve,reject) => {
    const signal = options.signal;
    const abort = () => reject(new DOMException('Aborted','AbortError'));
    if (signal?.aborted) abort(); else signal?.addEventListener('abort',abort,{once:true});
  })));
}

it('preserves the HTTP timeout when availability supplies its own cancellation signal', async () => {
  blockedFetch();
  const caller = new AbortController();
  const pending = client.get('/availability',{token:null,signal:caller.signal});
  const assertion = expect(pending).rejects.toMatchObject({status:0,isNetworkError:true});
  await vi.advanceTimersByTimeAsync(101);
  await assertion;
  expect(caller.signal.aborted).toBe(false);
});

it('cancels immediately on caller abort and accepts an already aborted caller', async () => {
  blockedFetch();
  const caller = new AbortController();
  const pending = client.get('/availability',{token:null,signal:caller.signal});
  const assertion = expect(pending).rejects.toMatchObject({status:0});
  caller.abort(); await assertion;
  await expect(client.get('/availability',{token:null,signal:caller.signal})).rejects.toMatchObject({status:0});
});

it('removes the caller listener after a successful response', async () => {
  let combined: AbortSignal | null | undefined;
  vi.stubGlobal('fetch',vi.fn(async (_url,options:RequestInit) => {
    combined=options.signal;
    return new Response(JSON.stringify({slots:[]}),{headers:{'Content-Type':'application/json'}});
  }));
  const caller=new AbortController();
  await client.get('/availability',{token:null,signal:caller.signal});
  caller.abort();
  expect(combined?.aborted).toBe(false);
});
