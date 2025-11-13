import { Color } from "@vicinae/api";

// Vicinae Color values for context colors
const ContextColors: Color[] = [
  Color.Red,
  Color.Orange,
  Color.Yellow,
  Color.Green,
  Color.Blue,
  Color.Purple,
  Color.Red, // duplicate for more variety
  Color.Orange,
];

export function getContextColor(context: string, allContexts: string[]): Color {
  if (!context) return Color.SecondaryText;
  const contextIndex = allContexts.indexOf(context);
  return ContextColors[contextIndex % ContextColors.length];
}

export function getColorForStatus(isCompleted: boolean): Color {
  return isCompleted ? Color.Green : Color.SecondaryText;
}
