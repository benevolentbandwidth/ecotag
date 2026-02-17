import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../src/theme";
import { SkeletonRect } from "../src/components/SkeletonRect";
import { ProgressBar } from "../src/components/ProgressBar";

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        {/* Skeleton placeholders mimicking the results layout */}
        <SkeletonRect width="60%" height={32} />
        <SkeletonRect width="100%" height={120} />
        <SkeletonRect width="100%" height={20} />
        <SkeletonRect width="100%" height={48} />
        <SkeletonRect width="100%" height={48} />
        <SkeletonRect width="100%" height={48} />
        <SkeletonRect width="100%" height={48} />

        <View style={styles.progressContainer}>
          <ProgressBar />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV * 2,
    gap: spacing.elementV,
  },
  progressContainer: {
    marginTop: spacing.elementV,
  },
});
