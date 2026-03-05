import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { colors, spacing, typography } from "../src/theme";

type Garment = {
  id: string;
  display_name: string;
  category: string;
  co2e_grams: number;
  result_json?: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - spacing.screenH * 2 - 12) / 2;

function MiniTreeIcon() {
  return (
    <Svg width={50} height={50} viewBox="0 0 107 107" fill="none">
      <Path
        d="M53.5 82.0947C54.7255 82.9107 56.0019 83.6476 57.3214 84.301V103.179C57.3214 104.193 56.9188 105.164 56.2021 105.881C55.4855 106.597 54.5135 107 53.5 107C52.4865 107 51.5145 106.597 50.7978 105.881C50.0812 105.164 49.6786 104.193 49.6786 103.179V84.301C50.998 83.6476 52.2744 82.9107 53.5 82.0947ZM86.9852 22.2741C84.2208 15.6752 79.5674 10.0403 73.6098 6.07731C67.6521 2.11432 60.6558 0 53.5 0C46.3441 0 39.3479 2.11432 33.3902 6.07731C27.4325 10.0403 22.7792 15.6752 20.0148 22.2741C14.0448 25.0022 8.98456 29.3877 5.43626 34.9088C1.88796 40.4298 0.00105448 46.8539 0.000111307 53.4165C-0.0476564 71.6597 15.2858 87.4196 33.5044 87.8972C39.1079 88.0299 44.6594 86.7956 49.6786 84.301V67.3329L28.8614 56.9314C27.9543 56.478 27.2645 55.6829 26.9438 54.721C26.6231 53.7591 26.6978 52.7092 27.1513 51.8023C27.6048 50.8954 28.4001 50.2058 29.3623 49.8852C30.3244 49.5646 31.3745 49.6392 32.2816 50.0926L49.6786 58.794V34.4092C49.6786 33.3959 50.0812 32.4241 50.7978 31.7076C51.5145 30.9911 52.4865 30.5886 53.5 30.5886C54.5135 30.5886 55.4855 30.9911 56.2021 31.7076C56.9188 32.4241 57.3214 33.3959 57.3214 34.4092V47.3322L74.7184 38.6309C75.1676 38.4064 75.6565 38.2725 76.1574 38.2369C76.6583 38.2013 77.1613 38.2647 77.6377 38.4235C78.1141 38.5822 78.5545 38.8333 78.9339 39.1622C79.3133 39.4911 79.6241 39.8916 79.8487 40.3406C80.0732 40.7896 80.2072 41.2785 80.2428 41.7793C80.2783 42.2801 80.2149 42.783 80.0561 43.2592C79.8973 43.7355 79.6463 44.1759 79.3173 44.5552C78.9882 44.9344 78.5877 45.2452 78.1386 45.4697L57.3214 55.8712V84.301C62.0721 86.6594 67.303 87.8901 72.6071 87.8972H73.4765C91.7142 87.4196 107.052 71.6597 107 53.4165C106.999 46.8539 105.112 40.4298 101.564 34.9088C98.0154 29.3877 92.9552 25.0022 86.9852 22.2741Z"
        fill={colors.primary}
      />
    </Svg>
  );
}

function getScoreColor(kgCO2: number): string {
  if (kgCO2 < 5) return colors.primary;
  if (kgCO2 < 15) return "#F5A623";
  return colors.destructive;
}

function getOverallRating(avgKg: number): { label: string; color: string } {
  if (avgKg < 3) return { label: "Excellent", color: colors.primary };
  if (avgKg < 8) return { label: "Good", color: colors.primary };
  if (avgKg < 15) return { label: "Average", color: "#F5A623" };
  return { label: "Poor", color: colors.destructive };
}

export default function ComparisonView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const garments: Garment[] = params.selectedGarments
    ? JSON.parse(params.selectedGarments as string)
    : [];

  const totalKg = garments.reduce((sum, g) => sum + g.co2e_grams / 1000, 0);
  const avgKg = garments.length > 0 ? totalKg / garments.length : 0;
  const rating = getOverallRating(avgKg);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Comparison View</Text>
        <View style={styles.backButton} />
      </View>

      {/* Cards */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsRow}>
          {garments.map((g, idx) => {
            const co2Kg = g.co2e_grams / 1000;
            const badgeColor = getScoreColor(co2Kg);
            const itemRating = getOverallRating(co2Kg);
            return (
              <View key={g.id} style={styles.cardWrapper}>
                {/* Index circle */}
                <View style={styles.indexCircle}>
                  <Text style={styles.indexText}>{idx + 1}</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                  <MiniTreeIcon />
                  <Text style={styles.cardName} numberOfLines={2}>
                    {g.display_name ?? "Tag scan"}
                  </Text>
                  <Text style={styles.cardType}>
                    {(g.category ?? "Garment").toUpperCase()}
                  </Text>
                  <View
                    style={[styles.scoreBadge, { backgroundColor: badgeColor }]}
                  >
                    <Text style={styles.scoreText}>
                      {co2Kg >= 1
                        ? `${Math.round(co2Kg)} kg`
                        : `${(co2Kg * 1000).toFixed(0)} g`}
                    </Text>
                  </View>
                  <Text
                    style={[styles.cardRating, { color: itemRating.color }]}
                  >
                    {itemRating.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Aggregate Score */}
        {garments.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Overall Score</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {totalKg >= 1
                    ? `${Math.round(totalKg)} kg`
                    : `${(totalKg * 1000).toFixed(0)} g`}
                </Text>
                <Text style={styles.summaryLabel}>Total CO₂e</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {avgKg >= 1
                    ? `${avgKg.toFixed(1)} kg`
                    : `${(avgKg * 1000).toFixed(0)} g`}
                </Text>
                <Text style={styles.summaryLabel}>Avg per item</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: rating.color }]}>
                  {rating.label}
                </Text>
                <Text style={styles.summaryLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.addButton} onPress={() => router.back()}>
          <Text style={styles.addButtonText}>Add Garment</Text>
        </Pressable>
      </View>
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
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h1,
    textAlign: "center",
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenH,
    paddingTop: 8,
    paddingBottom: 100,
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "stretch",
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: "center",
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -14,
    zIndex: 1,
  },
  indexText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  card: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: spacing.strokeWidth,
    borderColor: colors.primary,
    paddingTop: 24,
    paddingBottom: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
  },
  cardName: {
    ...typography.subtitle1,
    color: colors.text,
    textAlign: "center",
    fontSize: 14,
  },
  cardType: {
    ...typography.bodySmall,
    color: colors.disabled,
    textAlign: "center",
    fontSize: 12,
  },
  scoreBadge: {
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  scoreText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  cardRating: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: spacing.strokeWidth,
    borderColor: colors.primary,
    padding: 16,
    marginTop: 20,
  },
  summaryTitle: {
    ...typography.subtitle1,
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.disabled,
    opacity: 0.3,
  },
  summaryValue: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.disabled,
    textAlign: "center",
    fontSize: 11,
  },
  bottomBar: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingHorizontal: 36,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: "center",
  },
  addButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
});
