import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, useReducedMotion } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

export type ClientExploreSection = 'feed' | 'nearby' | 'bookings';

export interface ClientExploreTabsProps {
  active: ClientExploreSection;
  onSelect: (section: ClientExploreSection) => void;
  style?: StyleProp<ViewStyle>;
}

const EXPLORE_TAB_ITEMS: ReadonlyArray<{
  id: ClientExploreSection;
  label: string;
}> = [
  { id: 'feed', label: 'Explorar' },
  { id: 'nearby', label: 'Perto de você' },
  { id: 'bookings', label: 'Meus agendamentos' },
];

export function resolveClientExploreSection(
  rawSection?: string | string[] | null,
): 'feed' | 'nearby' {
  const value = Array.isArray(rawSection) ? rawSection[0] : rawSection;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'nearby') {
    return 'nearby';
  }
  return 'feed';
}

export function ClientExploreTabs({
  active,
  onSelect,
  style,
}: ClientExploreTabsProps) {
  const { colors, radius, isDark } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <LiquidGlassView
      variant="navigation"
      autoHeight
      borderRadius={radius.lg}
      style={[styles.outerContainer, style]}
      contentStyle={styles.innerContent}
    >
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Seções de descoberta"
        style={styles.tablist}
      >
        {EXPLORE_TAB_ITEMS.map((item) => {
          const isSelected = active === item.id;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isSelected }}
              aria-selected={isSelected}
              onPress={() => {
                if (!isSelected) {
                  onSelect(item.id);
                }
              }}
              style={({ pressed }) => [
                styles.tabButton,
                {
                  borderRadius: radius.md,
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : pressed
                      ? isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)'
                      : 'transparent',
                  borderColor: isSelected
                    ? colors.brand.primary
                    : 'transparent',
                  ...(Platform.OS === 'web'
                    ? ({
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: reducedMotion
                          ? 'none'
                          : 'background-color 150ms ease',
                      } as any)
                    : {}),
                },
              ]}
            >
              <Text
                variant="caption"
                weight={isSelected ? 'bold' : 'medium'}
                align="center"
                color={isSelected ? '#FFFFFF' : colors.text.primary}
                style={styles.tabLabel}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  innerContent: {
    padding: 4,
  },
  tablist: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabLabel: {
    lineHeight: 16,
  },
});
