import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { Text } from '@/shared/ui';

interface ProfessionalFilterSelectorProps {
  professionals: Array<{ id: string; name: string }>;
  selectedProfessionalId: string | null;
  onSelectProfessional: (id: string | null) => void;
}

export function ProfessionalFilterSelector({
  professionals,
  selectedProfessionalId,
  onSelectProfessional,
}: ProfessionalFilterSelectorProps) {
  const { colors, spacing, radius } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');

  const selectedProfessional = professionals.find((item) => item.id === selectedProfessionalId);
  const filteredProfessionals = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return professionals;
    return professionals.filter((item) => item.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [professionals, query]);

  const chooseProfessional = (id: string | null) => {
    onSelectProfessional(id);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <View style={{ width: '100%', zIndex: isOpen ? 5 : 0, elevation: isOpen ? 5 : 0 }}>
      <LiquidGlassView
        variant="navigation"
        autoHeight
        borderRadius={radius.md}
        borderColor={isOpen || isFocused ? colors.border.focus : undefined}
        borderWidth={isOpen || isFocused ? 2 : 1}
        elevated={false}
        style={{ width: '100%' }}
        contentStyle={{ width: '100%', padding: 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filtrar agenda por profissional. Selecionado: ${selectedProfessional?.name ?? 'Todos os profissionais'}`}
          accessibilityHint={isOpen ? 'Fecha a lista de profissionais' : 'Abre as opções para selecionar um profissional'}
          accessibilityState={{ expanded: isOpen }}
          onPress={() => setIsOpen((current) => !current)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={({ pressed }) => ({
            minHeight: 44,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingHorizontal: spacing[3],
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.surface.selected : 'transparent',
          })}
        >
          <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ionicons name="person-outline" size={17} color={colors.text.secondary} />
          </View>
          <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 18 }}>
            Profissional
          </Text>
          <Text
            variant="subhead"
            weight="semibold"
            color={colors.text.primary}
            numberOfLines={1}
            style={{ flex: 1, lineHeight: 18 }}
          >
            {selectedProfessional?.name ?? 'Todos'}
          </Text>
          <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.secondary} />
          </View>
        </Pressable>
      </LiquidGlassView>

      {isOpen ? (
        <LiquidGlassView
          variant="navigation"
          autoHeight
          borderRadius={radius.md}
          elevated
          style={{ marginTop: spacing[2], width: '100%' }}
          contentStyle={{ padding: spacing[2], gap: spacing[2] }}
        >
          <View style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingHorizontal: spacing[3],
            borderRadius: radius.sm,
            backgroundColor: colors.surface.input,
          }}>
            <Ionicons name="search-outline" size={18} color={colors.text.muted} />
            <TextInput
              accessibilityLabel="Buscar profissional"
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar profissional"
              placeholderTextColor={colors.text.muted}
              autoCorrect={false}
              returnKeyType="search"
              style={{ flex: 1, minHeight: 42, color: colors.text.primary, fontSize: 14, outlineStyle: 'none' } as any}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpar busca de profissional"
                onPress={() => setQuery('')}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.text.muted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 264 }}
            contentContainerStyle={{ gap: spacing[1] }}
          >
            {query.trim() === '' || 'todos os profissionais'.includes(query.trim().toLocaleLowerCase()) ? (
              <ProfessionalOption
                label="Todos os profissionais"
                selected={selectedProfessionalId === null}
                onPress={() => chooseProfessional(null)}
              />
            ) : null}
            {filteredProfessionals.map((professional) => (
              <ProfessionalOption
                key={professional.id}
                label={professional.name}
                selected={selectedProfessionalId === professional.id}
                onPress={() => chooseProfessional(professional.id)}
              />
            ))}
            {filteredProfessionals.length === 0 && query.trim() !== '' && !'todos os profissionais'.includes(query.trim().toLocaleLowerCase()) ? (
              <Text variant="caption" color={colors.text.muted} style={{ padding: spacing[3], textAlign: 'center' }}>
                Nenhum profissional encontrado.
              </Text>
            ) : null}
          </ScrollView>
        </LiquidGlassView>
      ) : null}
    </View>
  );
}

function ProfessionalOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        borderRadius: radius.sm,
        backgroundColor: selected ? colors.surface.selected : pressed ? colors.surface.selected : 'transparent',
      })}
    >
      <Text variant="bodySm" weight={selected ? 'semibold' : 'regular'} color={selected ? colors.text.brand : colors.text.primary} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={18} color={colors.brand.primary} /> : null}
    </Pressable>
  );
}
