import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../src/theme";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { CO2Gauge } from "../src/components/CO2Gauge";
import { BreakdownRow } from "../src/components/BreakdownRow";
import { TagApiResponse, BREAKDOWN_LABELS, BREAKDOWN_ORDER } from "../src/types/api";
import { getScanById, toggleClosetStatus } from "../src/storage/scans";
import { estimateLifespan } from "../src/utils/lifespan";

function getFriendlyErrorMessage(code?: string, fallback?: string): string {
  if (code === "MISSING_IMAGE") {
    return "Please capture or choose an image before submitting.";
  }
  if (code === "UPSTREAM_ERROR") {
    return "The analysis service is temporarily unavailable. Please try again.";
  }
  if (code === "INTERNAL_ERROR") {
    return "Something went wrong on our side. Please try again.";
  }
  return fallback || "Unable to analyze this image right now. Please retry.";
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
    return BREAKDOWN_ORDER.filter(
      (key) => typeof bd[key] === "number" && bd[key] > 0,
    ).map((key) => ({
      key,
      label: BREAKDOWN_LABELS[key] ?? key,
      value: bd[key],
    }));
  }, [emissions]);

  const lifespan = useMemo(() => {
    if (!successPayload?.parsed || !successPayload?.emissions) return null;
    return estimateLifespan(successPayload.parsed, successPayload.emissions);
  }, [successPayload]);

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
            style={[
              styles.plusBadge,
              isInCloset && styles.plusBadgeActive,
            ]}
          >
            <Ionicons name="add" size={14} color={isInCloset ? colors.white : colors.text} />
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
              />
            ))}
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

      <View style={styles.bottomBar}>
        <PrimaryButton
          label="Scan Another"
          image={require("../assets/images/landing_page/screen_logo.png")}
          onPress={() => router.replace("/scan")}
        />
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
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    gap: 10,
    paddingBottom: 16,
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
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 36,
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
});
