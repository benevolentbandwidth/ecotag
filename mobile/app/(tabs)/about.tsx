import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "../../src/theme";

const PRINCIPLES = [
  {
    label: "Problem First",
    body: "We build useful tools that are practical, usable, easy to adopt. We start with the problem not the solution or technology",
  },
  {
    label: "Public Benefit:",
    body: "We use AI for public benefit, prioritizing safety over speed, focus on fairness, and real-world positive impact on humans",
  },
  {
    label: "Neutrality",
    body: "We are neutral. We do not support any political positions, candidates, agendas, or ideologies",
  },
  {
    label: "Inclusive Community",
    body: "We are an open and inclusive community. We are open to anyone who wants to contribute. We provide support and stand on each other's shoulders"
  },
  {
    label: "Privacy Non-negotiable:",
    body: "We never collect personal data, no tracking, and we never sell or share data",
  },
    {
    label: "Open Source by Default:",
    body: "Code, docs, and decisions are transparent",
  },
    {
    label: "Humble & Curious:",
    body: "We are humble, love learning and are genuinely curious. We invite feedback, own mistakes, and pivot when evidence points to a new direction",
  },
    {
    label: "Source Ideas Anywhere:",
    body: "We source ideas from anywhere as long as it adheres to the principles above",
  },
];

export default function AboutScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>About Us</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* WHO WE ARE */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHO WE ARE</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.orgTitle}>
                The Benevolent Bandwidth Foundation (b2)
              </Text>
              <Text style={styles.body}>
                A global community building safe, open-source AI tools for
                public good.
              </Text>
            </View>
            <Image
              source={require("../../assets/images/landing_page/b2_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* OUR MISSION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OUR MISSION</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>
            We solve problems with tech and AI that deliver public benefit,
            prioritize safety and fairness, without collecting any personal user
            data.
          </Text>
          <Text style={styles.body}>
            We envision a future where AI serves all of humanity through an open
            ecosystem of trustworthy tools that improve real lives.
          </Text>
        </View>

        {/* OUR PRINCIPLES */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OUR PRINCIPLES</Text>
          <View style={styles.divider} />
          {/* Placeholder principle items — add real content here */}
          {PRINCIPLES.map((principle, index) => {
            const isOpen = expanded === principle.label;
            return (
              <Pressable
                key={index}
                style={styles.principleCard}
                onPress={() => setExpanded(isOpen ? null : principle.label)}
              >
                <View style={styles.principleCardInner}>
                  <View style={styles.principleCardTop}>
                    <Text style={styles.principleLabel}>{principle.label}</Text>
                    <Text style={styles.principleIcon}>
                      {isOpen ? "−" : "+"}
                    </Text>
                  </View>
                  {isOpen && (
                    <Text style={styles.principleBody}>{principle.body}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
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
    paddingBottom: 120,
    gap: spacing.elementV * 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.elementV,
  },
  backButton: {
    width: 24,
  },
  backText: {
    fontSize: 32,
    color: colors.text,
    lineHeight: 36,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  headerSpacer: {
    width: 24,
  },
  section: {
    gap: spacing.elementV,
  },
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.text,
    letterSpacing: 0.8,
  },
  divider: {
    height: 2,
    width: 40,
    backgroundColor: colors.text,
    marginTop: -spacing.elementV / 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.elementH,
  },
  rowText: {
    flex: 1,
    gap: spacing.elementV,
  },
  orgTitle: {
    ...typography.h2,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  logo: {
    width: 80,
    height: 80,
  },
  principleCard: {
    borderWidth: spacing.strokeWidth,
    borderColor: colors.primaryMid,
    borderRadius: spacing.radius,
    paddingVertical: 14,
    paddingHorizontal: spacing.elementV,
    backgroundColor: colors.white,
  },
  principleCardInner: {
    gap: spacing.elementV,
  },
  principleCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  principleLabel: {
    ...typography.subtitle1,
    color: colors.text,
  },
  principleIcon: {
    ...typography.h2,
    color: colors.text,
  },
  principleBody: {
    ...typography.body,
    color: colors.text,
  },
});
