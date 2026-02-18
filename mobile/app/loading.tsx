import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "../src/theme";
import { SkeletonRect } from "../src/components/SkeletonRect";
import { ProgressBar } from "../src/components/ProgressBar";
import { useMetrics } from "../src/context/MetricsContext";
import {
  consumePendingScanImage,
  NormalizedApiError,
  tagImage,
} from "../src/services/api";

export default function LoadingScreen() {
  const router = useRouter();
  const metrics = useMetrics();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      const imageUri = consumePendingScanImage();
      if (!imageUri) {
        router.replace({
          pathname: "/results",
          params: {
            status: "error",
            errorCode: "MISSING_IMAGE",
            errorMessage: "No image was found to upload.",
          },
        });
        return;
      }

      metrics.mark("uploadStart");
      try {
        const response = await tagImage(imageUri);
        metrics.mark("uploadEnd");
        metrics.logToConsole();
        router.replace({
          pathname: "/results",
          params: {
            status: "success",
            data: JSON.stringify(response),
          },
        });
      } catch (err) {
        const normalized = err as NormalizedApiError;
        console.error("[EcoTag] Upload failed:", {
          error: normalized,
          imageUri,
        });
        metrics.mark("uploadEnd");
        metrics.logToConsole();
        router.replace({
          pathname: "/results",
          params: {
            status: "error",
            errorCode: normalized.code ?? "UNKNOWN",
            errorMessage: normalized.message,
          },
        });
      }
    }

    run();
  }, [metrics, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Analyzing your garment tag...</Text>
        <SkeletonRect width="60%" height={32} />
        <SkeletonRect width="100%" height={120} />
        <SkeletonRect width="100%" height={20} />
        <SkeletonRect width="100%" height={48} />
        <SkeletonRect width="100%" height={48} />
        <SkeletonRect width="100%" height={48} />
        <SkeletonRect width="100%" height={48} />

        <View style={styles.progressContainer}>
          <ProgressBar />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV * 2,
    gap: spacing.elementV,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  progressContainer: {
    marginTop: spacing.elementV,
  },
});
