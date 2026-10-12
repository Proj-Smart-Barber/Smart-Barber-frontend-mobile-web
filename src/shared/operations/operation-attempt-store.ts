import { Platform } from 'react-native';
import type { OperationAttemptStore } from './operation-attempt.types';
import { WebOperationAttemptStore } from './operation-attempt-store.web';
import { NativeOperationAttemptStore } from './operation-attempt-store.native';

export function createOperationAttemptStore(): OperationAttemptStore {
  if (Platform.OS === 'web') {
    return new WebOperationAttemptStore();
  }
  return new NativeOperationAttemptStore();
}

export const operationAttemptStore: OperationAttemptStore = createOperationAttemptStore();
export * from './operation-attempt.types';
