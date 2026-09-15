import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Announced as the group's purpose, e.g. "Unit system". */
  accessibilityLabel: string;
}

/**
 * A segmented control.
 *
 * Used for the two calculators and for the unit and grade-scale switches, so all three read the
 * same way. `accessibilityRole="tab"` with an explicit selected state, because an unlabelled
 * pressed-vs-unpressed pill is invisible to a screen reader.
 */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.row,
        { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            android_ripple={{ color: withAlpha(colors.accent, 0.14) }}
            style={({ pressed }) => [
              styles.segment,
              {
                minHeight: MIN_TOUCH_TARGET - 8,
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.surface : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              variant="callout"
              color={selected ? colors.text : colors.textMuted}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
