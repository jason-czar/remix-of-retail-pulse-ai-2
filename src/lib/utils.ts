import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Severity color scale (0-100%) - 9 levels from green to red-orange
 * Used for Readiness, Risk, Confidence scores
 */
export type SeverityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SeverityInfo {
  level: SeverityLevel;
  label: string;
  textClass: string;
  bgClass: string;
  hsl: string;
}

const SEVERITY_SCALE: SeverityInfo[] = [
  { level: 1, label: "Very Low",    textClass: "text-severity-1", bgClass: "bg-severity-1", hsl: "122 100% 39%" },
  { level: 2, label: "Low",         textClass: "text-severity-2", bgClass: "bg-severity-2", hsl: "105 100% 41%" },
  { level: 3, label: "Elevated",    textClass: "text-severity-3", bgClass: "bg-severity-3", hsl: "89 100% 42%" },
  { level: 4, label: "Moderate",    textClass: "text-severity-4", bgClass: "bg-severity-4", hsl: "68 100% 45%" },
  { level: 5, label: "Heightened",  textClass: "text-severity-5", bgClass: "bg-severity-5", hsl: "62 100% 45%" },
  { level: 6, label: "High",        textClass: "text-severity-6", bgClass: "bg-severity-6", hsl: "46 100% 47%" },
  { level: 7, label: "Very High",   textClass: "text-severity-7", bgClass: "bg-severity-7", hsl: "35 100% 48%" },
  { level: 8, label: "Critical",    textClass: "text-severity-8", bgClass: "bg-severity-8", hsl: "24 100% 49%" },
  { level: 9, label: "Extreme",     textClass: "text-severity-9", bgClass: "bg-severity-9", hsl: "19 100% 50%" },
];

/**
 * Get severity info based on a score (0-100)
 * Score ranges: 0-10, 10-25, 25-40, 40-55, 55-65, 65-75, 75-85, 85-95, 95-100
 */
export function getSeverityFromScore(score: number): SeverityInfo {
  if (score <= 10) return SEVERITY_SCALE[0];
  if (score <= 25) return SEVERITY_SCALE[1];
  if (score <= 40) return SEVERITY_SCALE[2];
  if (score <= 55) return SEVERITY_SCALE[3];
  if (score <= 65) return SEVERITY_SCALE[4];
  if (score <= 75) return SEVERITY_SCALE[5];
  if (score <= 85) return SEVERITY_SCALE[6];
  if (score <= 95) return SEVERITY_SCALE[7];
  return SEVERITY_SCALE[8];
}

/**
 * Get severity color class for "readiness" type scores
 * Higher score = better (green), Lower score = worse (red)
 */
export function getReadinessSeverity(score: number): SeverityInfo {
  // Invert: high readiness = low severity (green)
  return getSeverityFromScore(100 - score);
}

/**
 * Get severity color class for "risk" type scores
 * Higher score = worse (red), Lower score = better (green)
 */
export function getRiskSeverity(score: number): SeverityInfo {
  return getSeverityFromScore(score);
}

/**
 * Get severity color class for "confidence" type scores
 * Higher score = better (green), Lower score = worse (red)
 */
export function getConfidenceSeverity(score: number): SeverityInfo {
  // Invert: high confidence = low severity (green)
  return getSeverityFromScore(100 - score);
}
