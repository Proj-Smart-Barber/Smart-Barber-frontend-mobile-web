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
  const isOverMedia = active === 'feed';

  return (
    <View style={[styles.outerContainer, style]}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Seções de descoberta"
        style={styles.tablist}
      >
        {EXPLORE_TAB_ITEMS.map((item) => {
          const isSelected = active === item.id;
          const inactiveTextColor =
            isOverMedia || isDark
              ? 'rgba(255, 255, 255, 0.92)'
              : colors.text.primary;

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
                  backgroundColor: pressed
                    ? isOverMedia || isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.06)'
                    : 'transparent',
                  borderColor: 'transparent',
                  ...(Platform.OS === 'web'
                    ? ({
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: reducedMotion
                          ? 'none'
                          : 'background-color 150ms ease, opacity 150ms ease',
                      } as any)
                    : {}),
                },
              ]}
            >
              <View style={styles.tabContent}>
                <Text
                  variant="caption"
                  weight={isSelected ? 'bold' : 'semibold'}
                  align="center"
                  color={isSelected ? '#FFFFFF' : inactiveTextColor}
                  style={[
                    styles.tabLabel,
                    isOverMedia ? styles.overMediaTextShadow : null,
                  ]}
                >
                  {item.label}
                </Text>
                <View
                  style={[
                    styles.underline,
                    {
                      backgroundColor: isSelected
                        ? colors.brand.primary
                        : 'transparent',
                    },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  tablist: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  underline: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    marginTop: 4,
  },
  tabLabel: {
    lineHeight: 16,
  },
  overMediaTextShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
