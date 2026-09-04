import React from 'react';
import { AuthLayout, RegisterForm } from '@/features/auth';

export default function RegisterScreen() {
  return (
    <AuthLayout
      title="Criar sua conta"
      subtitle="Cadastre sua conta de gestão para começar."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
