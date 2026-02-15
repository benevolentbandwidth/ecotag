import React, { useCallback } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, typography, spacing } from "../../src/theme";
import { CameraView } from "../../src/components/CameraView";
import { useMetrics } from "../../src/context/MetricsContext";
import { setPendingScanImage } from "../../src/services/api";

export default function ScanScreen() {
  const router = useRouter();
  const metrics = useMetrics();

  const handleCapture = useCallback(
    (base64: string) => {
      setPendingScanImage(base64);
      router.push("/loading");
    },
    [router],
  );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
      onLayout={() => {
        metrics.reset();
        metrics.mark("cameraOpenStart");
      }}
    >
      <Text style={styles.heading}>Scanner</Text>
      <CameraView onCapture={handleCapture} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
  },
  heading: {
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
  },
});
