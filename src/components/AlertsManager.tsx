import { useState } from "react";
import { Bell, BellOff, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  useAlerts,
  useCreateAlert,
  useToggleAlert,
  useDeleteAlert,
  Alert,
} from "@/hooks/use-alerts";

const ALERT_TYPES = [
  { value: "sentiment_spike", label: "Sentiment Spike", icon: TrendingUp, description: "Alert when sentiment rises sharply" },
  { value: "sentiment_drop", label: "Sentiment Drop", icon: TrendingDown, description: "Alert when sentiment falls sharply" },
  { value: "volume_surge", label: "Volume Surge", icon: Activity, description: "Alert when message volume spikes" },
  { value: "bullish_threshold", label: "Bullish Threshold", icon: TrendingUp, description: "Alert when bullish % exceeds threshold" },
  { value: "bearish_threshold", label: "Bearish Threshold", icon: TrendingDown, description: "Alert when bearish % exceeds threshold" },
];

function AlertTypeIcon({ type }: { type: string }) {
  const alertType = ALERT_TYPES.find((t) => t.value === type);
  if (!alertType) return <Bell className="h-4 w-4" />;
  const Icon = alertType.icon;
  return <Icon className="h-4 w-4" />;
}

function getAlertTypeLabel(type: string) {
  return ALERT_TYPES.find((t) => t.value === type)?.label || type;
}

function CreateAlertDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [alertType, setAlertType] = useState("");
  const [threshold, setThreshold] = useState("");
  
  const createAlert = useCreateAlert();

  const needsThreshold = alertType === "bullish_threshold" || alertType === "bearish_threshold";

  const handleSubmit = async () => {
    if (!symbol.trim()) {
      toast.error("Please enter a symbol");
      return;
    }
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
        symbol: symbol.trim().toUpperCase(),
        alert_type: alertType,
        threshold: needsThreshold ? parseFloat(threshold) : null,
      });
      toast.success(`Alert created for ${symbol.toUpperCase()}`);
      setOpen(false);
      setSymbol("");
      setAlertType("");
      setThreshold("");
      onCreated?.();
    } catch (error) {
      toast.error("Failed to create alert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>
            Set up a new alert to monitor stock sentiment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL, TSLA"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-secondary/50"
            />
          </div>
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

function AlertRow({ alert }: { alert: Alert }) {
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleAlert.mutateAsync({ alertId: alert.id, isActive: checked });
      toast.success(checked ? "Alert enabled" : "Alert paused");
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAlert.mutateAsync({ alertId: alert.id, symbol: alert.symbol });
      toast.success("Alert deleted");
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${alert.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          <AlertTypeIcon type={alert.alert_type} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{alert.symbol}</span>
            <span className="text-sm text-muted-foreground">
              {getAlertTypeLabel(alert.alert_type)}
            </span>
          </div>
          {alert.threshold && (
            <p className="text-xs text-muted-foreground">
              Threshold: {alert.threshold}%
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {alert.is_active ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Switch
            checked={alert.is_active}
            onCheckedChange={handleToggle}
            disabled={toggleAlert.isPending}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteAlert.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          {deleteAlert.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AlertsManager() {
  const { data: alerts, isLoading } = useAlerts();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Alerts</h3>
          <p className="text-sm text-muted-foreground">
            Get notified when sentiment changes
          </p>
        </div>
        <CreateAlertDialog />
      </div>

      {alerts && alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">No alerts configured</p>
          <CreateAlertDialog />
        </div>
      )}
    </Card>
  );
}
