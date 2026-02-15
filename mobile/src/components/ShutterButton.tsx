import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme";

interface Props {
  onPress: () => void;
  disabled?: boolean;
}

export function ShutterButton({ onPress, disabled }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.outer,
        pressed && styles.outerPressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.inner} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  outerPressed: {
    borderColor: colors.disabled,
  },
  inner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
  },
  disabled: {
    opacity: 0.4,
  },
});
