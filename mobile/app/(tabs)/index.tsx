import React, { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "../../src/theme";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { InfoCard } from "../../src/components/InfoCard";
import { listScans } from "../../src/storage/scans";
import { ScanRecord } from "../../src/storage/types";
import { clearCache } from "../../src/storage/imageCache";

const ScanIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
    <Path d="M26 1.08333V6.5C26 6.78732 25.8859 7.06287 25.6827 7.26603C25.4795 7.4692 25.204 7.58333 24.9167 7.58333C24.6293 7.58333 24.3538 7.4692 24.1506 7.26603C23.9475 7.06287 23.8333 6.78732 23.8333 6.5V2.16667H19.5C19.2127 2.16667 18.9371 2.05253 18.734 1.84937C18.5308 1.6462 18.4167 1.37065 18.4167 1.08333C18.4167 0.796016 18.5308 0.520466 18.734 0.317301C18.9371 0.114137 19.2127 0 19.5 0H24.9167C25.204 0 25.4795 0.114137 25.6827 0.317301C25.8859 0.520466 26 0.796016 26 1.08333ZM6.5 23.8333H2.16667V19.5C2.16667 19.2127 2.05253 18.9371 1.84937 18.734C1.6462 18.5308 1.37065 18.4167 1.08333 18.4167C0.796016 18.4167 0.520466 18.5308 0.317301 18.734C0.114137 18.9371 0 19.2127 0 19.5V24.9167C0 25.204 0.114137 25.4795 0.317301 25.6827C0.520466 25.8859 0.796016 26 1.08333 26H6.5C6.78732 26 7.06287 25.8859 7.26603 25.6827C7.4692 25.4795 7.58333 25.204 7.58333 24.9167C7.58333 24.6293 7.4692 24.3538 7.26603 24.1506C7.06287 23.9475 6.78732 23.8333 6.5 23.8333ZM24.9167 18.4167C24.6293 18.4167 24.3538 18.5308 24.1506 18.734C23.9475 18.9371 23.8333 19.2127 23.8333 19.5V23.8333H19.5C19.2127 23.8333 18.9371 23.9475 18.734 24.1506C18.5308 24.3538 18.4167 24.6293 18.4167 24.9167C18.4167 25.204 18.5308 25.4795 18.734 25.6827C18.9371 25.8859 19.2127 26 19.5 26H24.9167C25.204 26 25.4795 25.8859 25.6827 25.6827C25.8859 25.4795 26 25.204 26 24.9167V19.5C26 19.2127 25.8859 18.9371 25.6827 18.734C25.4795 18.5308 25.204 18.4167 24.9167 18.4167ZM1.08333 7.58333C1.37065 7.58333 1.6462 7.4692 1.84937 7.26603C2.05253 7.06287 2.16667 6.78732 2.16667 6.5V2.16667H6.5C6.78732 2.16667 7.06287 2.05253 7.26603 1.84937C7.4692 1.6462 7.58333 1.37065 7.58333 1.08333C7.58333 0.796016 7.4692 0.520466 7.26603 0.317301C7.06287 0.114137 6.78732 0 6.5 0H1.08333C0.796016 0 0.520466 0.114137 0.317301 0.317301C0.114137 0.520466 0 0.796016 0 1.08333V6.5C0 6.78732 0.114137 7.06287 0.317301 7.26603C0.520466 7.4692 0.796016 7.58333 1.08333 7.58333ZM5.41667 6.5V19.5C5.41667 19.7873 5.5308 20.0629 5.73397 20.266C5.93713 20.4692 6.21268 20.5833 6.5 20.5833H19.5C19.7873 20.5833 20.0629 20.4692 20.266 20.266C20.4692 20.0629 20.5833 19.7873 20.5833 19.5V6.5C20.5833 6.21268 20.4692 5.93713 20.266 5.73397C20.0629 5.5308 19.7873 5.41667 19.5 5.41667H6.5C6.21268 5.41667 5.93713 5.5308 5.73397 5.73397C5.5308 5.93713 5.41667 6.21268 5.41667 6.5Z" fill="#FAFAFA" />
  </Svg>
);

// compute the eco rating for the scan result
// if the score is less than 40, return "Poor"
// if the score is less than 60, return "Average"
// otherwise, return "Good"
function computeEcoRating(
  resultJson: string | null,
): { label: string; color: string; bgColor: string } | undefined {
  if (!resultJson) return undefined;
  try {
    const data = JSON.parse(resultJson) as {
      emissions?: { total_kgco2e: number };
      benchmark_kgco2e?: number;
      benchmark?: { benchmark_kgco2e?: number };
    };
    const total = data.emissions?.total_kgco2e;
    const benchmark = data.benchmark_kgco2e ?? data.benchmark?.benchmark_kgco2e;
    if (total == null || !benchmark) return undefined;
    const score = Math.round(Math.max(0, Math.min(100, (1 - total / (2 * benchmark)) * 100)));
    if (score < 40) return { label: "Poor", color: "#F2614E", bgColor: "#FFAFA480" };
    if (score < 60) return { label: "Average", color: "#F5A623", bgColor: "#FEEFBC" };
    return { label: "Good", color: "#17412D", bgColor: "#71D56180" };
  } catch {
    return undefined;
  }
}

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
          rightNode={<ScanIcon />}
          onPress={() => router.push("/scan")}
          style={styles.scanButton}
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
              const rating = computeEcoRating(scan.result_json);
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
                  <View style={styles.scanCardLeft}>
                    <View style={styles.scanCardMeta}>
                      <Text style={styles.scanName}>{scan.display_name ?? "Tag scan"}</Text>
                      <Text style={styles.scanCategory}>{scan.category ? scan.category.toUpperCase() : "GARMENT"}</Text>
                    </View>
                    <Text style={styles.scanDescription} numberOfLines={2}>{description}</Text>
                  </View>
                  <View style={styles.scanCardRight}>
                    <View style={styles.scanBadge}>
                      <Text style={styles.scanBadgeText}>{totalKg} kg</Text>
                    </View>
                    {rating && (
                      <View style={[styles.ratingPill, { backgroundColor: rating.bgColor }]}>
                        <Text style={[styles.ratingText, { color: rating.color }]}>{rating.label}</Text>
                      </View>
                    )}
                    <Text style={styles.scanDate}>{when}</Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.viewAllWrapper}>
              <PrimaryButton label="View All" onPress={() => router.push("/closet")} style={styles.viewAllButton} />
            </View>
          </>
        )}
        <View style={styles.footerSection}>
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
        </View>
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
    paddingBottom: 100,
    gap: spacing.elementV,
    flexGrow: 1,
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
    flexDirection: "row",
    borderRadius: spacing.radius,
    backgroundColor: colors.white,
    padding: spacing.elementV,
    gap: spacing.elementH,
    height: 125,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  scanCardLeft: {
    flex: 1,
    justifyContent: "space-between",
  },
  scanCardMeta: {
    gap: 2,
  },
  scanCardRight: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanName: {
    ...typography.h2,
    color: colors.text,
  },
  scanBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  scanBadgeText: {
    fontFamily: "Figtree_700Bold",
    fontSize: 20,
    lineHeight: 26,
    color: colors.white,
  },
  scanCategory: {
    ...typography.subtitle1,
    color: colors.disabled,
  },
  scanDescription: {
    ...typography.body,
    color: colors.text,
  },
  scanDate: {
    ...typography.bodySmall,
    color: colors.disabled,
  },
  ratingPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ratingText: {
    ...typography.bodySmall,
    fontWeight: "600",
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
  footerSection: {
    marginTop: "auto",
    gap: spacing.elementV,
    alignItems: "center",
  },
  footer: {
    ...typography.bodySmall,
    color: colors.disabled,
    textAlign: "center",
  },
  clearCache: {
    ...typography.body,
    fontFamily: "Figtree_400Regular",
    color: colors.primaryMid,
    textAlign: "center",
    textDecorationLine: "underline",
    marginBottom: 15,
  },
  scanButton: {
    height: 71,
    justifyContent: "center",
  },
  viewAllWrapper: {
    alignItems: "center",
  },
  viewAllButton: {
    width: 200,
    height: 50,
  },
});
