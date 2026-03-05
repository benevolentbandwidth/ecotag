import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography, spacing } from "../theme";

interface Props {
  label: string;
  kgValue: number;
  badgeText?: string;
}

export function BreakdownRow({ label, kgValue, badgeText }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeText ?? `${Math.round(kgValue)} kg`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: spacing.radius,
    height: 60,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    ...typography.subtitle1,
    color: colors.text,
    letterSpacing: 0.32,
  },
  badge: {
    backgroundColor: colors.primaryMid,
    borderRadius: spacing.radius,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 70,
    alignItems: "center",
  },
  badgeText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.4,
    color: colors.white,
  },
});
