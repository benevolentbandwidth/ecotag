import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { G, Path, Defs, ClipPath, Rect } from "react-native-svg";
import { colors, typography, spacing } from "../../src/theme";
import { listScans, searchScans, deleteScans } from "../../src/storage/scans";
import { ScanRecord } from "../../src/storage/types";
import { GarmentCard } from "../../src/components/GarmentCard";
import { SearchBar } from "../../src/components/SearchBar";

// format the relative time for the scan
// if the difference is less than 1 minute, return "Just now"
// if the difference is less than 1 hour, return the number of minutes
// if the difference is less than 24 hours, return the number of hours
// otherwise, return the date in the format of "MM/DD/YYYY"
function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hrs`;
  return new Date(timestamp).toLocaleDateString();
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

const CompareIcon = () => (
  <Svg width={35} height={38} viewBox="0 0 35 38" fill="none">
    <Defs>
      <ClipPath id="clip0">
        <Rect width={19.1935} height={19.1935} />
      </ClipPath>
      <ClipPath id="clip1">
        <Rect width={19.1935} height={19.1935} x={15.8064} y={18.3467} />
      </ClipPath>
    </Defs>
    <G clipPath="url(#clip0)">
      <Path fillRule="evenodd" clipRule="evenodd" d="M7.19753 2.39917C7.35661 2.39917 7.50985 2.46247 7.62234 2.57495C7.73462 2.68736 7.79709 2.83989 7.79714 2.99878C7.79714 3.47595 7.98711 3.9338 8.32449 4.27124C8.66193 4.60868 9.11974 4.79857 9.59695 4.79858C10.0742 4.79858 10.532 4.60869 10.8694 4.27124C11.2068 3.9338 11.3968 3.47597 11.3968 2.99878C11.3968 2.83977 11.4601 2.68739 11.5725 2.57495C11.685 2.46258 11.8374 2.39917 11.9964 2.39917H14.3958C14.4961 2.39978 14.5951 2.42578 14.6829 2.47437L18.5628 4.5896C18.8395 4.73564 19.0472 4.9861 19.1399 5.28491C19.2326 5.58367 19.2032 5.90732 19.0579 6.18433L17.6135 8.94409C17.5086 9.14225 17.3509 9.30751 17.1585 9.42261C16.9657 9.53775 16.7443 9.59798 16.5198 9.59644H14.9954V15.5945C14.9954 15.9126 14.8688 16.2181 14.6438 16.4431C14.4189 16.668 14.1133 16.7947 13.7952 16.7947H5.39871C5.08056 16.7947 4.77504 16.6681 4.55007 16.4431C4.3251 16.2181 4.19851 15.9126 4.19851 15.5945V9.59644H2.6741C2.44975 9.59789 2.229 9.53767 2.0364 9.42261C1.84393 9.30752 1.6863 9.14226 1.58132 8.94409L0.136987 6.18433C-0.00840305 5.90741 -0.0385721 5.58366 0.0539788 5.28491C0.146599 4.98611 0.354546 4.73577 0.631127 4.5896L4.51101 2.47437C4.59912 2.42564 4.69841 2.39959 4.7991 2.39917H7.19753Z" fill="#FAFAFA" />
    </G>
    <Path d="M27.9871 17.7124L25.288 15.0133C25.2036 14.9289 25.1562 14.8145 25.1562 14.6951C25.1562 14.5757 25.2036 14.4612 25.288 14.3768C25.3724 14.2924 25.4869 14.245 25.6063 14.245C25.7257 14.245 25.8402 14.2924 25.9246 14.3768L27.8556 16.3083L27.8555 11.996C27.8541 10.6841 27.3322 9.4263 26.4046 8.49863C25.4769 7.57095 24.2191 7.04914 22.9072 7.04765C22.7879 7.04765 22.6735 7.00025 22.5891 6.91589C22.5048 6.83153 22.4574 6.71711 22.4574 6.5978C22.4574 6.47849 22.5048 6.36407 22.5891 6.27971C22.6735 6.19534 22.7879 6.14795 22.9072 6.14795C24.4577 6.14959 25.9442 6.76624 27.0406 7.86261C28.137 8.95897 28.7536 10.4455 28.7552 11.996L28.7552 16.3083L30.6862 14.3768C30.728 14.335 30.7776 14.3019 30.8322 14.2792C30.8869 14.2566 30.9454 14.245 31.0045 14.245C31.0636 14.245 31.1221 14.2566 31.1767 14.2792C31.2313 14.3019 31.281 14.335 31.3228 14.3768C31.4072 14.4612 31.4546 14.5757 31.4546 14.6951C31.4546 14.7542 31.4429 14.8127 31.4203 14.8673C31.3977 14.9219 31.3646 14.9715 31.3228 15.0133L28.6237 17.7124C28.5819 17.7543 28.5323 17.7874 28.4777 17.8101C28.4231 17.8327 28.3645 17.8444 28.3054 17.8444C28.2463 17.8444 28.1877 17.8327 28.1331 17.8101C28.0785 17.7874 28.0289 17.7543 27.9871 17.7124Z" fill="#FAFAFA" />
    <Path d="M8.42425 18.6987L11.1233 21.3978C11.2077 21.4822 11.2552 21.5967 11.2552 21.7161C11.2552 21.8354 11.2077 21.9499 11.1233 22.0343C11.0389 22.1187 10.9244 22.1662 10.8051 22.1662C10.6857 22.1662 10.5712 22.1187 10.4868 22.0343L8.55583 20.1028L8.55583 24.4151C8.55732 25.7271 9.07913 26.9848 10.0068 27.9125C10.9345 28.8402 12.1922 29.362 13.5042 29.3635C13.6235 29.3635 13.7379 29.4109 13.8223 29.4952C13.9066 29.5796 13.954 29.694 13.954 29.8133C13.954 29.9326 13.9066 30.0471 13.8223 30.1314C13.7379 30.2158 13.6235 30.2632 13.5042 30.2632C11.9537 30.2615 10.4672 29.6449 9.37079 28.5485C8.27442 27.4522 7.65777 25.9656 7.65613 24.4151L7.65613 20.1028L5.72515 22.0343C5.68336 22.0761 5.63374 22.1093 5.57913 22.1319C5.52452 22.1545 5.46599 22.1662 5.40689 22.1662C5.34778 22.1662 5.28925 22.1545 5.23464 22.1319C5.18003 22.1093 5.13041 22.0761 5.08862 22.0343C5.00421 21.9499 4.95679 21.8354 4.95679 21.7161C4.95679 21.6569 4.96843 21.5984 4.99105 21.5438C5.01367 21.4892 5.04682 21.4396 5.08862 21.3978L7.78771 18.6987C7.82949 18.6569 7.8791 18.6237 7.93371 18.6011C7.98832 18.5784 8.04686 18.5668 8.10598 18.5668C8.1651 18.5668 8.22363 18.5784 8.27824 18.6011C8.33285 18.6237 8.38247 18.6569 8.42425 18.6987Z" fill="#FAFAFA" />
    <G clipPath="url(#clip1)">
      <Path fillRule="evenodd" clipRule="evenodd" d="M23.0039 20.7458C23.163 20.7458 23.3162 20.8091 23.4287 20.9216C23.541 21.0341 23.6045 21.1866 23.6045 21.3455C23.6045 21.8226 23.7935 22.2805 24.1309 22.6179C24.4683 22.9553 24.9261 23.1452 25.4033 23.1453C25.8806 23.1453 26.3383 22.9554 26.6758 22.6179C27.0132 22.2805 27.2031 21.8227 27.2031 21.3455C27.2032 21.1864 27.2665 21.0341 27.3789 20.9216C27.4914 20.8092 27.6437 20.7458 27.8027 20.7458H30.2022C30.3025 20.7464 30.4014 20.7724 30.4893 20.821L34.3701 22.9363C34.6467 23.0823 34.8536 23.3329 34.9463 23.6316C35.039 23.9304 35.0096 24.254 34.8643 24.531L33.4199 27.2908C33.315 27.4889 33.1573 27.6542 32.9649 27.7693C32.7721 27.8844 32.5507 27.9447 32.3262 27.9431H30.8018V33.9412C30.8018 34.2593 30.6752 34.5648 30.4502 34.7898C30.2253 35.0147 29.9197 35.1414 29.6016 35.1414H21.2051C20.8869 35.1414 20.5814 35.0148 20.3565 34.7898C20.1315 34.5648 20.0049 34.2593 20.0049 33.9412V27.9431H18.4815C18.257 27.9447 18.0355 27.8844 17.8428 27.7693C17.6503 27.6542 17.4927 27.4889 17.3877 27.2908L15.9434 24.531C15.798 24.2541 15.7678 23.9303 15.8604 23.6316C15.953 23.3328 16.1609 23.0824 16.4375 22.9363L20.3174 20.821C20.4055 20.7723 20.5048 20.7463 20.6055 20.7458H23.0039Z" fill="#FAFAFA" />
    </G>
  </Svg>
);

function computeEcoRating(
  resultJson: string | null,
): { label: string; color: string; bgColor: string; score: number } | undefined {
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
    const score = Math.round(
      Math.max(0, Math.min(100, (1 - total / (2 * benchmark)) * 100)),
    );
    if (score < 40) return { label: "Poor", color: "#F2614E", bgColor: "#FFAFA480", score };
    if (score < 60) return { label: "Average", color: "#F5A623", bgColor: "#FEEFBC", score };
    return { label: "Good", color: "#17412D", bgColor: "#71D56180", score };
  } catch {
    return undefined;
  }
}

export default function ClosetScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ScanRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    if (searchQuery.trim()) {
      setItems(searchScans(searchQuery, false));
    } else {
      setItems(listScans());
    }
  }, [searchQuery]);

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
      const rating = computeEcoRating(item.result_json);
      const description = `This garment emits ${Math.round(co2Kg)} kg of carbon dioxide.`;
      return (
        <GarmentCard
          name={item.display_name ?? "Tag scan"}
          type={item.category ?? "Garment"}
          co2Kg={Math.round(co2Kg)}
          description={description}
          timestamp={formatRelativeTime(item.created_at)}
          rating={rating}
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
                  displayName: item.display_name ?? "",
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

  const isScansEmpty = items.length === 0 && !searchQuery.trim();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recents</Text>
        {items.length > 0 && (
          <Pressable
            style={styles.editButton}
            onPress={() => setEditMode(true)}
          >
            <Text style={styles.editButtonLabel}>Edit</Text>
            <Ionicons name="pencil" size={16} color={colors.text} />
          </Pressable>
        )}
      </View>

      {!isScansEmpty && (
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find garments"
          />
        </View>
      )}

      {isScansEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>You have no scans.</Text>
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
                <CompareIcon />
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
  title: {
    ...typography.h1,
    color: colors.text,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonLabel: {
    ...typography.subtitle2,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.screenH,
    paddingTop: 30,
    paddingBottom: spacing.elementV,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.screenH,
    paddingTop: 0,
    paddingBottom: 120,
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
    height: 71,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: spacing.elementV,
    marginBottom: spacing.elementV,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  compareButtonText: {
    fontFamily: "Figtree_700Bold",
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.32,
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