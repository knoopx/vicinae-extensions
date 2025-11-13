import { Duration, DurationObjectUnits } from "luxon";

export const formatDuration = (duration: Duration): string => {
  const obj = duration
    .shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds")
    .toObject();

  // Only include non-zero values and format them nicely
  const parts: string[] = [];
  const units = [
    { key: "years", unit: "y" },
    { key: "months", unit: "mo" },
    { key: "weeks", unit: "w" },
    { key: "days", unit: "d" },
    { key: "hours", unit: "h" },
    { key: "minutes", unit: "m" },
    { key: "seconds", unit: "s" },
  ];

  for (const { key, unit } of units) {
    const value = obj[key as keyof DurationObjectUnits] ?? 0;
    const formattedValue =
      key === "seconds" ? Math.round(value) : Math.floor(value);
    if (formattedValue > 0) {
      parts.push(`${formattedValue}${unit}`);
    }
    if (parts.length >= 2) break; // Limit to at most 2 units
  }

  return parts.length > 0 ? parts.join(" ") : "0s";
};
