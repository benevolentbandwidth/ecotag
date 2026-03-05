import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, typography } from "../theme";

function TreeIcon({ size = 107 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 107 107" fill="none">
      <Path
        d="M53.5 82.0947C54.7255 82.9107 56.0019 83.6476 57.3214 84.301V103.179C57.3214 104.193 56.9188 105.164 56.2021 105.881C55.4855 106.597 54.5135 107 53.5 107C52.4865 107 51.5145 106.597 50.7978 105.881C50.0812 105.164 49.6786 104.193 49.6786 103.179V84.301C50.998 83.6476 52.2744 82.9107 53.5 82.0947ZM86.9852 22.2741C84.2208 15.6752 79.5674 10.0403 73.6098 6.07731C67.6521 2.11432 60.6558 0 53.5 0C46.3441 0 39.3479 2.11432 33.3902 6.07731C27.4325 10.0403 22.7792 15.6752 20.0148 22.2741C14.0448 25.0022 8.98456 29.3877 5.43626 34.9088C1.88796 40.4298 0.00105448 46.8539 0.000111307 53.4165C-0.0476564 71.6597 15.2858 87.4196 33.5044 87.8972C39.1079 88.0299 44.6594 86.7956 49.6786 84.301V67.3329L28.8614 56.9314C27.9543 56.478 27.2645 55.6829 26.9438 54.721C26.6231 53.7591 26.6978 52.7092 27.1513 51.8023C27.6048 50.8954 28.4001 50.2058 29.3623 49.8852C30.3244 49.5646 31.3745 49.6392 32.2816 50.0926L49.6786 58.794V34.4092C49.6786 33.3959 50.0812 32.4241 50.7978 31.7076C51.5145 30.9911 52.4865 30.5886 53.5 30.5886C54.5135 30.5886 55.4855 30.9911 56.2021 31.7076C56.9188 32.4241 57.3214 33.3959 57.3214 34.4092V47.3322L74.7184 38.6309C75.1676 38.4064 75.6565 38.2725 76.1574 38.2369C76.6583 38.2013 77.1613 38.2647 77.6377 38.4235C78.1141 38.5822 78.5545 38.8333 78.9339 39.1622C79.3133 39.4911 79.6241 39.8916 79.8487 40.3406C80.0732 40.7896 80.2072 41.2785 80.2428 41.7793C80.2783 42.2801 80.2149 42.783 80.0561 43.2592C79.8973 43.7355 79.6463 44.1759 79.3173 44.5552C78.9882 44.9344 78.5877 45.2452 78.1386 45.4697L57.3214 55.8712V84.301C62.0721 86.6594 67.303 87.8901 72.6071 87.8972H73.4765C91.7142 87.4196 107.052 71.6597 107 53.4165C106.999 46.8539 105.112 40.4298 101.564 34.9088C98.0154 29.3877 92.9552 25.0022 86.9852 22.2741Z"
        fill={colors.primary}
      />
    </Svg>
  );
}

interface Props {
  totalKgCO2e: number;
}

export function CO2Gauge({ totalKgCO2e }: Props) {
  const display =
    totalKgCO2e >= 1
      ? `${Math.round(totalKgCO2e)} kg`
      : `${(totalKgCO2e * 1000).toFixed(0)} g`;

  return (
    <View style={styles.container}>
      <View style={styles.textColumn}>
        <Text style={styles.value}>{display}</Text>
        <Text style={styles.label}>Carbon Dioxide Equivalent</Text>
      </View>
      <TreeIcon size={107} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  textColumn: {
    gap: 5,
    alignItems: "center",
  },
  value: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 48,
    lineHeight: 60,
    letterSpacing: 0.96,
    color: colors.text,
  },
  label: {
    ...typography.body,
    color: colors.text,
    letterSpacing: 0.28,
  },
});
