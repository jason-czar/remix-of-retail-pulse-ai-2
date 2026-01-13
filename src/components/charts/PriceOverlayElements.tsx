import { Line, YAxis } from "recharts";
import { Switch } from "@/components/ui/switch";
import { DollarSign } from "lucide-react";

// Consistent price line styling across all charts
export const PRICE_LINE_COLOR = "hsl(38 92% 50%)";

interface PriceYAxisProps {
  domain: [number | 'auto', number | 'auto'];
  yAxisId?: string;
}

/**
 * Preconfigured Y-axis for price overlay
 */
export function PriceYAxis({ domain, yAxisId = "price" }: PriceYAxisProps) {
  return (
    <YAxis 
      yAxisId={yAxisId}
      orientation="right"
      stroke={PRICE_LINE_COLOR}
      fontSize={11}
      tickLine={false}
      axisLine={false}
      width={55}
      domain={domain}
      tickFormatter={(value) => `$${value}`}
    />
  );
}

interface PriceLineProps {
  yAxisId?: string;
  dataKey?: string;
}

/**
 * Preconfigured Line component for price overlay
 */
export function PriceLine({ yAxisId = "price", dataKey = "price" }: PriceLineProps) {
  return (
    <Line
      yAxisId={yAxisId}
      type="monotone"
      dataKey={dataKey}
      stroke={PRICE_LINE_COLOR}
      strokeWidth={2}
      dot={false}
      activeDot={{ 
        fill: PRICE_LINE_COLOR, 
        strokeWidth: 2, 
        stroke: "#fff", 
        r: 5 
      }}
      connectNulls
    />
  );
}

interface PriceToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  currentPrice?: number | null;
  changePercent?: number | null;
  compact?: boolean;
}

/**
 * Toggle switch for enabling/disabling price overlay
 */
export function PriceToggle({ 
  enabled, 
  onToggle, 
  currentPrice, 
  changePercent,
  compact = false 
}: PriceToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <DollarSign className={`h-4 w-4 ${enabled ? 'text-amber-400' : 'text-muted-foreground'}`} />
      {!compact && <span className="text-xs text-muted-foreground">Price</span>}
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-amber-500"
      />
      {enabled && currentPrice != null && (
        <span className="text-xs text-amber-400 font-semibold ml-1">
          ${currentPrice.toFixed(2)}
          {changePercent != null && (
            <span className={`ml-1 ${changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          )}
        </span>
      )}
    </div>
  );
}

interface PriceLegendItemProps {
  currentPrice?: number | null;
}

/**
 * Legend item for price line
 */
export function PriceLegendItem({ currentPrice }: PriceLegendItemProps) {
  return (
    <div className="flex items-center gap-2 border-l border-border pl-4">
      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: PRICE_LINE_COLOR }} />
      <span className="text-amber-400">Stock Price</span>
      {currentPrice != null && (
        <span className="text-amber-400 font-semibold">${currentPrice.toFixed(2)}</span>
      )}
    </div>
  );
}

interface PriceTooltipContentProps {
  price?: number | null;
  className?: string;
}

/**
 * Tooltip content section for price
 */
export function PriceTooltipContent({ price, className = "" }: PriceTooltipContentProps) {
  if (price == null) return null;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DollarSign className="h-4 w-4 text-amber-400" />
      <span className="text-amber-400 font-bold text-lg">${price.toFixed(2)}</span>
    </div>
  );
}

/**
 * Inline price display for tooltips
 */
export function PriceTooltipInline({ price }: { price?: number | null }) {
  if (price == null) return null;
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <DollarSign style={{ width: 14, height: 14, color: PRICE_LINE_COLOR }} />
      <span style={{ color: PRICE_LINE_COLOR, fontWeight: 700, fontSize: "16px" }}>
        ${price.toFixed(2)}
      </span>
    </div>
  );
}
