import { useState } from "react";
import { Plus, Loader2, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useCreateAlert } from "@/hooks/use-alerts";
import {
  ALERT_CATEGORIES,
  RECOMMENDED_ALERTS,
  getAlertTypeConfig,
  getDefaultThreshold,
  type AlertTypeConfig,
} from "@/lib/alert-types";
import { cn } from "@/lib/utils";

interface CreateAlertDialogProps {
  symbol?: string;
  onCreated?: () => void;
}

export function CreateAlertDialog({ symbol: initialSymbol, onCreated }: CreateAlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState(initialSymbol || "");
  const [alertType, setAlertType] = useState("");
  const [threshold, setThreshold] = useState("");
  const [showAllTypes, setShowAllTypes] = useState(false);
  
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

  const handleQuickPick = (config: AlertTypeConfig) => {
    setAlertType(config.value);
    if (config.needsThreshold && config.defaultThreshold) {
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
      setShowAllTypes(false);
      onCreated?.();
    } catch (error) {
      toast.error("Failed to create alert");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setShowAllTypes(false);
      setAlertType("");
      setThreshold("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>
            Get notified when market psychology shifts. Alerts are evaluated every 30 minutes during market hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Symbol Input */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL, TSLA"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="glass-input font-mono"
            />
          </div>

          {/* Quick Pick Recommended Alerts */}
          {!showAllTypes && !alertType && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Popular Alerts</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RECOMMENDED_ALERTS.map((config) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={config.value}
                      onClick={() => handleQuickPick(config)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all duration-200",
                        "bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-primary/30",
                        "group cursor-pointer"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          config.category === "emotion" 
                            ? "bg-accent/20 text-accent" 
                            : "bg-primary/20 text-primary"
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{config.label}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {config.tagline}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowAllTypes(true)}
              >
                View all alert types
              </Button>
            </div>
          )}

          {/* Full Alert Type Selector */}
          {(showAllTypes || alertType) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alert Type</Label>
                {showAllTypes && !alertType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 px-2 text-xs text-muted-foreground"
                    onClick={() => setShowAllTypes(false)}
                  >
                    Back to recommended
                  </Button>
                )}
              </div>
              <Select value={alertType} onValueChange={handleAlertTypeChange}>
                <SelectTrigger className="glass-input">
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
                              <span>{type.label}</span>
                              {type.recommended && (
                                <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">
                                  Popular
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {/* Alert Details Card */}
              {selectedConfig && (
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/50 space-y-2">
                  <p className="text-sm">{selectedConfig.description}</p>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div>
                      <p><span className="font-medium">Monitors:</span> {selectedConfig.monitors}</p>
                      <p className="mt-1"><span className="font-medium">Evaluation:</span> {selectedConfig.evaluationLogic}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Threshold Input */}
          {needsThreshold && selectedConfig && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="threshold">
                  {selectedConfig.thresholdLabel || "Threshold"}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">{selectedConfig.evaluationLogic}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max={selectedConfig.thresholdMax || 100}
                  placeholder={`e.g., ${getDefaultThreshold(alertType)}`}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="glass-input"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
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
            disabled={createAlert.isPending || !symbol.trim() || !alertType}
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
