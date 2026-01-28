/**
 * Shared design constants for chart components
 * Centralizes values to ensure visual consistency across all charts
 */

// Side panel dimensions (desktop)
export const CHART_SIDE_PANEL = {
  /** Desktop width in pixels */
  WIDTH: 343,
  /** Desktop width as CSS class */
  WIDTH_CLASS: 'w-[343px]',
} as const;

// Mobile side panel uses calc-based responsive width
export const CHART_SIDE_PANEL_MOBILE = {
  /** Mobile width calculation */
  WIDTH_CLASS: 'w-[calc(100%-10px)]',
  /** Mobile horizontal margin */
  MARGIN_CLASS: 'mx-[5px]',
} as const;
