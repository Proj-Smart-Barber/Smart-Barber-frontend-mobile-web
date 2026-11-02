import {beforeEach,describe,expect,it,vi} from 'vitest';
import {httpClient} from '@/shared/api';
import {MediaApi} from '../api/media.api';
vi.mock('@/shared/api',()=>({httpClient:{post:vi.fn()}}));
describe('Multipart media uploads',()=>{
 beforeEach(()=>vi.clearAllMocks());
 it('retoma somente as partes que faltam e confirma ao final',async()=>{
  const api=new MediaApi();const file=new Blob([new Uint8Array(6*1024*1024)],{type:'video/mp4'});
  vi.mocked(httpClient.post).mockResolvedValueOnce({partSize:5*1024*1024,parts:[{part:1,size:5*1024*1024}],complete:false}).mockResolvedValueOnce({uploadUrl:'https://example.test/part'}).mockResolvedValueOnce({complete:true});
  const put=vi.spyOn(api,'uploadToPresignedUrl').mockResolvedValue();const progress=vi.fn();
  await api.uploadMultipart('fixture-media',file,'video/mp4',undefined,progress);
  expect(put).toHaveBeenCalledTimes(1);expect((put.mock.calls[0][1] as Blob).size).toBe(1024*1024);
  expect(httpClient.post).toHaveBeenLastCalledWith('/api/media/fixture-media/multipart/complete',{}, {signal:undefined});expect(progress).toHaveBeenLastCalledWith(1);
 });
 it('não reenvia arquivo de sessão já concluída',async()=>{
  const api=new MediaApi();vi.mocked(httpClient.post).mockResolvedValueOnce({complete:true});const put=vi.spyOn(api,'uploadToPresignedUrl').mockResolvedValue();
  await api.uploadMultipart('fixture-media',new Blob(['data']),'video/mp4');expect(put).not.toHaveBeenCalled();
 });
 it('cancelamento impede envio e conclusão de partes',async()=>{
  const api=new MediaApi();const abort=new AbortController();abort.abort();vi.mocked(httpClient.post).mockResolvedValueOnce({partSize:5*1024*1024,parts:[],complete:false});const put=vi.spyOn(api,'uploadToPresignedUrl').mockResolvedValue();
  await expect(api.uploadMultipart('fixture-media',new Blob(['data']),'video/mp4',abort.signal)).rejects.toThrow('Envio cancelado');expect(put).not.toHaveBeenCalled();
 });
});
