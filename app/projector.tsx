import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field } from "@/components/Field";
import { Card, Text } from "@/components/ui";
import { t } from "@/i18n";
import { SCALE_MAX, gpa, neededAverage, totalCredits } from "@/logic/gpa";
import { useCalcStore } from "@/store/useCalcStore";
import { MIN_TOUCH_TARGET, useTheme } from "@/theme";
import { useTabletColumn } from "@/theme/useTabletColumn";

const num = (text: string): number => {
  const normalized = text.trim().replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
};

/**
 * "What do I need from here" — the one paid feature in the GPA half.
 *
 * It answers with a *kind*, not always a number, because three of the four honest answers are
 * not numbers. A target that needs better than a 4.0 average says so rather than printing a
 * grade that does not exist.
 */
export default function Projector() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const tabletColumn = useTabletColumn();

  const courses = useCalcStore((s) => s.courses);
  const current = gpa(courses);
  const completed = totalCredits(courses);

  const [target, setTarget] = useState("3.5");
  const [remaining, setRemaining] = useState("");

  const result = neededAverage({
    currentGpa: current ?? 0,
    completedCredits: completed,
    remainingCredits: num(remaining) || 0,
    target: num(target),
  });

  const message = () => {
    switch (result.kind) {
      case "reachable":
        return {
          text: t("needAverage", { average: result.average.toFixed(2) }),
          tone: "default" as const,
        };
      case "already-reached":
        return { text: t("alreadyReached"), tone: "accent" as const };
      case "unreachable":
        return { text: t("unreachableTarget"), tone: "danger" as const };
      case "invalid":
        return null;
    }
  };

  const shown = message();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <View style={[styles.header, { padding: spacing.base, gap: spacing.md }]}>
        <Text variant="heading" style={styles.grow}>
          {t("projectorTitle")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("close")}
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
          ...tabletColumn,
        }}
      >
        <Card>
          <Text variant="micro" tone="faint">
            {t("yourGpa").toUpperCase()}
          </Text>
          <Text variant="title" style={{ marginTop: spacing.xs }}>
            {current === null ? "—" : current.toFixed(2)}
          </Text>
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.xs }}
          >
            {t("totalCreditsLabel", { count: completed })}
          </Text>
        </Card>

        <View style={[styles.row, { gap: spacing.md }]}>
          <Field
            label={t("targetGpa")}
            value={target}
            onChangeText={setTarget}
            suffix={`/ ${SCALE_MAX}`}
          />
          <Field
            label={t("remainingCredits")}
            value={remaining}
            onChangeText={setRemaining}
          />
        </View>

        {shown ? (
          <Card>
            <Text variant="body" tone={shown.tone}>
              {shown.text}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "flex-end" },
  grow: { flex: 1 },
  iconSlot: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
});
