import { useState } from "react";
import { Bell, Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertsBySymbol, useCreateAlert } from "@/hooks/use-alerts";
import { useNavigate } from "react-router-dom";

const ALERT_TYPES = [
  { value: "sentiment_spike", label: "Sentiment Spike", icon: TrendingUp, description: "Alert when sentiment rises sharply" },
  { value: "sentiment_drop", label: "Sentiment Drop", icon: TrendingDown, description: "Alert when sentiment falls sharply" },
  { value: "volume_surge", label: "Volume Surge", icon: Activity, description: "Alert when message volume spikes" },
  { value: "bullish_threshold", label: "Bullish Threshold", icon: TrendingUp, description: "Alert when bullish % exceeds threshold" },
  { value: "bearish_threshold", label: "Bearish Threshold", icon: TrendingDown, description: "Alert when bearish % exceeds threshold" },
];

interface SymbolAlertDialogProps {
  symbol: string;
}

export function SymbolAlertDialog({ symbol }: SymbolAlertDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [threshold, setThreshold] = useState("");

  const { data: existingAlerts = [] } = useAlertsBySymbol(symbol);
  const createAlert = useCreateAlert();

  const needsThreshold = alertType === "bullish_threshold" || alertType === "bearish_threshold";
  const activeAlertsCount = existingAlerts.filter((a) => a.is_active).length;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !user) {
      toast.error("Please sign in to create alerts");
      navigate("/login");
      return;
    }
    setOpen(isOpen);
  };

  const handleSubmit = async () => {
    if (!alertType) {
      toast.error("Please select an alert type");
      return;
    }
    if (needsThreshold && !threshold) {
      toast.error("Please enter a threshold value");
      return;
    }

    try {
      await createAlert.mutateAsync({
        symbol: symbol.toUpperCase(),
        alert_type: alertType,
        threshold: needsThreshold ? parseFloat(threshold) : null,
      });
      toast.success(`Alert created for ${symbol}`);
      setOpen(false);
      setAlertType("");
      setThreshold("");
    } catch (error) {
      toast.error("Failed to create alert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Bell className="h-4 w-4 mr-2" />
          Set Alert
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeAlertsCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert for ${symbol}</DialogTitle>
          <DialogDescription>
            Get notified when sentiment changes for this stock.
          </DialogDescription>
        </DialogHeader>

        {existingAlerts.length > 0 && (
          <div className="p-3 rounded-lg bg-secondary/50 mb-2">
            <p className="text-sm text-muted-foreground mb-2">
              Active alerts for {symbol}:
            </p>
            <div className="flex flex-wrap gap-2">
              {existingAlerts.map((alert) => (
                <span
                  key={alert.id}
                  className={`text-xs px-2 py-1 rounded ${
                    alert.is_active
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {ALERT_TYPES.find((t) => t.value === alert.alert_type)?.label || alert.alert_type}
                  {alert.threshold && ` (${alert.threshold}%)`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Alert Type</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select alert type" />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {alertType && (
              <p className="text-xs text-muted-foreground">
                {ALERT_TYPES.find((t) => t.value === alertType)?.description}
              </p>
            )}
          </div>

          {needsThreshold && (
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold (%)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 70"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="hero"
            onClick={handleSubmit}
            disabled={createAlert.isPending}
          >
            {createAlert.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Alert"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
