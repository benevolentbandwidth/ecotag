import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme";
import { MetricsProvider } from "../src/context/MetricsContext";
import { CameraWarmupProvider } from "../src/context/CameraWarmupContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <MetricsProvider>
      <CameraWarmupProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="results" />
          <Stack.Screen name="loading" />
        </Stack>
      </CameraWarmupProvider>
    </MetricsProvider>
  );
}
