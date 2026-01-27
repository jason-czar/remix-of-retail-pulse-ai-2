import { motion } from "framer-motion";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightsActionsCardProps {
  keyConcerns?: string[];
  recommendedActions?: string[];
  isLoading?: boolean;
}

export function InsightsActionsCard({ 
  keyConcerns, 
  recommendedActions, 
  isLoading 
}: InsightsActionsCardProps) {
  // Don't render if there's no data and not loading
  if (!isLoading && (!keyConcerns?.length && !recommendedActions?.length)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
    >
      <Card className="p-5 md:p-6 glass-card border-primary/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Key Concerns - Left Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/15">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Key Concerns</h3>
            </div>
            
            {isLoading ? (
              <div className="space-y-2.5 pl-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[85%]" />
              </div>
            ) : keyConcerns?.length ? (
              <ul className="space-y-2 pl-1">
                {keyConcerns.map((concern, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-start gap-2.5 text-sm text-foreground/75 leading-relaxed"
                  >
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500/60 shrink-0" />
                    <span>{concern}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic pl-1">
                No specific concerns identified
              </p>
            )}
          </div>

          {/* Recommended Actions - Right Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15">
                <Lightbulb className="h-4 w-4 text-emerald-500" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Recommended Actions</h3>
            </div>
            
            {isLoading ? (
              <div className="space-y-2.5 pl-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[88%]" />
                <Skeleton className="h-4 w-[92%]" />
              </div>
            ) : recommendedActions?.length ? (
              <ul className="space-y-2 pl-1">
                {recommendedActions.map((action, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-start gap-2.5 text-sm text-foreground/75 leading-relaxed"
                  >
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                    <span>{action}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic pl-1">
                No specific actions recommended
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
