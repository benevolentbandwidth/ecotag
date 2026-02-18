import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../src/theme";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TagApiResponse } from "../src/types/api";

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
  const { status, data, errorCode, errorMessage } = useLocalSearchParams<{
    status?: string;
    data?: string;
    errorCode?: string;
    errorMessage?: string;
  }>();

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
  const parsed = successPayload?.parsed;
  const emissions = successPayload?.emissions;
  const totalKg = emissions ? emissions.total_kgco2e.toFixed(2) : "N/A";
  const materialSummary = parsed?.materials
    ?.map((m) => `${m.pct}% ${m.fiber}`)
    .join(", ");
  const friendlyMessage = getFriendlyErrorMessage(errorCode, errorMessage);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
        {isSuccess ? (
          <View style={styles.card}>
            <Text style={styles.successTitle}>Tag analyzed successfully</Text>
            <Text style={styles.metric}>
              Total emissions:{" "}
              <Text style={styles.metricStrong}>{totalKg} kgCO2e</Text>
            </Text>
            <Text style={styles.rowLabel}>
              Country: <Text style={styles.rowValue}>{parsed?.country || "N/A"}</Text>
            </Text>
            <Text style={styles.rowLabel}>
              Materials:{" "}
              <Text style={styles.rowValue}>{materialSummary || "N/A"}</Text>
            </Text>
            <Text style={styles.rowLabel}>
              Care:{" "}
              <Text style={styles.rowValue}>
                Wash {parsed?.care.washing || "N/A"}, Dry {parsed?.care.drying || "N/A"}
              </Text>
            </Text>
          </View>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>We couldn't analyze that image</Text>
            <Text style={styles.errorMessage}>{friendlyMessage}</Text>
            {errorCode ? (
              <Text style={styles.errorCode}>Error code: {errorCode}</Text>
            ) : null}
          </View>
        )}

        <PrimaryButton
          label="Scan Another"
          icon="leaf-outline"
          onPress={() => router.replace("/scan")}
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    backgroundColor: colors.white,
    padding: spacing.elementV,
    gap: 10,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
  },
  metric: {
    ...typography.body,
    color: colors.text,
  },
  metricStrong: {
    ...typography.h2,
    color: colors.primary,
  },
  rowLabel: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  rowValue: {
    ...typography.body,
    color: colors.text,
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
