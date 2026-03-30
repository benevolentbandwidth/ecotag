import React, { useState } from "react";
import { Image, ImageSourcePropType, ImageStyle, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme";

interface Props {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  image?: ImageSourcePropType;
  imageStyle?: ImageStyle;
  style?: ViewStyle;
  rightNode?: React.ReactNode;
}

export function PrimaryButton({ label, onPress, icon, image, imageStyle, style, rightNode }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      style={[styles.button, pressed && styles.pressed, style]}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <View style={styles.content}>
        {icon && !image && (
          <Ionicons
            name={icon}
            size={18}
            color={colors.white}
            style={{ marginRight: spacing.iconTextGap }}
          />
        )}
        <Text style={styles.label}>{label}</Text>
        {image && (
          <Image
            source={image}
            style={[styles.image, imageStyle]}
            resizeMode="contain"
          />
        )}
        {rightNode && <View style={styles.rightNode}>{rightNode}</View>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    ...typography.subtitle1,
    color: colors.white,
  },
  image: {
    width: 18,
    height: 18,
    marginLeft: spacing.iconTextGap,
  },
  rightNode: {
    marginLeft: spacing.iconTextGap,
  },
});
