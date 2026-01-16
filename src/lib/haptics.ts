/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API when available
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  selection: 5,
};

/**
 * Trigger haptic feedback on supported devices
 * @param pattern - The intensity/type of haptic feedback
 * @returns boolean indicating if vibration was triggered
 */
export function triggerHaptic(pattern: HapticPattern = 'selection'): boolean {
  // Check if Vibration API is available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      return navigator.vibrate(patterns[pattern]);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Check if haptic feedback is supported on this device
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}
