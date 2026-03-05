import React from "react";
import { Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme";

interface Props {
  name: string;
  type: string;
  score: number;
  description: string;
  timestamp: string;
  onPress?: () => void;
  editMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function GarmentCard({
  name,
  type,
  score,
  description,
  timestamp,
  onPress,
  editMode,
  selected,
  onToggleSelect,
}: Props) {
  const handlePress = editMode ? onToggleSelect : onPress;
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const checkboxAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (editMode) {
      // Slide badge first, then fade in checkbox after badge clears
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        Animated.timing(checkboxAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // Slide badge back and hide checkbox simultaneously
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(checkboxAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [editMode, slideAnim, checkboxAnim]);

  return (
    <Pressable
      style={[styles.card, editMode && !selected && styles.cardDimmed]}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.checkbox,
          selected && styles.checkboxSelected,
          { opacity: checkboxAnim },
        ]}
      >
        {selected && (
          <Ionicons name="checkmark" size={18} color={colors.white} />
        )}
      </Animated.View>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{name}</Text>
          <Animated.View
            style={[
              styles.co2Badge,
              {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -36], // slide left to clear the checkbox
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.co2Text}>{score.toFixed(0)} kg</Text>
          </Animated.View>
        </View>
        <Text style={styles.type}>{type}</Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  cardDimmed: {
    opacity: 0.4,
  },
  checkbox: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
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
    ...typography.h2,
    color: colors.text,
    flex: 1,
    paddingRight: 36,
  },
  co2Badge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  co2Text: {
    ...typography.subtitle2,
    color: colors.white,
  },
  type: {
    ...typography.bodySmall,
    color: colors.disabled,
    textTransform: "capitalize",
  },
  description: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  timestamp: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.elementH,
  },
  textDimmed: {
    opacity: 0.5,
  },
});
