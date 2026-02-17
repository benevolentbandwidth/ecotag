import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography, spacing } from "../theme";

interface Props {
  score: number;
}

function badgeColor(score: number): string {
  if (score >= 70) return colors.primaryMid;
  if (score >= 40) return colors.primaryPressed;
  return colors.destructive;
}

export function ScoreBadge({ score }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: badgeColor(score) }]}>
      <Text style={styles.text}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: spacing.radius,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: {
    ...typography.button,
    color: colors.white,
  },
});
