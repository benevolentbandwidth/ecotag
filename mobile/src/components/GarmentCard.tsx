import React from "react";
import { Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme";

interface Props {
  name: string;
  type: string;
  co2Kg: number;
  description: string;
  timestamp: string;
  rating?: { label: string; color: string; bgColor: string };
  onPress?: () => void;
  editMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function GarmentCard({
  name,
  type,
  co2Kg,
  description,
  timestamp,
  rating,
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

      <View style={styles.cardLeft}>
        <View style={styles.cardMeta}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.type}>{type}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      </View>

      <View style={styles.cardRight}>
        <Animated.View
          style={[
            styles.co2Badge,
            {
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -36],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.co2Text}>{co2Kg} kg</Text>
        </Animated.View>
        {rating && (
          <View style={[styles.ratingPill, { backgroundColor: rating.bgColor }]}>
            <Text style={[styles.ratingText, { color: rating.color }]}>{rating.label}</Text>
          </View>
        )}
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    gap: 15,
    height: 125,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
  cardLeft: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardMeta: {
    gap: 2,
  },
  name: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.4,
    color: colors.text,
  },
  type: {
    fontFamily: "Figtree_400Regular",
    fontSize: 16,
    lineHeight: 19,
    color: colors.text,
  },
  description: {
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 17.5,
    letterSpacing: 0.28,
    color: colors.text,
  },
  cardRight: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  co2Badge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  co2Text: {
    fontFamily: "Figtree_700Bold",
    fontSize: 20,
    lineHeight: 26,
    color: colors.white,
  },
  ratingPill: {
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  ratingText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.24,
  },
  timestamp: {
    fontFamily: "Figtree_400Regular",
    fontStyle: "italic",
    fontSize: 16,
    lineHeight: 19,
    color: "#A6A6A6",
    textAlign: "right",
  },
});
