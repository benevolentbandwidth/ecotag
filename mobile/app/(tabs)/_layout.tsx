import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography } from "../../src/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryMid,
        tabBarInactiveTintColor: colors.text,
        tabBarLabelStyle: {
          fontFamily: typography.bodySmall.fontFamily,
          fontSize: 12,
          letterSpacing: 0.24,
        },
        tabBarStyle: {
          position: "absolute",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 0,
          backgroundColor: colors.background,
          paddingTop: 12,
          height: Platform.OS === "ios" ? 100 : 70,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 1, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: "Your Scans",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="wardrobe-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
