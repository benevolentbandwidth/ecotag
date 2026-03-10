import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../src/theme";
import { CO2Gauge } from "../src/components/CO2Gauge";
import { BreakdownRow } from "../src/components/BreakdownRow";
import {
  TagApiResponse,
  BREAKDOWN_LABELS,
  BREAKDOWN_ORDER,
} from "../src/types/api";
import { getScanById, toggleClosetStatus } from "../src/storage/scans";
import { estimateLifespan } from "../src/utils/lifespan";

function getFriendlyErrorMessage(code?: string, fallback?: string): string {
  if (code === "MISSING_IMAGE") {
    return "Please capture or choose an image before submitting.";
  }
  if (code === "NO_TAG_DETECTED") {
    return "No clothing tag was detected. Please try again with a clearer photo of the tag.";
  }
  if (code === "UPSTREAM_ERROR") {
    return "The analysis service is temporarily unavailable. Please try again.";
  }
  if (code === "INTERNAL_ERROR") {
    return "Something went wrong on our side. Please try again.";
  }
  return fallback || "Unable to analyze this image right now. Please retry.";
}

function formatCareKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPillLabel(pct: number): string {
  if (pct < 40) return "Poor";
  if (pct < 60) return "Average";
  return "Great";
}

export default function ResultsScreen() {
  const router = useRouter();
  const { status, data, errorCode, errorMessage, scanId } =
    useLocalSearchParams<{
      status?: string;
      data?: string;
      errorCode?: string;
      errorMessage?: string;
      scanId?: string;
    }>();

  const [isInCloset, setIsInCloset] = useState(false);

  useEffect(() => {
    if (scanId) {
      const scan = getScanById(scanId);
      if (scan) {
        setIsInCloset(scan.in_closet === 1);
      }
    }
  }, [scanId]);

  const handleToggleCloset = () => {
    if (!scanId) return;
    const next = !isInCloset;
    toggleClosetStatus(scanId, next);
    setIsInCloset(next);
  };

  const successPayload = useMemo(() => {
    if (data) {
      try {
        const parsed = JSON.parse(data) as TagApiResponse;
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  }, [data]);

  const isSuccess = status === "success" && !!successPayload;
  const emissions = successPayload?.emissions;
  const friendlyMessage = getFriendlyErrorMessage(errorCode, errorMessage);

  const breakdownRows = useMemo(() => {
    if (!emissions?.breakdown) return [];
    const bd = emissions.breakdown;
    const total = emissions.total_kgco2e;
    const parsed = successPayload?.parsed;

    const subtitleFor = (key: string): string => {
      if (key === "materials" && parsed?.materials?.length) {
        return parsed.materials
          .map(({ fiber, pct }) => `${pct}% ${fiber}`)
          .join(", ");
      }
      if (key === "manufacturing" && parsed?.country) {
        return parsed.country;
      }
      if (parsed?.care && typeof parsed.care === "object") {
        const careKey = key as keyof typeof parsed.care;
        if (parsed.care[careKey]) {
          return formatCareKey(parsed.care[careKey] as string);
        }
      }
      return "";
    };

    return BREAKDOWN_ORDER.filter(
      (key) => typeof bd[key] === "number" && bd[key] > 0,
    ).map((key) => {
      const pct = total > 0 ? Math.round((bd[key] / total) * 100) : 0;
      return {
        key,
        label: BREAKDOWN_LABELS[key] ?? key,
        value: bd[key],
        subtitle: subtitleFor(key),
        pillLabel: getPillLabel(pct),
      };
    });
  }, [emissions, successPayload]);

  const lifespan = useMemo(() => {
    if (!successPayload?.parsed || !successPayload?.emissions) return null;
    return estimateLifespan(successPayload.parsed, successPayload.emissions);
  }, [successPayload]);

  const ecoRating = useMemo(() => {
    const total = emissions?.total_kgco2e;
    const benchmark = successPayload?.benchmark?.benchmark_kgco2e;
    if (total == null || !benchmark) return null;
    const score = Math.max(0, Math.min(100, (1 - total / (2 * benchmark)) * 100));
    const label = score < 40 ? "Poor" : score < 60 ? "Average" : "Great";
    return { score: Math.round(score), label };
  }, [emissions, successPayload]);

  const [breakdownScrollEnabled, setBreakdownScrollEnabled] = useState(false);
  const [breakdownContainerH, setBreakdownContainerH] = useState(0);
  const [breakdownContentH, setBreakdownContentH] = useState(0);

  useEffect(() => {
    setBreakdownScrollEnabled(breakdownContentH > breakdownContainerH);
  }, [breakdownContentH, breakdownContainerH]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Results</Text>
        <Pressable style={styles.hangerButton} onPress={handleToggleCloset}>
          <MaterialCommunityIcons
            name="hanger"
            size={28}
            color={isInCloset ? colors.primary : colors.text}
          />
          <View
            style={[styles.plusBadge, isInCloset && styles.plusBadgeActive]}
          >
            <Ionicons
              name="add"
              size={14}
              color={isInCloset ? colors.white : colors.text}
            />
          </View>
        </Pressable>
      </View>

      {isSuccess ? (
        <>
          <View style={styles.fixedContent}>
            <CO2Gauge totalKgCO2e={emissions!.total_kgco2e} />

            <View style={styles.statRow}>
              <View style={styles.statCol}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    ${lifespan?.costSavingsUsd ?? 0}
                  </Text>
                  <Ionicons name="cash-outline" size={20} color={colors.white} />
                </View>
                <Text style={styles.statLabel}>Est. Cost Savings</Text>
              </View>
              <View style={styles.statCol}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {lifespan?.yearsAvg ?? "—"} years
                  </Text>
                  <Ionicons name="trending-up-outline" size={20} color={colors.white} />
                </View>
                <Text style={styles.statLabel}>Est. Lifetime</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Carbon Emission Breakdown</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.breakdownScroll}
            showsVerticalScrollIndicator={false}
            scrollEnabled={breakdownScrollEnabled}
            onLayout={(e) => setBreakdownContainerH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setBreakdownContentH(h)}
          >
            {breakdownRows.map((row) => (
              <BreakdownRow
                key={row.key}
                label={row.label}
                kgValue={row.value}
                subtitle={row.subtitle}
                pillLabel={row.pillLabel}
              />
            ))}
            {ecoRating && (
              <View
                style={[
                  styles.ratingCard,
                  ecoRating.label === "Great" && styles.ratingGreat,
                  ecoRating.label === "Average" && styles.ratingAverage,
                  ecoRating.label === "Poor" && styles.ratingPoor,
                ]}
              >
                <View>
                  <Text style={styles.ratingLabel}>Eco Rating</Text>
                  <Text style={styles.ratingSubtitle}>vs. average garment</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingScore}>{ecoRating.score}%</Text>
                  <Text style={styles.ratingLabelRight}>{ecoRating.label}</Text>
                </View>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
              onPress={() => router.replace("/scan")}
            >
              <Text style={styles.scanButtonText}>Scan Another</Text>
            </Pressable>
          </ScrollView>
        </>
      ) : (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>We couldn't analyze that image</Text>
          <Text style={styles.errorMessage}>{friendlyMessage}</Text>
          {errorCode ? (
            <Text style={styles.errorCode}>Error code: {errorCode}</Text>
          ) : null}
        </View>
      )}

      <View style={styles.bottomBar} />
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
    ...typography.h1,
    color: colors.text,
    letterSpacing: 0.48,
  },
  hangerButton: {
    width: 50,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadgeActive: {
    backgroundColor: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  fixedContent: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV * 2,
  },
  breakdownScroll: {
    paddingHorizontal: spacing.screenH * 2,
    paddingTop: 16,
    gap: 10,
    paddingBottom: 48,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: colors.text,
    letterSpacing: 0.32,
    marginTop: 32,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  statCard: {
    width: "100%",
    backgroundColor: colors.primaryMid,
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statValue: {
    fontFamily: "Figtree_700Bold",
    fontSize: 20,
    lineHeight: 26,
    color: colors.white,
  },
  statLabel: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  bottomBar: {
    height: 36,
    backgroundColor: colors.background,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: spacing.radius,
    backgroundColor: colors.destructiveLight,
    padding: spacing.elementV,
    gap: spacing.elementV / 2,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
  },
  errorMessage: {
    ...typography.body,
    color: colors.text,
  },
  errorCode: {
    ...typography.bodySmall,
    color: colors.text,
  },
  ratingCard: {
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingGreat: {
    backgroundColor: "#D6F0DA",
  },
  ratingAverage: {
    backgroundColor: "#FFF5CC",
  },
  ratingPoor: {
    backgroundColor: colors.destructiveLight,
  },
  ratingLabel: {
    fontFamily: "Figtree_700Bold",
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    letterSpacing: 0.2,
  },
  ratingSubtitle: {
    fontFamily: "Figtree_400Regular",
    fontSize: 11,
    lineHeight: 14,
    color: colors.disabled,
    marginTop: 2,
  },
  ratingBadge: {
    alignItems: "flex-end",
    gap: 4,
  },
  ratingScore: {
    fontFamily: "Figtree_700Bold",
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  ratingLabelRight: {
    fontFamily: "Figtree_700Bold",
    fontSize: 13,
    lineHeight: 17,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    marginTop: 25,
    marginHorizontal: spacing.screenH * 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  scanButtonPressed: {
    opacity: 0.85,
  },
  scanButtonText: {
    fontFamily: "Figtree_700Bold",
    fontSize: 16,
    lineHeight: 20,
    color: colors.white,
    letterSpacing: 0.32,
  },
});
