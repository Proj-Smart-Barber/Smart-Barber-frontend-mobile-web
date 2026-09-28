import { Stack } from 'expo-router';

export default function PublicLayoutGroup() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="barbershops/[shopId]/services" />
    </Stack>
  );
}
