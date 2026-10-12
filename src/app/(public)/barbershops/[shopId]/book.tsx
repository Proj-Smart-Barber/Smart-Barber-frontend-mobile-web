import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BookingFlowView } from '@/features/bookings/ui/BookingFlowView';
import { EmptyState } from '@/shared/ui';

export default function PublicBarbershopBookPage() {
  const params = useLocalSearchParams<{
    shopId: string;
    serviceIds?: string;
    date?: string;
    professionalId?: string;
  }>();

  const shopId =
    typeof params.shopId === 'string'
      ? params.shopId
      : Array.isArray(params.shopId)
      ? params.shopId[0]
      : '';

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

  const rawServices = params.serviceIds
    ? typeof params.serviceIds === 'string'
      ? params.serviceIds.split(',').filter(Boolean)
      : Array.isArray(params.serviceIds)
      ? params.serviceIds
      : []
    : [];

  return (
    <BookingFlowView
      options={{
        mode: 'PERSONAL',
        shopId,
        initialServiceIds: rawServices,
        initialDate: typeof params.date === 'string' ? params.date : undefined,
        initialProfessionalId:
          typeof params.professionalId === 'string' ? params.professionalId : undefined,
      }}
    />
  );
}
