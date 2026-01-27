import { useState } from "react";
import { Bell, Loader2, Info, Sparkles, ChevronDown } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAlertsBySymbol, useCreateAlert } from "@/hooks/use-alerts";
import { useNavigate } from "react-router-dom";
import {
  ALERT_CATEGORIES,
  RECOMMENDED_ALERTS,
  getAlertTypeConfig,
  getAlertTypeLabel,
  getDefaultThreshold,
  isEmotionAlert,
  type AlertTypeConfig,
} from "@/lib/alert-types";
import { cn } from "@/lib/utils";

interface SymbolAlertDialogProps {
  symbol: string;
}

export function SymbolAlertDialog({ symbol }: SymbolAlertDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [threshold, setThreshold] = useState("");
  const [showAllTypes, setShowAllTypes] = useState(false);

  const { data: existingAlerts = [] } = useAlertsBySymbol(symbol);
  const createAlert = useCreateAlert();

  const selectedConfig = getAlertTypeConfig(alertType);
  const needsThreshold = selectedConfig?.needsThreshold || false;
  const activeAlertsCount = existingAlerts.filter((a) => a.is_active).length;

  // Filter out already-created alert types for recommendations
  const existingTypes = new Set(existingAlerts.map(a => a.alert_type));
  const availableRecommended = RECOMMENDED_ALERTS.filter(a => !existingTypes.has(a.value));

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !user) {
      toast.error("Please sign in to create alerts");
      navigate("/login");
      return;
    }
    setOpen(isOpen);
    if (!isOpen) {
      setAlertType("");
      setThreshold("");
      setShowAllTypes(false);
    }
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

  const handleQuickPick = (config: AlertTypeConfig) => {
    setAlertType(config.value);
    if (config.needsThreshold && config.defaultThreshold) {
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
      setShowAllTypes(false);
    } catch (error) {
      toast.error("Failed to create alert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="glass-pill" className="relative">
          <Bell className="h-4 w-4 mr-2" />
          Set Alert
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeAlertsCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create Alert for <span className="font-mono">${symbol}</span>
          </DialogTitle>
          <DialogDescription>
            Get notified when sentiment or psychology shifts. Evaluated every 30 minutes during market hours.
          </DialogDescription>
        </DialogHeader>

        {/* Existing Alerts Summary */}
        {existingAlerts.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full p-3 rounded-xl bg-secondary/40 border border-border/50 flex items-center justify-between text-left hover:bg-secondary/60 transition-colors">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {activeAlertsCount} active alert{activeAlertsCount !== 1 ? "s" : ""} for {symbol}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-secondary/20 border border-border/30">
                {existingAlerts.map((alert) => (
                  <Badge
                    key={alert.id}
                    variant={alert.is_active ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      isEmotionAlert(alert.alert_type) && alert.is_active
                        ? "bg-accent/20 text-accent-foreground border-accent"
                        : ""
                    )}
                  >
                    {getAlertTypeLabel(alert.alert_type)}
                    {alert.threshold && ` (${alert.threshold}%)`}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="space-y-4 py-2">
          {/* Quick Pick Recommended Alerts */}
          {!showAllTypes && !alertType && availableRecommended.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Recommended for {symbol}</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableRecommended.slice(0, 4).map((config) => {
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

          {/* Show "View all" if all recommended are taken */}
          {!showAllTypes && !alertType && availableRecommended.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                You've set up all recommended alerts. Explore more options below.
              </p>
              <Button
                variant="outline"
                size="sm"
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
                        const alreadyExists = existingTypes.has(type.value);
                        return (
                          <SelectItem 
                            key={type.value} 
                            value={type.value}
                            disabled={alreadyExists}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${category.id === "emotion" ? "text-accent" : ""}`} />
                              <span className={alreadyExists ? "line-through opacity-50" : ""}>
                                {type.label}
                              </span>
                              {alreadyExists && (
                                <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">
                                  Active
                                </Badge>
                              )}
                              {type.recommended && !alreadyExists && (
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
            disabled={createAlert.isPending || !alertType}
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
