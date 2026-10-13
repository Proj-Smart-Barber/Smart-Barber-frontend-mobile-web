import {it, expect, vi} from 'vitest';
const storage = vi.hoisted(() => ({getAllKeys:vi.fn(),getItem:vi.fn(),setItem:vi.fn(),removeItem:vi.fn(),multiRemove:vi.fn()}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:storage}));
import {NativeOperationAttemptStore} from '../operation-attempt-store.native';
it('failed cleanup preserves the uncertain reference and propagates the storage error',async()=>{
 const record={actorId:'actor',requestId:'request',operation:'CREATE_BOOKING',resourceKind:'BOOKING',status:'uncertain',createdAt:Date.now(),payload:{serviceIds:['service']}};
 storage.getAllKeys.mockResolvedValue(['sb_ops_actor_request']);storage.getItem.mockResolvedValue(JSON.stringify(record));
 storage.setItem.mockRejectedValue(new Error('Storage unavailable'));
 await expect(new NativeOperationAttemptStore().clearPayloadsOnLogout('actor')).rejects.toThrow('Storage unavailable');
 expect(storage.removeItem).not.toHaveBeenCalled();expect(storage.multiRemove).not.toHaveBeenCalled();
});
