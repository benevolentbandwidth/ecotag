import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView as ExpoCameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useCameraWarmup } from "../context/CameraWarmupContext";
import { useMetrics } from "../context/MetricsContext";
import { ShutterButton } from "./ShutterButton";
import { colors, typography, spacing } from "../theme";

interface Props {
  onCapture: (base64: string) => void;
}

export function CameraView({ onCapture }: Props) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const { permissionStatus, isWarmedUp } = useCameraWarmup();
  const metrics = useMetrics();

  const handlePickImage = async () => {
    if (capturing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      metrics.mark("captureStart");
      metrics.mark("captureEnd");
      onCapture(result.assets[0].base64);
    }
  };

  if (!isWarmedUp) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Initializing camera...</Text>
      </View>
    );
  }

  if (permissionStatus !== "granted") {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Camera permission is required to scan garment labels.
        </Text>
        <Pressable style={styles.uploadFallback} onPress={handlePickImage}>
          <Ionicons name="images-outline" size={22} color={colors.white} />
          <Text style={styles.uploadFallbackText}>Upload from Library</Text>
        </Pressable>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    metrics.mark("captureStart");

    const photo = await cameraRef.current.takePictureAsync({ base64: true });

    metrics.mark("captureEnd");
    setCapturing(false);

    if (photo?.base64) {
      onCapture(photo.base64);
    }
  };

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => metrics.mark("cameraOpenEnd")}
      />
      <View style={styles.controls}>
        <Pressable style={styles.galleryButton} onPress={handlePickImage}>
          <Ionicons name="images-outline" size={26} color={colors.white} />
        </Pressable>
        <ShutterButton onPress={handleCapture} disabled={capturing} />
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    width: 44,
    height: 44,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.elementV,
  },
  placeholderText: {
    ...typography.body,
    color: colors.disabled,
    textAlign: "center",
    paddingHorizontal: spacing.screenH,
  },
  uploadFallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.iconTextGap,
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  uploadFallbackText: {
    ...typography.button,
    color: colors.white,
  },
});
