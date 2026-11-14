import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/features/auth';
import { OwnerProfilePreviewView } from '@/features/barbershop/ui/OwnerProfilePreviewView';
import { EmptyState } from '@/shared/ui';

export default function OwnerProfilePreviewPage() {
  const { barbershop } = useSession();
  const router = useRouter();

  if (!barbershop) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <EmptyState
          title="Nenhuma barbearia vinculada"
          description="Você precisa cadastrar ou vincular uma barbearia antes de visualizar a prévia do perfil público."
          actionLabel="Configurar Barbearia"
          onAction={() => router.push('/(app)/barbershop-setup' as any)}
        />
      </View>
    );
  }

  return <OwnerProfilePreviewView />;
}
