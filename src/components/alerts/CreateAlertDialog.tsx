import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { useCreateAlert } from "@/hooks/use-alerts";
import {
  ALERT_CATEGORIES,
  getAlertTypeConfig,
  getDefaultThreshold,
} from "@/lib/alert-types";

interface CreateAlertDialogProps {
  symbol?: string;
  onCreated?: () => void;
}

export function CreateAlertDialog({ symbol: initialSymbol, onCreated }: CreateAlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState(initialSymbol || "");
  const [alertType, setAlertType] = useState("");
  const [threshold, setThreshold] = useState("");
  
  const createAlert = useCreateAlert();

  const selectedConfig = getAlertTypeConfig(alertType);
  const needsThreshold = selectedConfig?.needsThreshold || false;

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
      setSymbol(initialSymbol || "");
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
            Set up a new alert to monitor stock sentiment or emotion signals.
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
