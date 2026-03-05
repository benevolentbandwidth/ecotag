import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../src/theme";
import {
  listScans,
  listClosetItems,
  searchScans,
  deleteScans,
} from "../../src/storage/scans";
import { ScanRecord } from "../../src/storage/types";
import { GarmentCard } from "../../src/components/GarmentCard";
import { SearchBar } from "../../src/components/SearchBar";
import {
  ViewToggleDropdown,
  ClosetView,
} from "../../src/components/ViewToggleDropdown";

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return diffHrs === 1 ? "<1 hrs" : `${diffHrs} hrs`;
  const diffDays = Math.floor(diffHrs / 24);
  return diffDays === 1 ? "1 day" : `${diffDays} days`;
}

function buildDescription(resultJson: string | null): string {
  if (!resultJson) return "";
  try {
    const data = JSON.parse(resultJson) as {
      parsed?: { materials?: { fiber: string; pct: number }[] };
    };
    const mats = data.parsed?.materials ?? [];
    return mats.map((m) => `${m.pct}% ${m.fiber}`).join(", ");
  } catch {
    return "";
  }
}

export default function ClosetScreen() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<ClosetView>("closet");
  const [items, setItems] = useState<ScanRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    if (searchQuery.trim()) {
      setItems(searchScans(searchQuery, currentView === "closet"));
    } else if (currentView === "closet") {
      setItems(listClosetItems());
    } else {
      setItems(listScans());
    }
  }, [currentView, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      setEditMode(false);
      setCompareMode(false);
      setSelectedIds(new Set());
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    deleteScans([...selectedIds]);
    setSelectedIds(new Set());
    setEditMode(false);
    setCompareMode(false);
    refresh();
  }, [selectedIds, refresh]);

  const handleCancel = useCallback(() => {
    setEditMode(false);
    setCompareMode(false);
    setSelectedIds(new Set());
  }, []);

  const keyExtractor = useCallback((item: ScanRecord) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ScanRecord }) => {
      const co2Kg = item.co2e_grams / 1000;
      return (
        <GarmentCard
          name={item.display_name ?? "Tag scan"}
          type={item.category ?? "Garment"}
          score={co2Kg}
          description={buildDescription(item.result_json)}
          timestamp={formatRelativeTime(item.created_at)}
          editMode={editMode}
          selected={selectedIds.has(item.id)}
          onToggleSelect={() => handleToggleSelect(item.id)}
          onPress={() => {
            if (item.result_json && item.success === 1) {
              router.push({
                pathname: "/results",
                params: {
                  status: "success",
                  data: item.result_json,
                  scanId: item.id,
                },
              });
            }
          }}
        />
      );
    },
    [editMode, selectedIds, handleToggleSelect, router],
  );

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const isClosetEmpty =
    currentView === "closet" && items.length === 0 && !searchQuery.trim();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerRow}>
        <ViewToggleDropdown
          currentView={currentView}
          onChangeView={(view) => {
            setCurrentView(view);
            setEditMode(false);
            setSelectedIds(new Set());
            setSearchQuery("");
          }}
        />
        {items.length > 0 && (
          <Pressable
            style={styles.editButton}
            onPress={() => setEditMode(true)}
          >
            <Text style={styles.editText}>Edit</Text>
            <Ionicons name="pencil" size={16} color={colors.text} />
          </Pressable>
        )}
      </View>

      {!isClosetEmpty && (
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find garments"
          />
        </View>
      )}

      {isClosetEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            You have no items in your closet.
          </Text>
          <Text style={styles.emptySubtitle}>Want to add one?</Text>
          <Pressable
            style={styles.scanButton}
            onPress={() => router.push("/scan")}
          >
            <Text style={styles.scanButtonText}>Scan Garment</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          style={styles.listContainer}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={
            !editMode ? (
              <Pressable
                style={styles.compareButton}
                onPress={() => {
                  setEditMode(true);
                  setCompareMode(true);
                }}
              >
                <Text style={styles.compareButtonText}>Start a Comparison</Text>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={28}
                  color={colors.white}
                />
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptySearch}>No results found</Text>
          }
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews
        />
      )}

      {editMode && (
        <View style={styles.editBar}>
          <Pressable style={styles.editBarButton} onPress={handleCancel}>
            <Ionicons name="ban-outline" size={24} color={colors.destructive} />
            <Text style={styles.editBarLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.editBarButton,
              selectedIds.size < 2 && styles.editBarButtonDisabled,
            ]}
            disabled={selectedIds.size < 2}
            onPress={() => {
              const selectedGarments = items.filter((item) =>
                selectedIds.has(item.id),
              );
              router.push({
                pathname: "/comparison",
                params: {
                  selectedGarments: JSON.stringify(selectedGarments),
                },
              });
            }}
          >
            <Ionicons
              name="git-compare-outline"
              size={24}
              color={selectedIds.size >= 2 ? colors.primary : colors.disabled}
            />
            <Text style={styles.editBarLabel}>Compare</Text>
          </Pressable>
          {!compareMode && (
            <Pressable
              style={[
                styles.editBarButton,
                selectedIds.size === 0 && styles.editBarButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={selectedIds.size === 0}
            >
              <Ionicons
                name="trash-outline"
                size={24}
                color={colors.destructive}
              />
              <Text style={styles.editBarLabel}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  editText: {
    ...typography.link,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.elementV,
    paddingBottom: 40,
  },
  separator: {
    height: spacing.elementV,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screenH,
    gap: 8,
  },
  emptyTitle: {
    ...typography.subtitle1,
    color: colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.disabled,
    textAlign: "center",
  },
  scanButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: spacing.radius,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  scanButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  emptySearch: {
    ...typography.body,
    color: colors.disabled,
    textAlign: "center",
    marginTop: 40,
  },
  compareButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: spacing.elementV,
  },
  compareButtonText: {
    ...typography.subtitle1,
    color: colors.white,
  },
  editBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 110,
    paddingTop: 10,
    paddingHorizontal: spacing.screenH,
  },
  editBarButton: {
    flex: 1,
    maxWidth: 110,
    height: 70,
    backgroundColor: colors.background,
    borderRadius: spacing.radius,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  editBarButtonDisabled: {
    opacity: 0.4,
  },
  editBarLabel: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.28,
    color: colors.text,
    textAlign: "center",
  },
});
