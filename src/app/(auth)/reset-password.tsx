import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AuthLayout, ResetPasswordForm } from '@/features/auth';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <AuthLayout
      title="Redefinir Senha"
      subtitle="Crie uma nova senha segura para acessar a sua conta na barbearia"
      badgeText="NOVA CREDENCIAL"
    >
      <ResetPasswordForm initialToken={token} />
    </AuthLayout>
  );
}
