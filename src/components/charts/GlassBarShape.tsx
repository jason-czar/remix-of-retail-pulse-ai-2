import { Rectangle } from "recharts";

interface GlassBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  radius?: number | [number, number, number, number];
  payload?: any;
  is5MinView?: boolean;
  activeHour?: number | null;
  isHourStart?: boolean;
  slotsPerHour?: number;
  baseOpacity?: number;
  hoverOpacity?: number;
  index?: number;
}

/**
 * Liquid Glass Bar Shape for Recharts
 * Provides a consistent glass effect across all chart bars with:
 * - Semi-transparent fill with increased opacity on hover
 * - Subtle border for glass edge effect
 * - Smooth transitions between states
 */
export function GlassBarShape(props: GlassBarShapeProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = "hsl(142 71% 45%)",
    radius = [4, 4, 0, 0],
    payload,
    is5MinView = false,
    activeHour = null,
    slotsPerHour = 12,
    baseOpacity = 0.35,
    hoverOpacity = 0.65,
  } = props;

  // Determine if this bar is active/hovered
  const isHourActive = activeHour !== null && payload?.hourIndex === activeHour;
  const opacity = isHourActive ? hoverOpacity : baseOpacity;

  // Glass effect styles
  const glassStyle: React.CSSProperties = {
    transition: 'fill-opacity 0.2s ease-out, stroke-opacity 0.2s ease-out',
    filter: 'saturate(1.1)',
  };

  // In 5-min view, expand bar width to cover all slots (full hour)
  if (is5MinView) {
    if (!payload?.isHourStart || height === 0) {
      return null;
    }
    const expandedWidth = width * slotsPerHour;
    
    return (
      <g>
        {/* Glass bar with stroke border for liquid glass effect */}
        <Rectangle
          x={x}
          y={y}
          width={expandedWidth}
          height={height}
          fill={fill}
          fillOpacity={opacity}
          stroke={fill}
          strokeOpacity={isHourActive ? 0.8 : 0.5}
          strokeWidth={1}
          radius={radius}
          style={glassStyle}
        />
        {/* Inner highlight for glass effect */}
        <Rectangle
          x={x + 1}
          y={y + 1}
          width={Math.max(0, expandedWidth - 2)}
          height={Math.max(0, height * 0.15)}
          fill="white"
          fillOpacity={0.12}
          radius={[radius[0] - 1, radius[1] - 1, 0, 0] as [number, number, number, number]}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  }

  // Normal rendering for non-5-min views
  if (height <= 0) return null;

  return (
    <g>
      {/* Glass bar with stroke border */}
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={opacity}
        stroke={fill}
        strokeOpacity={isHourActive ? 0.8 : 0.5}
        strokeWidth={1}
        radius={radius}
        style={glassStyle}
      />
      {/* Inner highlight for glass effect */}
      <Rectangle
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, Math.min(height * 0.15, 6))}
        fill="white"
        fillOpacity={0.1}
        radius={[Math.max(0, (Array.isArray(radius) ? radius[0] : radius) - 1), Math.max(0, (Array.isArray(radius) ? radius[1] : radius) - 1), 0, 0]}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

/**
 * Glass Bar Shape for horizontal bar charts (like EmotionMomentumChart)
 */
export function GlassHorizontalBarShape(props: GlassBarShapeProps & { isExtreme?: boolean }) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = "hsl(142 71% 45%)",
    radius = [0, 4, 4, 0],
    baseOpacity = 0.5,
    hoverOpacity = 0.8,
    isExtreme = false,
  } = props;

  const opacity = isExtreme ? hoverOpacity : baseOpacity;

  const glassStyle: React.CSSProperties = {
    transition: 'fill-opacity 0.2s ease-out',
    filter: 'saturate(1.1)',
  };

  if (width === 0 || height === 0) return null;

  // Handle negative width (bars going left from 0)
  const actualX = width < 0 ? x + width : x;
  const actualWidth = Math.abs(width);

  return (
    <g>
      <Rectangle
        x={actualX}
        y={y}
        width={actualWidth}
        height={height}
        fill={fill}
        fillOpacity={opacity}
        stroke={fill}
        strokeOpacity={0.6}
        strokeWidth={1}
        radius={radius}
        style={glassStyle}
      />
      {/* Inner highlight */}
      <Rectangle
        x={actualX}
        y={y + 1}
        width={actualWidth}
        height={Math.max(0, Math.min(height * 0.2, 4))}
        fill="white"
        fillOpacity={0.08}
        radius={[0, (Array.isArray(radius) ? radius[1] : radius), 0, 0]}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

/**
 * Stacked Glass Bar Cell - for use in stacked bar charts
 * Apply as a shape to individual Bar components
 */
export function StackedGlassBarShape(props: GlassBarShapeProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = "hsl(142 71% 45%)",
    radius,
    payload,
    is5MinView = false,
    activeHour = null,
    slotsPerHour = 12,
    baseOpacity = 0.4,
    hoverOpacity = 0.7,
  } = props;

  const isHourActive = activeHour !== null && payload?.hourIndex === activeHour;
  const opacity = isHourActive ? hoverOpacity : baseOpacity;

  const glassStyle: React.CSSProperties = {
    transition: 'fill-opacity 0.2s ease-out, stroke-opacity 0.2s ease-out',
  };

  // For 5-min views with expanded widths
  if (is5MinView) {
    if (!payload?.isHourStart || height === 0) {
      return null;
    }
    const expandedWidth = width * slotsPerHour;
    
    return (
      <Rectangle
        x={x}
        y={y}
        width={expandedWidth}
        height={height}
        fill={fill}
        fillOpacity={opacity}
        stroke={fill}
        strokeOpacity={isHourActive ? 0.7 : 0.4}
        strokeWidth={0.5}
        radius={radius}
        style={glassStyle}
      />
    );
  }

  if (height <= 0) return null;

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      fillOpacity={opacity}
      stroke={fill}
      strokeOpacity={0.4}
      strokeWidth={0.5}
      radius={radius}
      style={glassStyle}
    />
  );
}
