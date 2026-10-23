import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';

export interface StarRatingProps {
  rating: number; // 1 a 5
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (newRating: number) => void;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const { colors } = useTheme();
  const activeColor = '#F59E0B'; // Gold / Âmbar
  const inactiveColor = colors.border.subtle;

  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    const isFilled = i <= rating;
    const starIcon = (
      <Ionicons
        name={isFilled ? 'star' : 'star-outline'}
        size={size}
        color={isFilled ? activeColor : inactiveColor}
      />
    );

    if (interactive) {
      stars.push(
        <TouchableOpacity
          key={i}
          activeOpacity={0.7}
          onPress={() => onRatingChange?.(i)}
          style={styles.starTouch}
          accessibilityRole="button"
          accessibilityLabel={`Classificar com ${i} de ${maxStars} estrelas`}
        >
          {starIcon}
        </TouchableOpacity>,
      );
    } else {
      stars.push(
        <View key={i} style={styles.starView}>
          {starIcon}
        </View>,
      );
    }
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Nota ${rating} de ${maxStars} estrelas`}
    >
      {stars}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starTouch: {
    padding: 2,
  },
  starView: {
    padding: 1,
  },
});
