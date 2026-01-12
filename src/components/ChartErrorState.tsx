import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ChartErrorState({ 
  message = "Failed to load chart data", 
  onRetry 
}: ChartErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRetry}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
