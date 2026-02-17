import React from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "../../src/theme";
import { ScannerViewfinder } from "../../src/components/ScannerViewfinder";

export default function ScanScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.heading}>Scanner</Text>
      <ScannerViewfinder />
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
