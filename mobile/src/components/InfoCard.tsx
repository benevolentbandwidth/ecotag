import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme";

interface Props {
  title: string;
  onPress?: () => void;
}

export function InfoCard({ title, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.disabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: spacing.strokeWidth,
    borderColor: colors.stroke,
    paddingVertical: 14,
    paddingHorizontal: spacing.paddingH + 4,
  },
  title: {
    ...typography.subtitle1,
    color: colors.text,
  },
});
