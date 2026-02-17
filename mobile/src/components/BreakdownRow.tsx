import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme";

interface Props {
  label: string;
  kgValue: number;
  onPress?: () => void;
}

export function BreakdownRow({ label, kgValue, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{kgValue.toFixed(1)} kg</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.details}>VIEW DETAILS</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.disabled} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    gap: 2,
  },
  label: {
    ...typography.subtitle2,
    color: colors.text,
  },
  value: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.iconTextGap,
  },
  details: {
    ...typography.bodySmall,
    color: colors.disabled,
    letterSpacing: 0.5,
  },
});
