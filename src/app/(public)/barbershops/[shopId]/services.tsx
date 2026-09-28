import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PublicCatalogView } from '@/features/services';
import { EmptyState } from '@/shared/ui';

export default function PublicBarbershopServicesPage() {
  const params = useLocalSearchParams<{ shopId: string }>();
  const shopId = typeof params.shopId === 'string' ? params.shopId : Array.isArray(params.shopId) ? params.shopId[0] : '';

  if (!shopId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <EmptyState
          title="Barbearia não especificada"
          description="O link acessado é inválido ou a barbearia não foi identificada."
        />
      </View>
    );
  }

  return <PublicCatalogView barbershopId={shopId} />;
}
