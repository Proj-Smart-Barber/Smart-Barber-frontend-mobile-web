import React from 'react';
import { AuthLayout, LoginForm } from '@/features/auth';

export default function LoginScreen() {
  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre com seus dados para continuar."
    >
      <LoginForm />
    </AuthLayout>
  );
}
