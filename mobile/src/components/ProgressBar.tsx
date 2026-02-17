import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  /** 0–1 progress value; if omitted, renders indeterminate animation */
  progress?: number;
}

export function ProgressBar({ progress }: Props) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(animValue, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [progress, animValue]);

  const width = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: spacing.radius,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primaryMid,
    borderRadius: spacing.radius,
  },
});
