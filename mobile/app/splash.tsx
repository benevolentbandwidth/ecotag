import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { colors, spacing, typography } from "../src/theme";

const DURATION = 2000;

export default function SplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: false,
    }).start(() => {
      router.replace("/(tabs)");
    });
  }, []);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.screen}>
      {/* added svg logo for the splash screen to improve clarity of the logo*/}
      <Svg width={77} height={107} viewBox="0 0 77 107" fill="none">
        <Path d="M41.2551 29.9117C41.2551 13.3919 54.6471 0 71.1669 0H73.4448C75.0967 0 76.4359 1.33919 76.4359 2.99117C76.4359 19.511 63.044 32.9029 46.5242 32.9029H44.2463C42.5943 32.9029 41.2551 31.5637 41.2551 29.9117Z" fill="#71D561" />
        <Path d="M3.56641 0C23.2631 3.948e-06 39.2305 15.9674 39.2305 35.6641V102.482C39.2304 104.452 37.6337 106.049 35.6641 106.049C15.9674 106.049 5.54198e-05 90.0814 0 70.3848V3.56641C2.58205e-05 1.59676 1.59675 0 3.56641 0ZM8.35254 5.31543C6.39559 5.31543 4.80861 6.90145 4.80859 8.8584C4.80859 10.8154 6.39558 12.4014 8.35254 12.4014C10.3094 12.4012 11.8955 10.8153 11.8955 8.8584C11.8955 6.90155 10.3094 5.31559 8.35254 5.31543Z" fill="#17412D" />
      </Svg>
      <Text style={styles.label}>Tracing origin...</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.elementV,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  track: {
    height: 15,
    width: 295,
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
