import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  label: string;
  kgValue: number;
  subtitle?: string;
  pillLabel?: string;
}

export function BreakdownRow({ label, kgValue, subtitle, pillLabel }: Props) {
  const kgText = `${kgValue.toFixed(2)} kg`;

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <View style={styles.dot} />
            <Text style={styles.label}>{label}</Text>
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.indicators}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{kgText}</Text>
          </View>
          {pillLabel ? (
            <View style={[
              styles.pill,
              pillLabel === "Poor" && styles.pillPoor,
              pillLabel === "Average" && styles.pillAverage,
              pillLabel === "Good" && styles.pillGood,
            ]}>
              <Text style={[
                styles.pillText,
                pillLabel === "Poor" && styles.pillTextPoor,
                pillLabel === "Average" && styles.pillTextAverage,
                pillLabel === "Good" && styles.pillTextGood,
              ]}>{pillLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 80,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 109, 61, 0.3)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  textCol: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.primaryMid,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexShrink: 0,
  },
  label: {
    fontFamily: "Figtree_500Medium",
    fontSize: 16,
    lineHeight: 20,
    color: "#0A1F15",
    letterSpacing: 0.32,
  },
  subtitle: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 15,
    color: colors.disabled,
    opacity: 0.75,
    letterSpacing: 0.24,
    paddingLeft: 21,
  },
  indicators: {
    alignItems: "flex-end",
    gap: 10,
    flexShrink: 0,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    paddingHorizontal: 20,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Figtree_700Bold",
    fontSize: 16,
    lineHeight: 20,
    color: colors.white,
    letterSpacing: 0.32,
  },
  pill: {
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  pillPoor: {
    backgroundColor: "#FFAFA480",
  },
  pillAverage: {
    backgroundColor: "#FEEFBC",
  },
  pillGood: {
    backgroundColor: "#71D56180",
  },
  pillText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.24,
  },
  pillTextPoor: {
    color: "#F2614E",
  },
  pillTextAverage: {
    color: "#F5A623",
  },
  pillTextGood: {
    color: "#17412D",
  },
});
