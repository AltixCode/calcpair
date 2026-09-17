import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { Button, Text } from '@/components/ui';
import { t } from '@/i18n';
import { LETTER_GRADES } from '@/logic/gpa';
import { FREE_SEMESTERS, isUnlocked } from '@/logic/limits';
import { useCalcStore } from '@/store/useCalcStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';
import { useTabletColumn } from '../src/theme/useTabletColumn';

/** The default semester name when the user has not created one yet. */
const FIRST_SEMESTER = '1';

export default function CourseForm() {
  const router = useRouter();

  const tabletColumn = useTabletColumn();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();

  const courses = useCalcStore((s) => s.courses);
  const scale = useCalcStore((s) => s.scale);
  const addCourse = useCalcStore((s) => s.addCourse);
  const updateCourse = useCalcStore((s) => s.updateCourse);
  const semesters = useCalcStore((s) => s.semesters)();
  const isPremium = usePremiumStore((s) => s.isPremium);

  const existing = courses.find((c) => c.id === params.id);

  const [name, setName] = useState(existing?.name ?? '');
  const [credits, setCredits] = useState(existing ? String(existing.credits) : '');
  const [grade, setGrade] = useState(existing?.grade ?? (scale === 'letter' ? 'A' : ''));
  const [semester, setSemester] = useState(existing?.semester ?? semesters[0] ?? FIRST_SEMESTER);

  const creditValue = Number(credits.trim().replace(',', '.'));
  const canSave = name.trim() !== '' && Number.isFinite(creditValue) && creditValue > 0 && grade.trim() !== '';

  const save = () => {
    if (!canSave) return;
    const trimmed = semester.trim() || FIRST_SEMESTER;
    const isNewSemester = !semesters.includes(trimmed);

    // Only a course that would create a SECOND semester is capped. A free user can always keep
    // adding to the semester they already have, which is the whole calculator working.
    if (isNewSemester && !isUnlocked('semesters', isPremium, semesters.length)) {
      Alert.alert(t('semesterLimitTitle'), t('semesterLimitBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('removeAdsCta'), onPress: () => router.replace('/paywall') },
      ]);
      return;
    }

    if (existing) updateCourse(existing.id, { name: name.trim(), credits: creditValue, grade: grade.trim(), semester: trimmed });
    else addCourse({ name: name.trim(), credits: creditValue, grade: grade.trim(), semester: trimmed });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.header, { padding: spacing.base, gap: spacing.md }]}>
        <Text variant="heading" style={styles.grow}>
          {existing ? t('courseName') : t('addCourse')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.iconSlot}
        >
          <Feather name="x" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.base,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.base,
         ...tabletColumn }}
      >
        <Field label={t('courseName')} value={name} onChangeText={setName} keyboardType="default" autoFocus />

        <View style={[styles.row, { gap: spacing.md }]}>
          <Field label={t('creditsLabel')} value={credits} onChangeText={setCredits} />
          <Field label={t('semesterLabel')} value={semester} onChangeText={setSemester} keyboardType="default" />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="micro" tone="faint">
            {t('gradeLabel').toUpperCase()}
          </Text>
          {scale === 'letter' ? (
            <View style={[styles.grades, { gap: spacing.sm }]}>
              {LETTER_GRADES.map((letter) => {
                const selected = grade === letter;
                return (
                  <Pressable
                    key={letter}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={letter}
                    onPress={() => setGrade(letter)}
                    android_ripple={{ color: withAlpha(colors.accent, 0.14) }}
                    style={{
                      minWidth: MIN_TOUCH_TARGET,
                      minHeight: MIN_TOUCH_TARGET,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: selected ? colors.accent : colors.surfaceAlt,
                    }}
                  >
                    <Text variant="callout" color={selected ? colors.onAccent : colors.text}>
                      {letter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Field label={t('gradeLabel')} value={grade} onChangeText={setGrade} suffix="%" />
          )}
        </View>

        <Button label={t('addLabel')} fullWidth size="lg" disabled={!canSave} onPress={save} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  grades: { flexDirection: 'row', flexWrap: 'wrap' },
  grow: { flex: 1 },
  iconSlot: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
});
