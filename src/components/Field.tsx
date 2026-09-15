import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shown to the right of the input: a unit symbol, never a translated word. */
  suffix?: string;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'default';
  autoFocus?: boolean;
}

/** One labelled input. The only text field shape in the app, so every form lines up. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  keyboardType = 'decimal-pad',
  autoFocus = false,
}: Props) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text variant="micro" tone="faint">
        {label.toUpperCase()}
      </Text>
      <View
        style={[
          styles.row,
          {
            minHeight: MIN_TOUCH_TARGET,
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceAlt,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          inputMode={keyboardType === 'default' ? 'text' : 'decimal'}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={label}
          autoFocus={autoFocus}
          selectTextOnFocus
          maxFontSizeMultiplier={1.4}
          style={[styles.input, { color: colors.text }]}
        />
        {suffix ? (
          <Text variant="callout" tone="muted">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 18, fontWeight: '600', padding: 0 },
});
