import { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  h1: {
    fontFamily: "Figtree_700Bold",
    fontSize: 24,
    lineHeight: 32,
  },
  h2: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 20,
    lineHeight: 28,
  },
  subtitle1: {
    fontFamily: "Figtree_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  subtitle2: {
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
};
