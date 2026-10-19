/**
 * Tipos compartilhados do ledger e tentativas de operações recuperáveis.
 * Consumido pelas features de reservas, equipe, convites e recursos de conta.
 */

export type OperationResourceKind =
  | 'BOOKING'
  | 'MEMBERSHIP'
  | 'SCHEDULE'
  | 'LOCATION'
  | 'REGISTRATION'
  | 'INVITATION';

export type OperationAttemptState =
  | 'PENDING'
  | 'APPLIED'
  | 'NOT_APPLIED'
  | 'UNKNOWN';

export type SubmissionStatus =
  | 'reviewing'
  | 'submitting'
  | 'confirmed'
  | 'uncertain'
  | 'error';

export interface OperationAttemptResource<T = any> {
  kind?: OperationResourceKind | null;
  id?: string | null;
  version?: number | null;
  data?: T;
}

export interface OperationAttemptResult<T = any> {
  originScope?: 'PERSONAL' | 'UNIT';
  state: OperationAttemptState;
  operation?: string;
  resource?: OperationAttemptResource<T>;
  accessChanged?: boolean;
  serverTime?: string;
}

export interface OperationAttemptRecord<TPayload = any, TData = any> {
  actorId: string;
  requestId: string;
  operation: string;
  resourceKind: OperationResourceKind;
  resourceId?: string | null;
  status: SubmissionStatus;
  createdAt: number;
  originScope?: 'PERSONAL' | 'UNIT';
  payload?: TPayload;
  result?: OperationAttemptResult<TData>;
  errorMessage?: string | null;
}

export interface OperationReference {
  actorId: string;
  requestId: string;
  operation: string;
  resourceKind: OperationResourceKind;
  resourceId?: string | null;
  status: SubmissionStatus;
  createdAt: number;
  originScope?: 'PERSONAL' | 'UNIT';
}

export interface OperationAttemptStore {
  read(actorId: string, requestId: string): Promise<OperationAttemptRecord | null>;
  save(actorId: string, attempt: OperationAttemptRecord): Promise<void>;
  listReferences(actorId: string): Promise<OperationReference[]>;
  clearResolved(actorId: string): Promise<void>;
  clearPayloadsOnLogout(actorId: string): Promise<void>;
  clearAllForActor(actorId: string): Promise<void>;
}
