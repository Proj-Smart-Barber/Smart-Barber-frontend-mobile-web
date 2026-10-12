import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserInvitations,
  getInvitation,
  acceptById,
  declineById,
} from '../api/invitations.api';
import {
  InvitationResponseEngine,
  isInvitationExpired,
  type ResponseStatus,
  type ResponseAction,
} from './invitation-response-engine';
import type { InvitationDto } from '../api/invitations.dto';

import { useSession } from '@/features/auth';

export { isInvitationExpired };

export function useUserInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: fetchUserInvitations,
  });
}

export function useInvitationDetail(invitationId: string) {
  return useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: () => getInvitation(invitationId),
    enabled: Boolean(invitationId),
  });
}

export function useInvitationResponse(invitationId: string) {
  const queryClient = useQueryClient();
  const { refreshIdentity } = useSession();
  const [engineState, setEngineState] = useState(() => ({
    invitationId,
    status: 'idle' as ResponseStatus,
    lastAction: null as ResponseAction | null,
    errorMessage: null as string | null,
    refetchFailed: false,
  }));

  const engine = useMemo(() => {
    return new InvitationResponseEngine(
      invitationId,
      {
        getInvitation,
        acceptById,
        declineById,
      },
      async () => {
        // Atualização autoritativa explícita de identidade + invalidações contextuais
        await refreshIdentity();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['invitations'] }),
          queryClient.invalidateQueries({ queryKey: ['invitation', invitationId] }),
          queryClient.invalidateQueries({ queryKey: ['notifications'] }),
          queryClient.invalidateQueries({ queryKey: ['user-me'] }),
          queryClient.invalidateQueries({ queryKey: ['user-barbershops'] }),
        ]);
      }
    );
  }, [invitationId, queryClient, refreshIdentity]);

  const accept = useCallback(async () => {
    try {
      setEngineState(engine.getState());
      const res = await engine.accept();
      setEngineState(engine.getState());
      return res;
    } catch (err) {
      setEngineState(engine.getState());
      throw err;
    }
  }, [engine]);

  const decline = useCallback(async () => {
    try {
      setEngineState(engine.getState());
      const res = await engine.decline();
      setEngineState(engine.getState());
      return res;
    } catch (err) {
      setEngineState(engine.getState());
      throw err;
    }
  }, [engine]);

  const checkStatus = useCallback(async (): Promise<InvitationDto> => {
    try {
      const res = await engine.checkStatus();
      setEngineState(engine.getState());
      return res;
    } catch (err) {
      setEngineState(engine.getState());
      throw err;
    }
  }, [engine]);

  return {
    invitationId,
    status: engineState.status,
    lastAction: engineState.lastAction,
    errorMessage: engineState.errorMessage,
    refetchFailed: engineState.refetchFailed,
    isSubmitting: engineState.status === 'sending',
    isAccepted: engineState.status === 'committed' && engineState.lastAction === 'ACCEPT',
    isDeclined: engineState.status === 'committed' && engineState.lastAction === 'DECLINE',
    accept,
    decline,
    checkStatus,
  };
}
