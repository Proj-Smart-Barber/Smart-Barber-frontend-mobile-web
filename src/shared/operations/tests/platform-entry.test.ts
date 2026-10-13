import {it,expect,vi} from 'vitest';
import {operationAttemptStore,createOperationAttemptStore,WebOperationAttemptStore} from '../operation-attempt-store.web';
it('web platform entry exposes the runtime store selected by Metro',()=>{
 expect(operationAttemptStore.save).toBeTypeOf('function');
 expect(createOperationAttemptStore().read).toBeTypeOf('function');
});
it('web cleanup preserves an uncertain reference if writing its opaque form fails',async()=>{
 const storage={length:1,key:()=> 'sb_ops_actor_request',getItem:()=>JSON.stringify({actorId:'actor',requestId:'request',status:'uncertain',createdAt:Date.now(),payload:{serviceIds:['service']}}),setItem:vi.fn(()=>{throw new Error('Storage unavailable')}),removeItem:vi.fn()};
 vi.stubGlobal('window',{localStorage:storage});
 try { await expect(new WebOperationAttemptStore().clearPayloadsOnLogout('actor')).rejects.toThrow('Storage unavailable'); expect(storage.removeItem).not.toHaveBeenCalled(); }
 finally { vi.unstubAllGlobals(); }
});
