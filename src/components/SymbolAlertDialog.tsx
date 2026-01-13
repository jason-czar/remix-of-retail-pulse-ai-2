import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertsBySymbol, useCreateAlert } from "@/hooks/use-alerts";
import { useNavigate } from "react-router-dom";
import {
  ALERT_CATEGORIES,
  getAlertTypeConfig,
  getAlertTypeLabel,
  getDefaultThreshold,
  isEmotionAlert,
} from "@/lib/alert-types";

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

  const selectedConfig = getAlertTypeConfig(alertType);
  const needsThreshold = selectedConfig?.needsThreshold || false;
  const activeAlertsCount = existingAlerts.filter((a) => a.is_active).length;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !user) {
      toast.error("Please sign in to create alerts");
      navigate("/login");
      return;
    }
    setOpen(isOpen);
  };

  const handleAlertTypeChange = (value: string) => {
    setAlertType(value);
    const config = getAlertTypeConfig(value);
    if (config?.needsThreshold && config.defaultThreshold) {
      setThreshold(config.defaultThreshold.toString());
    } else {
      setThreshold("");
    }
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
            Get notified when sentiment or emotions change for this stock.
          </DialogDescription>
        </DialogHeader>

        {existingAlerts.length > 0 && (
          <div className="p-3 rounded-lg bg-secondary/50 mb-2">
            <p className="text-sm text-muted-foreground mb-2">
              Active alerts for {symbol}:
            </p>
            <div className="flex flex-wrap gap-2">
              {existingAlerts.map((alert) => (
                <Badge
                  key={alert.id}
                  variant={alert.is_active ? "default" : "secondary"}
                  className={isEmotionAlert(alert.alert_type) ? "bg-accent/20 text-accent-foreground border-accent" : ""}
                >
                  {getAlertTypeLabel(alert.alert_type)}
                  {alert.threshold && ` (${alert.threshold}%)`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Alert Type</Label>
            <Select value={alertType} onValueChange={handleAlertTypeChange}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Select alert type" />
              </SelectTrigger>
              <SelectContent>
                {ALERT_CATEGORIES.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      {category.label}
                    </SelectLabel>
                    {category.types.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${category.id === "emotion" ? "text-accent" : ""}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {selectedConfig && (
              <p className="text-xs text-muted-foreground">
                {selectedConfig.description}
              </p>
            )}
          </div>

          {needsThreshold && selectedConfig && (
            <div className="space-y-2">
              <Label htmlFor="threshold">
                {selectedConfig.thresholdLabel || "Threshold"} (%)
              </Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max={selectedConfig.thresholdMax || 100}
                placeholder={`e.g., ${getDefaultThreshold(alertType)}`}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                Alert triggers when value exceeds {threshold || getDefaultThreshold(alertType)}%
              </p>
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
