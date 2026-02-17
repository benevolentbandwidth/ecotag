import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, typography, spacing } from "../theme";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  name: string;
  type: string;
  score: number;
  description: string;
  timestamp: string;
  onPress?: () => void;
}

export function GarmentCard({
  name,
  type,
  score,
  description,
  timestamp,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{name}</Text>
          <ScoreBadge score={score} />
        </View>
        <Text style={styles.type}>{type}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.timestamp}>{timestamp}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: spacing.strokeWidth,
    borderColor: colors.stroke,
    padding: 14,
    gap: 6,
  },
  header: {
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    ...typography.subtitle1,
    color: colors.text,
  },
  type: {
    ...typography.bodySmall,
    color: colors.disabled,
    textTransform: "capitalize",
  },
  description: {
    ...typography.body,
    color: colors.text,
  },
  timestamp: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
});
