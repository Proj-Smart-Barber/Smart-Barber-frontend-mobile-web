import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ExploreFeedView } from '@/features/discovery';

/**
 * Tela Explorar do Cliente
 * Experiência com feed vertical imersivo (Reels), ranking de proximidade/reputação,
 * carrossel horizontal de fotos de ambiente e serviços, e navegação persistente.
 */
export default function ClientExploreScreen() {
  return (
    <View style={styles.screenContainer}>
      <ExploreFeedView initialRadius={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
