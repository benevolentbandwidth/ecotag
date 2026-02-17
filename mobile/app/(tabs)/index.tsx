import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "../../src/theme";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { GarmentCard } from "../../src/components/GarmentCard";
import { InfoCard } from "../../src/components/InfoCard";
import { MOCK_HISTORY } from "../../src/constants/mock";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Ready to start scanning?</Text>

        <PrimaryButton
          label="Scan Garment"
          icon="leaf-outline"
          onPress={() => router.push("/scan")}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          <Text
            style={styles.viewAll}
            onPress={() => router.push("/history")}
          >
            View All
          </Text>
        </View>

        {MOCK_HISTORY.slice(0, 2).map((item) => (
          <GarmentCard
            key={item.id}
            name={item.garment_name}
            type={item.garment_type}
            score={item.score}
            description={item.description}
            timestamp={item.timestamp}
            onPress={() => router.push("/results")}
          />
        ))}

        <InfoCard title="About EcoTag" />

        <Text style={styles.footer}>
          Built with love for Humanity.{"\n"}The Benevolent Bandwidth Foundation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
    paddingBottom: 40,
    gap: spacing.elementV,
  },
  heading: {
    ...typography.h1,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.elementV,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  viewAll: {
    ...typography.link,
    color: colors.link,
  },
  footer: {
    ...typography.bodySmall,
    color: colors.disabled,
    textAlign: "center",
    marginTop: spacing.elementV,
  },
});
