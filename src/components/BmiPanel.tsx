import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Field } from '@/components/Field';
import { Segmented } from '@/components/Segmented';
import { Button, Card, Text } from '@/components/ui';
import { getDeviceLanguage, t, type TranslationKey } from '@/i18n';
import {
  bandFor,
  bmi,
  feetInchesToCm,
  healthyWeightRangeKg,
  kgToPounds,
  poundsToKg,
  type BandId,
} from '@/logic/bmi';
import { hiddenCount, visibleHistory } from '@/logic/limits';
import { useCalcStore } from '@/store/useCalcStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

const BAND_KEY: Record<BandId, TranslationKey> = {
  underweight: 'bandUnderweight',
  normal: 'bandNormal',
  overweight: 'bandOverweight',
  obese: 'bandObese',
};

/** One decimal is all BMI supports; more digits imply a precision the input does not have. */
const show = (n: number) => n.toFixed(1);

const num = (text: string): number => {
  const normalized = text.trim().replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
};

export function BmiPanel() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const units = useCalcStore((s) => s.units);
  const setUnits = useCalcStore((s) => s.setUnits);
  const history = useCalcStore((s) => s.history);
  const addEntry = useCalcStore((s) => s.addEntry);
  const removeEntry = useCalcStore((s) => s.removeEntry);
  const isPremium = usePremiumStore((s) => s.isPremium);

  const [cm, setCm] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weight, setWeight] = useState('');
  const [saved, setSaved] = useState(false);

  const heightCm = units === 'metric' ? num(cm) : feetInchesToCm(num(feet) || 0, num(inches) || 0);
  const weightKg = units === 'metric' ? num(weight) : poundsToKg(num(weight));
  const value = bmi(weightKg, heightCm);
  const band = bandFor(value);
  const range = healthyWeightRangeKg(heightCm);

  // Not memoized: `range` is a fresh object every render, so a dependency array over it can
  // never hold, and the React Compiler rejects the manual memoization outright. The work is
  // two divisions and a format call; the compiler handles it.
  const formatWeight = (kg: number) =>
    units === 'metric' ? `${show(kg)} kg` : `${show(kgToPounds(kg))} lb`;
  const rangeText = range
    ? t('healthyRange', { min: formatWeight(range.min), max: formatWeight(range.max) })
    : null;

  const shown = visibleHistory(history, isPremium);
  const hidden = hiddenCount(history, isPremium);

  const dateFormat = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(getDeviceLanguage(), { dateStyle: 'medium' });
    } catch {
      return null;
    }
  }, []);

  // The confirmation clears itself from an effect rather than from a bare setTimeout in the
  // handler: an un-cleared timer fires after unmount and sets state on a gone component, which
  // Jest reports as an open handle and React as a warning.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [saved]);

  const save = () => {
    if (!Number.isFinite(value)) return;
    addEntry(heightCm, weightKg);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  };

  return (
    <View style={{ gap: spacing.base }}>
      <Segmented
        accessibilityLabel={t('unitSystem')}
        options={[
          { value: 'metric' as const, label: t('unitsMetric') },
          { value: 'imperial' as const, label: t('unitsImperial') },
        ]}
        value={units}
        onChange={setUnits}
      />

      <View style={[styles.row, { gap: spacing.md }]}>
        {units === 'metric' ? (
          <Field label={t('heightLabel')} value={cm} onChangeText={setCm} suffix="cm" placeholder={t('enterHeight')} />
        ) : (
          <>
            {/* Two labelled fields, never one with a blank label: imperial height is feet AND
                inches, and an unlabelled input announces nothing to a screen reader. */}
            <Field label={t('feetLabel')} value={feet} onChangeText={setFeet} suffix="ft" />
            <Field label={t('inchesLabel')} value={inches} onChangeText={setInches} suffix="in" />
          </>
        )}
      </View>

      <Field
        label={t('weightLabel')}
        value={weight}
        onChangeText={setWeight}
        suffix={units === 'metric' ? 'kg' : 'lb'}
        placeholder={t('enterWeight')}
      />

      <Card>
        <Text variant="micro" tone="faint">
          {t('yourBmi').toUpperCase()}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.xs }}>
          {Number.isFinite(value) ? show(value) : '—'}
        </Text>
        {band ? (
          <View
            style={[
              styles.badge,
              {
                marginTop: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.full,
                backgroundColor: colors.surfaceAlt,
              },
            ]}
          >
            <Text variant="caption">{t(BAND_KEY[band.id])}</Text>
          </View>
        ) : null}
        {rangeText ? (
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
            {rangeText}
          </Text>
        ) : null}
      </Card>

      <Button
        label={saved ? t('savedToast') : t('saveEntry')}
        icon={saved ? 'check' : 'plus'}
        variant="secondary"
        fullWidth
        disabled={!Number.isFinite(value)}
        onPress={save}
      />

      {/*
        The disclaimer sits next to the number, not in a settings page. BMI presented as a
        verdict is a health claim this app cannot stand behind, so the limits are said plainly
        wherever the number is shown.
      */}
      <Text variant="caption" tone="faint">
        {t('bmiDisclaimer')}
      </Text>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Text variant="micro" tone="faint">
          {t('historyTitle').toUpperCase()}
        </Text>

        {shown.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('noHistory')}
          </Text>
        ) : (
          shown.map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.historyRow,
                {
                  minHeight: MIN_TOUCH_TARGET,
                  paddingHorizontal: spacing.base,
                  gap: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text variant="bodyStrong" style={styles.entryValue}>
                {show(entry.value)}
              </Text>
              <Text variant="caption" tone="muted" style={styles.grow} numberOfLines={1}>
                {dateFormat ? dateFormat.format(new Date(entry.recordedAt)) : ''}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('deleteEntry')}
                onPress={() => removeEntry(entry.id)}
                hitSlop={10}
                style={styles.iconSlot}
              >
                <Feather name="x" size={16} color={colors.textFaint} />
              </Pressable>
            </View>
          ))
        )}

        {hidden > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hiddenEntries', { count: hidden })}
            onPress={() => router.push('/paywall')}
          >
            <Text variant="caption" tone="accent">
              {t('hiddenEntries', { count: hidden })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  badge: { alignSelf: 'flex-start' },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  entryValue: { minWidth: 56 },
  grow: { flex: 1 },
  iconSlot: { width: 32, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
});
