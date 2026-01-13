import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Flame,
  AlertTriangle,
  Zap,
  Target,
  Heart,
  type LucideIcon 
} from "lucide-react";

export interface AlertTypeConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  description: string;
  category: "sentiment" | "volume" | "emotion";
  needsThreshold: boolean;
  defaultThreshold?: number;
  thresholdLabel?: string;
  thresholdMax?: number;
}

// Sentiment-based alerts
export const SENTIMENT_ALERT_TYPES: AlertTypeConfig[] = [
  { 
    value: "sentiment_spike", 
    label: "Sentiment Spike", 
    icon: TrendingUp, 
    description: "Alert when sentiment rises sharply",
    category: "sentiment",
    needsThreshold: false,
  },
  { 
    value: "sentiment_drop", 
    label: "Sentiment Drop", 
    icon: TrendingDown, 
    description: "Alert when sentiment falls sharply",
    category: "sentiment",
    needsThreshold: false,
  },
  { 
    value: "bullish_threshold", 
    label: "Bullish Threshold", 
    icon: TrendingUp, 
    description: "Alert when bullish % exceeds threshold",
    category: "sentiment",
    needsThreshold: true,
    defaultThreshold: 70,
    thresholdLabel: "Bullish % Threshold",
    thresholdMax: 100,
  },
  { 
    value: "bearish_threshold", 
    label: "Bearish Threshold", 
    icon: TrendingDown, 
    description: "Alert when bearish % exceeds threshold",
    category: "sentiment",
    needsThreshold: true,
    defaultThreshold: 70,
    thresholdLabel: "Bearish % Threshold",
    thresholdMax: 100,
  },
];

// Volume-based alerts
export const VOLUME_ALERT_TYPES: AlertTypeConfig[] = [
  { 
    value: "volume_surge", 
    label: "Volume Surge", 
    icon: Activity, 
    description: "Alert when message volume spikes above average",
    category: "volume",
    needsThreshold: true,
    defaultThreshold: 200,
    thresholdLabel: "Volume % Above Average",
    thresholdMax: 1000,
  },
];

// Emotion-based alerts (new trading signal emotions)
export const EMOTION_ALERT_TYPES: AlertTypeConfig[] = [
  { 
    value: "fomo_surge", 
    label: "FOMO Surge", 
    icon: Flame, 
    description: "Alert when FOMO emotion spikes - potential top signal",
    category: "emotion",
    needsThreshold: true,
    defaultThreshold: 25,
    thresholdLabel: "FOMO Score Threshold",
    thresholdMax: 100,
  },
  { 
    value: "greed_surge", 
    label: "Greed Surge", 
    icon: Target, 
    description: "Alert when Greed emotion spikes - overbought signal",
    category: "emotion",
    needsThreshold: true,
    defaultThreshold: 25,
    thresholdLabel: "Greed Score Threshold",
    thresholdMax: 100,
  },
  { 
    value: "fear_spike", 
    label: "Fear Spike", 
    icon: AlertTriangle, 
    description: "Alert when Fear emotion surges - potential panic",
    category: "emotion",
    needsThreshold: true,
    defaultThreshold: 30,
    thresholdLabel: "Fear Score Threshold",
    thresholdMax: 100,
  },
  { 
    value: "capitulation_signal", 
    label: "Capitulation Signal", 
    icon: Heart, 
    description: "Alert when Capitulation detected - potential bottom",
    category: "emotion",
    needsThreshold: true,
    defaultThreshold: 15,
    thresholdLabel: "Capitulation Score Threshold",
    thresholdMax: 100,
  },
  { 
    value: "euphoria_extreme", 
    label: "Euphoria Extreme", 
    icon: Zap, 
    description: "Alert when Euphoria peaks - potential reversal",
    category: "emotion",
    needsThreshold: true,
    defaultThreshold: 20,
    thresholdLabel: "Euphoria Score Threshold",
    thresholdMax: 100,
  },
];

// Combined list of all alert types
export const ALL_ALERT_TYPES: AlertTypeConfig[] = [
  ...SENTIMENT_ALERT_TYPES,
  ...VOLUME_ALERT_TYPES,
  ...EMOTION_ALERT_TYPES,
];

// Helper functions
export function getAlertTypeConfig(type: string): AlertTypeConfig | undefined {
  return ALL_ALERT_TYPES.find((t) => t.value === type);
}

export function getAlertTypeLabel(type: string): string {
  return getAlertTypeConfig(type)?.label || type;
}

export function getAlertTypeIcon(type: string): LucideIcon {
  return getAlertTypeConfig(type)?.icon || Activity;
}

export function isEmotionAlert(type: string): boolean {
  return EMOTION_ALERT_TYPES.some((t) => t.value === type);
}

export function needsThreshold(type: string): boolean {
  return getAlertTypeConfig(type)?.needsThreshold || false;
}

export function getDefaultThreshold(type: string): number {
  return getAlertTypeConfig(type)?.defaultThreshold || 50;
}

// Categorized for UI grouping
export const ALERT_CATEGORIES = [
  { id: "sentiment", label: "Sentiment Alerts", types: SENTIMENT_ALERT_TYPES },
  { id: "volume", label: "Volume Alerts", types: VOLUME_ALERT_TYPES },
  { id: "emotion", label: "Emotion Alerts", types: EMOTION_ALERT_TYPES },
] as const;
