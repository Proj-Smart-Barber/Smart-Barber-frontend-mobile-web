import React from 'react';
import { AuthLayout, ForgotPasswordForm } from '@/features/auth';

export default function ForgotPasswordScreen() {
  return (
    <AuthLayout
      title="Recuperar Senha"
      subtitle="Informe o e-mail da sua conta para receber as instruções de recuperação"
      badgeText="SEGURANÇA"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
