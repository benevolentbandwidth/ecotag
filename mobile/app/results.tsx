import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../src/theme";
import { CO2Gauge } from "../src/components/CO2Gauge";
import { BreakdownRow } from "../src/components/BreakdownRow";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { BREAKDOWN_LABELS, BREAKDOWN_ORDER, CO2Breakdown } from "../src/types/api";
import { MOCK_HISTORY } from "../src/constants/mock";

export default function ResultsScreen() {
  const router = useRouter();
  const mockItem = MOCK_HISTORY[0];
  const { result } = mockItem;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Custom header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Results</Text>
        <Pressable>
          <Ionicons name="bookmark-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CO2Gauge totalKgCO2e={result.total_kgco2e} />

        <View style={styles.breakdownSection}>
          {BREAKDOWN_ORDER.map((key) => (
            <BreakdownRow
              key={key}
              label={BREAKDOWN_LABELS[key]}
              kgValue={result.breakdown[key] ?? 0}
            />
          ))}
        </View>

        <PrimaryButton
          label="Scan Another"
          icon="leaf-outline"
          onPress={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    paddingVertical: 12,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
    paddingBottom: 40,
    gap: spacing.elementV * 2,
  },
  breakdownSection: {
    gap: 0,
  },
});
