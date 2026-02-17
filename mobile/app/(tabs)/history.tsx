import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "../../src/theme";
import { GarmentCard } from "../../src/components/GarmentCard";
import { MOCK_HISTORY } from "../../src/constants/mock";

export default function HistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.heading}>Scan History</Text>
      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <GarmentCard
            name={item.garment_name}
            type={item.garment_type}
            score={item.score}
            description={item.description}
            timestamp={item.timestamp}
            onPress={() => router.push("/results")}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No scans yet. Start scanning!</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    ...typography.h1,
    color: colors.text,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
  },
  list: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
    paddingBottom: 40,
  },
  separator: {
    height: spacing.elementV,
  },
  empty: {
    ...typography.body,
    color: colors.disabled,
    textAlign: "center",
    marginTop: 40,
  },
});
