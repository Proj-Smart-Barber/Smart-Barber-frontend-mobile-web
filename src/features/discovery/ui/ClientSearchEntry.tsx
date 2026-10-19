import React from 'react';
import { View, TextInput as RNTextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

export interface ClientSearchEntryProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  onPressPlaceholder?: () => void;
  isReadOnlyButton?: boolean;
  placeholder?: string;
}

export function ClientSearchEntry({
  value,
  onChangeText,
  onSubmitEditing,
  onPressPlaceholder,
  isReadOnlyButton = false,
  placeholder = 'Buscar barbearia ou endereço...',
}: ClientSearchEntryProps) {
  const { colors, radius } = useTheme();

  if (isReadOnlyButton) {
    return (
      <LiquidGlassView
        variant="card"
        borderRadius={radius.lg}
        style={styles.outerWrapper}
        contentStyle={styles.contentContainer}
      >
        <Pressable
          onPress={onPressPlaceholder}
          accessibilityRole="button"
          accessibilityLabel="Abrir busca de barbearias"
          style={styles.pressableContainer}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.text.secondary}
            style={styles.searchIcon}
          />
          <Text
            variant="bodySm"
            color={colors.text.secondary}
            numberOfLines={1}
            style={styles.placeholderText}
          >
            {value || placeholder}
          </Text>
          <View
            style={[
              styles.actionChip,
              {
                backgroundColor: colors.surface.input,
                borderColor: colors.border.subtle,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Ionicons name="options-outline" size={16} color={colors.brand.primary} />
          </View>
        </Pressable>
      </LiquidGlassView>
    );
  }

  return (
    <LiquidGlassView
      variant="card"
      borderRadius={radius.lg}
      style={styles.outerWrapper}
      contentStyle={styles.contentContainer}
    >
      <View style={styles.inputRow}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.text.secondary}
          style={styles.searchIcon}
        />
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          returnKeyType="search"
          accessibilityLabel="Buscar barbearias"
          style={[
            styles.nativeInput,
            {
              color: colors.text.primary,
            },
          ]}
        />
        {value && value.length > 0 && onChangeText && (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            hitSlop={8}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    marginVertical: 8,
    minHeight: 50,
  },
  contentContainer: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  pressableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 30,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 30,
  },
  searchIcon: {
    marginRight: 10,
  },
  placeholderText: {
    flex: 1,
  },
  actionChip: {
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  nativeInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 28,
    padding: 0,
    margin: 0,
    outlineStyle: 'none' as any,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

