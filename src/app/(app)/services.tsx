import React from 'react';
import { View } from 'react-native';
import { useSession } from '@/features/auth';
import { ServicesManagementView } from '@/features/services';
import { EmptyState, Button } from '@/shared/ui';
import { useRouter } from 'expo-router';

export default function ServicesPage() {
  const { barbershop } = useSession();
  const router = useRouter();

  if (!barbershop) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <EmptyState
          title="Nenhuma barbearia vinculada"
          description="Você precisa cadastrar ou vincular uma barbearia antes de gerenciar o catálogo de serviços."
          actionLabel="Configurar Barbearia"
          onAction={() => router.push('/(app)/barbershop-setup' as any)}
        />
      </View>
    );
  }

  return <ServicesManagementView barbershopId={barbershop.id} />;
}
