import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AuthLayout, RegisterForm } from '@/features/auth';

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ intent?: string }>();
  const isOwner = typeof params.intent === 'string' && params.intent.toLowerCase() === 'owner';

  return (
    <AuthLayout
      title={isOwner ? 'Criar conta de barbearia' : 'Criar conta de cliente'}
      subtitle={
        isOwner
          ? 'Cadastre sua conta de gestão para começar.'
          : 'Cadastre-se para agendar seus serviços.'
      }
    >
      <RegisterForm defaultIntent={isOwner ? 'OWNER' : 'CLIENT'} />
    </AuthLayout>
  );
}
