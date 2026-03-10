import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "../src/theme";
import { SkeletonRect } from "../src/components/SkeletonRect";
import { ProgressBar } from "../src/components/ProgressBar";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useMetrics } from "../src/context/MetricsContext";
import {
  consumePendingScanImage,
  NormalizedApiError,
  tagImage,
} from "../src/services/api";

export default function LoadingScreen() {
  const router = useRouter();
  const metrics = useMetrics();
  const started = useRef(false);
  const [brandName, setBrandName] = useState("");
  const [garmentType, setGarmentType] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [shouldAnalyze, setShouldAnalyze] = useState(false);
  const [submittedBrand, setSubmittedBrand] = useState("");
  const [submittedType, setSubmittedType] = useState("");

  const handleStartAnalysis = () => {
    const nextBrand = brandName.trim();
    const nextType = garmentType.trim();
    if (!nextBrand || !nextType) {
      setInputError(
        "Please enter both brand and clothing type before analyzing.",
      );
      return;
    }
    setInputError(null);
    setSubmittedBrand(nextBrand);
    setSubmittedType(nextType);
    setShouldAnalyze(true);
  };

  useEffect(() => {
    if (started.current || !shouldAnalyze) return;
    started.current = true;

    async function run() {
      const imageUri = consumePendingScanImage();
      if (!imageUri) {
        router.replace({
          pathname: "/results",
          params: {
            status: "error",
            errorCode: "MISSING_IMAGE",
            errorMessage: "No image was found to upload.",
          },
        });
        return;
      }

      metrics.mark("uploadStart");
      try {
        const { response, scanId } = await tagImage(
          imageUri,
          submittedBrand,
          submittedType,
        );
        metrics.mark("uploadEnd");
        metrics.logToConsole();
        router.replace({
          pathname: "/results",
          params: {
            status: "success",
            data: JSON.stringify(response),
            scanId,
          },
        });
      } catch (err) {
        const normalized = err as NormalizedApiError;
        console.error("[EcoTag] Upload failed:", {
          error: normalized,
          imageUri,
        });
        metrics.mark("uploadEnd");
        metrics.logToConsole();
        router.replace({
          pathname: "/results",
          params: {
            status: "error",
            errorCode: normalized.code ?? "UNKNOWN",
            errorMessage: normalized.message,
          },
        });
      }
    }

    run();
  }, [metrics, router, shouldAnalyze, submittedBrand, submittedType]);

  if (!shouldAnalyze) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalStage}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Name Garment</Text>
                  <Text style={styles.modalNote}>Saved for 24 hours.</Text>
                </View>
                <Pressable onPress={() => router.replace("/scan")} hitSlop={8}>
                  <Text style={styles.closeLabel}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Brand Name</Text>
              <TextInput
                value={brandName}
                onChangeText={setBrandName}
                style={styles.input}
                placeholder="ex. Gap"
                placeholderTextColor={colors.disabled}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Clothing Type</Text>
              <TextInput
                value={garmentType}
                onChangeText={setGarmentType}
                style={styles.input}
                placeholder="ex. blue jeans, t-shirt, jacket"
                placeholderTextColor={colors.disabled}
                autoCapitalize="words"
                returnKeyType="done"
              />

              {!!inputError && <Text style={styles.inputError}>{inputError}</Text>}

              <PrimaryButton
                label="Save Garment"
                onPress={handleStartAnalysis}
                style={styles.ctaButton}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Analyzing your garment tag...</Text>
        <Text style={styles.summaryText}>
          {submittedBrand} • {submittedType}
        </Text>
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
  modalStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: spacing.radius,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "Figtree_700Bold",
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
  },
  modalNote: {
    fontFamily: "Figtree_400Regular",
    fontSize: 10,
    lineHeight: 14,
    color: colors.disabled,
    fontStyle: "italic",
    marginTop: 2,
  },
  closeLabel: {
    fontFamily: "Figtree_500Medium",
    fontSize: 28,
    lineHeight: 28,
    color: colors.text,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  label: {
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    marginTop: 2,
  },
  input: {
    borderWidth: 0,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: "#E7E7E7",
    marginBottom: 10,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  inputError: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: colors.destructive,
    textAlign: "center",
  },
  summaryText: {
    ...typography.body,
    color: colors.disabled,
  },
  ctaButton: {
    marginTop: 10,
    alignSelf: "center",
    minWidth: 140,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: spacing.elementV,
  },
});
