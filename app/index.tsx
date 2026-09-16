import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { BmiPanel } from '@/components/BmiPanel';
import { GpaPanel } from '@/components/GpaPanel';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/ui';
import { t } from '@/i18n';
import { shouldShowInterstitial } from '@/monetization/adPolicy';
import { shouldShowAds } from '@/monetization/entitlements';
import { showInterstitial } from '@/monetization/interstitial';
import { useCalcStore } from '@/store/useCalcStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

type Tab = 'bmi' | 'gpa';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();

  const hydrate = useCalcStore((s) => s.hydrate);
  const history = useCalcStore((s) => s.history);
  const courses = useCalcStore((s) => s.courses);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const isReady = usePremiumStore((s) => s.isReady);

  const [tab, setTab] = useState<Tab>('bmi');
  const lastInterstitialAt = useRef(0);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  /**
   * The interstitial runs when the user switches calculator — a natural break, after whatever
   * they were doing has finished and its result is already on screen. It never covers a result
   * and never sits between a form and its answer.
   *
   * "Completed calculations" is counted as saved BMI entries plus courses entered, because
   * those are the deliberate acts. Typing into a live field is not a calculation, and counting
   * keystrokes would show an ad within seconds of launch.
   */
  const switchTab = (next: Tab) => {
    if (next === tab) return;
    const completed = history.length + courses.length;
    if (
      shouldShowAds({ isPremium, isReady }) &&
      shouldShowInterstitial({
        gamesPlayed: completed,
        lastInterstitialAt: lastInterstitialAt.current,
        now: Date.now(),
        adsRemoved: isPremium,
      }) &&
      showInterstitial()
    ) {
      lastInterstitialAt.current = Date.now();
    }
    setTab(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.base,
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.titleRow, { marginBottom: spacing.base }]}>
          <Text variant="title" style={styles.grow}>
            {t('appName')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.iconSlot}
          >
            <Feather name="settings" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Segmented
          accessibilityLabel={t('calculatorLabel')}
          options={[
            { value: 'bmi' as const, label: t('tabBmi') },
            { value: 'gpa' as const, label: t('tabGpa') },
          ]}
          value={tab}
          onChange={switchTab}
        />

        <View style={{ marginTop: spacing.base }}>
          {tab === 'bmi' ? <BmiPanel /> : <GpaPanel />}
        </View>
      </ScrollView>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  iconSlot: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
});
