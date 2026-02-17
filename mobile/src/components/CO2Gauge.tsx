import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography, spacing } from "../theme";

interface Props {
  totalKgCO2e: number;
}

export function CO2Gauge({ totalKgCO2e }: Props) {
  return (
    <View style={styles.container}>
      {/* Semi-circle gauge placeholder */}
      <View style={styles.gauge}>
        <View style={styles.semicircle} />
        <Text style={styles.value}>{totalKgCO2e.toFixed(1)}</Text>
        <Text style={styles.unit}>kg</Text>
      </View>
      <Text style={styles.label}>Carbon Dioxide Equivalent</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.iconTextGap,
  },
  gauge: {
    width: 200,
    height: 120,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  semicircle: {
    position: "absolute",
    top: 0,
    width: 200,
    height: 100,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderWidth: 8,
    borderBottomWidth: 0,
    borderColor: colors.primaryMid,
  },
  value: {
    ...typography.h1,
    color: colors.text,
    fontSize: 32,
  },
  unit: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  label: {
    ...typography.subtitle2,
    color: colors.disabled,
    marginTop: 4,
  },
});
