import React, { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "../../src/theme";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { InfoCard } from "../../src/components/InfoCard";
import { listScans } from "../../src/storage/scans";
import { ScanRecord } from "../../src/storage/types";
import { clearCache } from "../../src/storage/imageCache";

export default function HomeScreen() {
  const router = useRouter();
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      setRecentScans(listScans(2));
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Welcome back!</Text>
        <Text style={styles.subHeading}>Ready to start scanning?</Text>

        <PrimaryButton
          label="Scan Garment"
          image={require("../../assets/images/landing_page/screen_logo.png")}
          onPress={() => router.push("/scan")}
        />

        <Text style={styles.sectionTitle}>Recent Scans</Text>

        {recentScans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You have no items in your closet.</Text>
            <Pressable style={styles.addButton} onPress={() => router.push("/scan")}>
              <Text style={styles.addButtonLabel}>Add Garment</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {recentScans.map((scan) => {
              const totalKg = (scan.co2e_grams / 1000).toFixed(0);
              const ageMs = Date.now() - scan.created_at;
              const ageHrs = ageMs / (1000 * 60 * 60);
              const when = ageHrs < 1 ? "<1 hr" : ageHrs < 24 ? `${Math.floor(ageHrs)} hrs` : new Date(scan.created_at).toLocaleDateString();
              const description = `This garment emits ${totalKg} kg of carbon dioxide.`;
              return (
                <Pressable
                  key={scan.id}
                  style={styles.scanCard}
                  onPress={() => {
                    if (scan.result_json && scan.success === 1) {
                      router.push({
                        pathname: "/results",
                        params: {
                          status: "success",
                          data: scan.result_json,
                          scanId: scan.id,
                        },
                      });
                    }
                  }}
                >
                  <View style={styles.scanCardTop}>
                    <Text style={styles.scanName}>{scan.display_name ?? "Tag scan"}</Text>
                    <View style={styles.scanBadge}>
                      <Text style={styles.scanBadgeText}>{totalKg} kg</Text>
                    </View>
                  </View>
                  {scan.category ? <Text style={styles.scanCategory}>{scan.category.toUpperCase()}</Text> : null}
                  <View style={styles.scanCardBottom}>
                    <Text style={styles.scanDescription} numberOfLines={2}>{description}</Text>
                    <Text style={styles.scanDate}>{when}</Text>
                  </View>
                </Pressable>
              );
            })}
            <PrimaryButton label="View All" onPress={() => router.push("/closet")} />
          </>
        )}
        <Text style={styles.sectionTitle}>About EcoTag</Text>
        <Pressable style={styles.aboutCard} onPress={() => router.push("/about")}>
          <Image
            source={require("../../assets/images/landing_page/b2_logo.png")}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <View style={styles.aboutText}>
            <Text style={styles.aboutTitle}>The Benevolent Bandwidth Foundation</Text>
            <Text style={styles.aboutDescription} numberOfLines={2}>
              Lorem ipsum dolor sit amet, consectetur adipis sit amet...
            </Text>
          </View>
          <Image
            source={require("../../assets/images/landing_page/right_chevron.png")}
            style={styles.aboutChevron}
            resizeMode="contain"
          />
        </Pressable>

        <Text style={styles.footer}>
          Built with ❤️ for Humanity.{"\n"}The Benevolent Bandwidth Foundation.
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert("Clear Cache", "Are you sure you want to clear the image cache?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clearCache },
            ])
          }
        >
          <Text style={styles.clearCache}>Clear Cache</Text>
        </Pressable>
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
    paddingBottom: 120,
    gap: spacing.elementV,
  },
  heading: {
    ...typography.h1,
    color: colors.text,
  },
  subHeading: {
    ...typography.h2,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.elementV,
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.elementV,
  },
  emptyText: {
    ...typography.body,
    color: colors.disabled,
    textAlign: "center",
  },
  addButton: {
    borderWidth: spacing.strokeWidth,
    borderColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  addButtonLabel: {
    ...typography.subtitle1,
    color: colors.primary,
  },
  scanCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    backgroundColor: colors.white,
    padding: spacing.elementV,
    gap: 6,
  },
  scanCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.elementH,
  },
  scanName: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
  },
  scanBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  scanBadgeText: {
    ...typography.subtitle2,
    color: colors.white,
  },
  scanCategory: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  scanCardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.elementH,
  },
  scanDescription: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  scanDate: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  aboutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    borderWidth: spacing.strokeWidth,
    borderColor: colors.stroke,
    padding: spacing.elementV,
    gap: spacing.elementH,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: spacing.radius,
  },
  aboutText: {
    flex: 1,
    gap: 4,
  },
  aboutTitle: {
    ...typography.subtitle1,
    color: colors.text,
  },
  aboutDescription: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  aboutChevron: {
    width: 16,
    height: 16,
  },
  footer: {
    ...typography.bodySmall,
    color: colors.disabled,
    textAlign: "center",
    marginTop: spacing.elementV,
  },
  clearCache: {
    ...typography.bodySmall,
    fontFamily: "Figtree_700Bold",
    color: colors.text,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
