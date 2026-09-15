import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/Segmented';
import { Button, Card, Text } from '@/components/ui';
import { t } from '@/i18n';
import { gpa, totalCredits } from '@/logic/gpa';
import { useCalcStore } from '@/store/useCalcStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';

export function GpaPanel() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const courses = useCalcStore((s) => s.courses);
  const scale = useCalcStore((s) => s.scale);
  const setScale = useCalcStore((s) => s.setScale);
  const activeSemester = useCalcStore((s) => s.activeSemester);
  const setActiveSemester = useCalcStore((s) => s.setActiveSemester);
  const removeCourse = useCalcStore((s) => s.removeCourse);
  const semesters = useCalcStore((s) => s.semesters)();
  const isPremium = usePremiumStore((s) => s.isPremium);

  const filter = activeSemester ?? undefined;
  const average = useMemo(() => gpa(courses, filter), [courses, filter]);
  const credits = useMemo(() => totalCredits(courses, filter), [courses, filter]);
  const visible = filter ? courses.filter((c) => c.semester === filter) : courses;

  const confirmRemove = (id: string, name: string) => {
    Alert.alert(t('deleteCourse'), name, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('deleteCourse'), style: 'destructive', onPress: () => removeCourse(id) },
    ]);
  };

  return (
    <View style={{ gap: spacing.base }}>
      <Segmented
        accessibilityLabel={t('gradeScale')}
        options={[
          { value: 'letter' as const, label: t('scaleLetter') },
          { value: 'percent' as const, label: t('scalePercent') },
        ]}
        value={scale}
        onChange={setScale}
      />

      {semesters.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {[null, ...semesters].map((semester) => {
            const selected = activeSemester === semester;
            const label = semester ?? t('allSemesters');
            return (
              <Pressable
                key={label}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                onPress={() => setActiveSemester(semester)}
                android_ripple={{ color: withAlpha(colors.accent, 0.14) }}
                style={{
                  minHeight: MIN_TOUCH_TARGET - 8,
                  justifyContent: 'center',
                  paddingHorizontal: spacing.base,
                  borderRadius: radius.full,
                  backgroundColor: selected ? colors.accent : colors.surfaceAlt,
                }}
              >
                <Text variant="caption" color={selected ? colors.onAccent : colors.text}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Card>
        <Text variant="micro" tone="faint">
          {t('yourGpa').toUpperCase()}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.xs }}>
          {average === null ? '—' : average.toFixed(2)}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          {t('totalCreditsLabel', { count: credits })}
        </Text>
      </Card>

      <View style={[styles.row, { gap: spacing.sm }]}>
        {/*
          The semester cap is enforced in the course form, not here: a free user must always be
          able to add another course to the one semester they already have, and only a course
          that would create a SECOND semester is blocked.
        */}
        <Button label={t('addCourse')} icon="plus" variant="secondary" size="sm" onPress={() => router.push('/course')} />
        <Button
          label={t('projectorTitle')}
          icon={isPremium ? 'trending-up' : 'lock'}
          variant="ghost"
          size="sm"
          onPress={() => router.push(isPremium ? '/projector' : '/paywall')}
        />
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {visible.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('noCourses')}
          </Text>
        ) : (
          visible.map((course) => (
            <Pressable
              key={course.id}
              accessibilityRole="button"
              accessibilityLabel={`${course.name}, ${course.grade}, ${t('creditsLabel')} ${course.credits}`}
              onPress={() => router.push({ pathname: '/course', params: { id: course.id } })}
              android_ripple={{ color: withAlpha(colors.accent, 0.14) }}
              style={[
                styles.courseRow,
                {
                  minHeight: MIN_TOUCH_TARGET,
                  paddingHorizontal: spacing.base,
                  gap: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.grow}>
                <Text variant="callout" numberOfLines={1}>
                  {course.name}
                </Text>
                <Text variant="micro" tone="faint">
                  {course.semester}
                </Text>
              </View>
              <Text variant="caption" tone="muted">
                {course.credits}
              </Text>
              <Text variant="bodyStrong" style={styles.grade}>
                {course.grade}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('deleteCourse')}
                onPress={() => confirmRemove(course.id, course.name)}
                hitSlop={10}
                style={styles.iconSlot}
              >
                <Feather name="x" size={16} color={colors.textFaint} />
              </Pressable>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  courseRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  grade: { minWidth: 36, textAlign: 'right' },
  iconSlot: { width: 32, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
});
