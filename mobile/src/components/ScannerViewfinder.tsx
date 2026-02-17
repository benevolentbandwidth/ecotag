import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography, spacing } from "../theme";

export function ScannerViewfinder() {
  return (
    <View style={styles.container}>
      <View style={styles.viewfinder} />
      <Text style={styles.instruction}>Please center your scan.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.elementV,
  },
  viewfinder: {
    width: "80%",
    aspectRatio: 3 / 4,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: spacing.radius,
  },
  instruction: {
    ...typography.body,
    color: colors.disabled,
  },
});
