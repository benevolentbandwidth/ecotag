import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing } from "../src/theme";
import { SkeletonRect } from "../src/components/SkeletonRect";
import { ProgressBar } from "../src/components/ProgressBar";
import { useMetrics } from "../src/context/MetricsContext";
import { consumePendingScanImage, submitScan } from "../src/services/api";

export default function LoadingScreen() {
  const router = useRouter();
  const metrics = useMetrics();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      const base64 = consumePendingScanImage();
      if (!base64) {
        router.replace("/results");
        return;
      }

      metrics.mark("uploadStart");
      try {
        const response = await submitScan(base64);
        metrics.mark("uploadEnd");
        metrics.logToConsole();
        router.replace({
          pathname: "/results",
          params: { data: JSON.stringify(response) },
        });
      } catch (err) {
        console.error("[EcoTag] Upload failed:", err);
        metrics.mark("uploadEnd");
        metrics.logToConsole();
        router.replace("/results");
      }
    }

    run();
  }, [metrics, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
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
  progressContainer: {
    marginTop: spacing.elementV,
  },
});
