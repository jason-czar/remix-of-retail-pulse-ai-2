import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomLens, useCustomLenses, useDeleteCustomLens } from "@/hooks/use-custom-lenses";
import { CreateCustomLensDialog } from "@/components/CreateCustomLensDialog";
import { useAuth } from "@/contexts/AuthContext";

export type DecisionLens = 'summary' | 'corporate-strategy' | 'earnings' | 'ma' | 'capital-allocation' | 'leadership-change' | 'strategic-pivot' | 'product-launch' | 'activist-risk';

// Combined type for both default and custom lenses
export type LensValue = DecisionLens | string;

export interface LensOption {
  value: LensValue;
  label: string;
  isCustom?: boolean;
  customLens?: CustomLens;
}

interface DecisionLensSelectorProps {
  value: LensValue;
  onChange: (lens: LensValue, customLens?: CustomLens) => void;
}

const defaultLensOptions: LensOption[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'corporate-strategy', label: 'Corporate Strategy' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'ma', label: 'M&A' },
  { value: 'capital-allocation', label: 'Capital Allocation' },
  { value: 'leadership-change', label: 'Leadership' },
  { value: 'strategic-pivot', label: 'Strategic Pivot' },
  { value: 'product-launch', label: 'Product Launch' },
  { value: 'activist-risk', label: 'Activist Risk' },
];

export function DecisionLensSelector({ value, onChange }: DecisionLensSelectorProps) {
  const { user } = useAuth();
  const { data: customLenses = [] } = useCustomLenses();
  const deleteMutation = useDeleteCustomLens();
  const [editingLens, setEditingLens] = useState<CustomLens | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lensToDelete, setLensToDelete] = useState<CustomLens | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Memoize the initial mount ID to ensure animation only runs on page load
  const mountId = useMemo(() => Date.now(), []);
  
  // Combine default and custom lenses
  const allLensOptions: LensOption[] = [
    ...defaultLensOptions,
    ...customLenses.map((lens) => ({
      value: lens.slug,
      label: lens.name,
      isCustom: true,
      customLens: lens,
    })),
  ];
  
  // Check scroll state
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };
    
    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    // Re-check after lenses load
    const observer = new ResizeObserver(checkScroll);
    observer.observe(container);
    
    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, [customLenses]);
  
  // Keyboard navigation for switching lenses with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Only handle left/right arrow keys
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }
      
      const currentIndex = allLensOptions.findIndex(opt => opt.value === value);
      if (currentIndex === -1) return;
      
      let newIndex: number;
      if (e.key === 'ArrowLeft') {
        newIndex = currentIndex === 0 ? allLensOptions.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex === allLensOptions.length - 1 ? 0 : currentIndex + 1;
      }
      
      const newOption = allLensOptions[newIndex];
      onChange(newOption.value, newOption.customLens);
      
      // Scroll the selected lens into view
      setTimeout(() => {
        const container = scrollContainerRef.current;
        const buttons = container?.querySelectorAll('button');
        const targetButton = buttons?.[newIndex];
        if (targetButton && container) {
          targetButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 50);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, allLensOptions, onChange]);
  
  const handleDeleteConfirm = async () => {
    if (lensToDelete) {
      await deleteMutation.mutateAsync(lensToDelete.id);
      // If we deleted the currently selected lens, switch to summary
      if (value === lensToDelete.slug) {
        onChange('summary');
      }
    }
    setDeleteDialogOpen(false);
    setLensToDelete(null);
  };
  
  return (
    <>
      <div className="relative max-w-full">
        {/* Left scroll fade indicator - only visible when can scroll left */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background/80 to-transparent pointer-events-none z-10 rounded-l-2xl transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )} />
        
        {/* Right scroll fade indicator - only visible when can scroll right */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10 rounded-r-2xl transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )} />
        
        <motion.div 
          key={mountId}
          ref={scrollContainerRef}
          initial={{ opacity: 0, y: -8, scale: 0.98, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            boxShadow: [
              "0 1px 2px rgba(0,0,0,0.02)",
              "0 0 6px 1px rgba(0, 113, 227, 0.04)",
              "0 0 12px 3px rgba(0, 113, 227, 0.12), 0 0 24px 6px rgba(0, 113, 227, 0.06)",
              "0 0 12px 3px rgba(0, 113, 227, 0.12), 0 0 24px 6px rgba(0, 113, 227, 0.06)",
              "0 0 6px 1px rgba(0, 113, 227, 0.04)",
              "0 1px 2px rgba(0,0,0,0.02)"
            ]
          }}
          transition={{ 
            opacity: { duration: 0.5, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] },
            y: { duration: 0.5, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] },
            scale: { duration: 0.5, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] },
            boxShadow: { 
              duration: 2.8, 
              delay: 0.9,
              times: [0, 0.15, 0.4, 0.6, 0.85, 1],
              ease: [0.25, 0.1, 0.25, 1]
            }
          }}
          className={cn(
            "relative inline-flex items-center gap-1.5 rounded-2xl py-2.5 px-3 overflow-x-auto scrollbar-hide mx-[4px] max-w-full",
            // Liquid Glass styling - subtle and seamless
            "bg-white/45 dark:bg-[hsl(0_0%_15%/0.45)]",
            "backdrop-blur-[20px] backdrop-saturate-[140%]",
            "border border-black/[0.04] dark:border-white/[0.06]"
        )}>
        {allLensOptions.map((option, index) => {
          // Calculate animation delay: single sweep left-to-right
          const baseDelay = 1.1; // Delay so user notices selector first
          const itemDuration = 0.07; // Smooth wave timing
          const animationDelay = baseDelay + index * itemDuration;
          
          return (
            <motion.div 
              key={option.value} 
              className="relative flex items-center shrink-0"
              initial={{ scale: 1 }}
              animate={{
                scale: [1, 1.05, 1]
              }}
              transition={{
                duration: 0.5,
                times: [0, 0.35, 1],
                delay: animationDelay,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              {/* Blue glow overlay for wave animation */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                initial={{ opacity: 0, boxShadow: "0 0 0 0 rgba(0, 113, 227, 0)" }}
                animate={{
                  opacity: [0, 0.2, 0.32, 0.2, 0],
                  boxShadow: [
                    "0 0 0 0 rgba(0, 113, 227, 0)",
                    "0 0 4px 1px rgba(0, 113, 227, 0.12), inset 0 0 2px rgba(0, 113, 227, 0.06)",
                    "0 0 8px 2px rgba(0, 113, 227, 0.2), inset 0 0 5px rgba(0, 113, 227, 0.12)",
                    "0 0 4px 1px rgba(0, 113, 227, 0.12), inset 0 0 2px rgba(0, 113, 227, 0.06)",
                    "0 0 0 0 rgba(0, 113, 227, 0)"
                  ]
                }}
                transition={{
                  duration: 0.8,
                  times: [0, 0.25, 0.5, 0.75, 1],
                  delay: animationDelay,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
              />
              <motion.button
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full ring-offset-background transition-all duration-200",
                  value === option.value
                    ? [
                        // Light mode: frosted white with subtle depth
                        "bg-white text-foreground",
                        "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]",
                        "border border-black/[0.06]",
                        // Dark mode: subtle glass elevation without white bleed
                        "dark:bg-white/[0.12] dark:text-foreground",
                        "dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
                        "dark:border-white/[0.12]"
                      ]
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
                  option.isCustom && "pr-7"
                )}
                onClick={() => onChange(option.value, option.customLens)}
                initial={{ color: "inherit" }}
                animate={{
                  color: ["inherit", "inherit", "#0071E3", "inherit", "inherit"]
                }}
                transition={{
                  duration: 0.6,
                  times: [0, 0.2, 0.4, 0.7, 1],
                  delay: animationDelay,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                {option.label}
              </motion.button>
              
              {/* Custom lens dropdown menu */}
              {option.isCustom && option.customLens && value === option.value && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0.5 h-5 w-5 p-0 rounded-full hover:bg-white/10"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => setEditingLens(option.customLens!)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setLensToDelete(option.customLens!);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </motion.div>
          );
        })}
        
        {/* Create new lens button (only for logged-in users) */}
        {user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CreateCustomLensDialog
                trigger={
                  <button className="inline-flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
            </TooltipTrigger>
            <TooltipContent>Create custom lens</TooltipContent>
          </Tooltip>
        )}
        </motion.div>
      </div>
      
      {/* Edit dialog */}
      {editingLens && (
        <CreateCustomLensDialog
          editLens={editingLens}
          trigger={<span />}
          onClose={() => setEditingLens(null)}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Lens</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{lensToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function getLensDisplayName(lens: LensValue, customLens?: CustomLens): string {
  if (customLens) return customLens.name;
  
  const option = defaultLensOptions.find(o => o.value === lens);
  return option?.label || 'Summary';
}

export function getLensDecisionQuestion(lens: LensValue, customLens?: CustomLens): string {
  if (customLens) return customLens.decision_question;
  
  const questions: Record<DecisionLens, string> = {
    'summary': 'What is the current psychological state of retail investors?',
    'corporate-strategy': 'How do retail investors perceive management\'s strategic direction?',
    'earnings': 'What are retail expectations around financial performance?',
    'ma': 'Is there meaningful speculation about acquisition activity?',
    'capital-allocation': 'How do investors view shareholder return priorities?',
    'leadership-change': 'What is retail sentiment on management quality and stability?',
    'strategic-pivot': 'Are investors anticipating major business model changes?',
    'product-launch': 'How is the market receiving new products or innovation pipeline?',
    'activist-risk': 'Is there meaningful activist involvement or governance concern?',
  };
  return questions[lens as DecisionLens] || 'What are the key themes in retail discussion?';
}

export function getLensPromptContext(lens: DecisionLens): string {
  const contexts: Record<DecisionLens, string> = {
    'summary': `Provide a high-level synthesis of retail sentiment and psychological state.

Focus on:
- Dominant emotions and collective mood (fear, greed, confusion, conviction)
- Consensus vs fragmentation in views
- Near-term expectations, frustrations, or catalysts

Explicitly avoid:
- Strategic interpretation or long-term positioning
- Capital allocation judgments
- Specific earnings metrics`,
    'corporate-strategy': `Focus strictly on perceived corporate strategy and long-term competitive positioning.

Highlight:
- How investors interpret management's strategic intent and vision
- Views on competitive moats, ecosystem control, or market position
- Whether strategic moves are seen as visionary, defensive, or reactive

Explicitly avoid:
- Short-term price action or trading sentiment
- Earnings beats/misses (unless directly tied to strategy)
- Emotional complaints unless they challenge strategic narrative`,
    'earnings': `Focus on earnings-related discussion and financial performance expectations.

Highlight:
- Revenue, margins, guidance, or segment performance mentions
- Gap between expectations and perceived outcomes
- Forward earnings narratives and guidance interpretation

Explicitly avoid:
- Strategic positioning unrelated to financials
- Product discussions unless tied to revenue impact

If investors are NOT discussing earnings meaningfully, state this and note what they are focused on instead.`,
    'ma': `Focus on merger and acquisition speculation, deal activity, and consolidation themes.

Highlight:
- Specific deal rumors, buyout targets, or acquirer mentions
- Views on merger synergies, valuations, or strategic fit
- Concerns about overpaying or integration risks

Explicitly avoid:
- General competitive positioning (unless about being acquired/acquiring)
- Product launches or earnings performance
- Leadership changes (unless tied to deal probability)`,
    'capital-allocation': `Focus on capital deployment and shareholder return expectations.

Highlight:
- Discussion of buybacks, dividends, or special returns
- Views on debt management or balance sheet priorities
- Opinions on capex spending, investment levels, or cash hoarding

Explicitly avoid:
- Earnings performance metrics (unless about cash generation)
- Strategic pivots or M&A speculation`,
    'leadership-change': `Focus on leadership perception, executive changes, and management credibility.

Highlight:
- Discussion of CEO/executive performance or competence
- Succession planning concerns or transition speculation
- Management credibility on guidance or communication

Explicitly avoid:
- Strategic or product decisions (unless directly questioning leadership competence)
- Earnings metrics
- Activist involvement (separate lens)`,
    'strategic-pivot': `Focus on strategic pivots, divestitures, and business model transformation.

Highlight:
- Discussion of segment sales, spinoffs, or restructuring
- Views on business model changes or market exits
- Concerns about execution risk or strategic clarity

Explicitly avoid:
- Regular product launches or earnings
- Leadership changes (unless driving the pivot)`,
    'product-launch': `Focus on new product launches, innovation cycles, and market reception.

Highlight:
- Discussion of specific upcoming or recent product releases
- Views on innovation quality, market fit, or differentiation
- Concerns about delays, quality issues, or market reception

Explicitly avoid:
- Earnings metrics (unless directly tied to product revenue)
- Strategic repositioning beyond product scope`,
    'activist-risk': `Focus on activist investor involvement, proxy activity, and governance challenges.

Highlight:
- Discussion of specific activist investors or campaigns
- Views on board composition or governance quality
- Concerns about proxy fights, shareholder proposals, or forced changes

Explicitly avoid:
- General leadership criticism (unless activist-driven)
- Strategic disagreements from regular investors`,
  };
  return contexts[lens];
}

// Helper to check if a lens value is a default lens
export function isDefaultLens(lens: LensValue): lens is DecisionLens {
  return defaultLensOptions.some(o => o.value === lens);
}
