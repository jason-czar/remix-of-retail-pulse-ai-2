import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  selector?: string; // CSS selector for highlighting
  position?: "center" | "below" | "above" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to DeriveStreet! 👋",
    description: "Let's take a quick tour of the intelligence dashboard. We analyze social sentiment to help you understand market psychology.",
    position: "center",
  },
  {
    title: "Narrative & Emotion Charts",
    description: "These charts show real-time narrative themes and emotional patterns from social discussions. Use the tabs to switch between views.",
    selector: "[data-tour='chart-tabs']",
    position: "below",
  },
  {
    title: "Decision Lens",
    description: "Select different decision lenses to get AI-powered analysis tailored to your investment style—whether you're a day trader or long-term investor.",
    selector: "[data-tour='decision-lens']",
    position: "below",
  },
  {
    title: "Intelligence Summary",
    description: "Our AI synthesizes thousands of messages into actionable insights, highlighting key narratives and sentiment shifts.",
    selector: "[data-tour='intelligence-summary']",
    position: "right",
  },
  {
    title: "You're All Set! 🎉",
    description: "Explore the dashboard, add symbols to your watchlist, and set up alerts to stay informed. Happy analyzing!",
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "derivestreet_welcome_tour_completed";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);

  const updateSpotlight = useCallback(() => {
    const step = tourSteps[currentStep];
    if (step.selector) {
      const element = document.querySelector(step.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setSpotlightRect({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate card position based on step position preference
        const cardWidth = 360;
        const cardHeight = 280;
        const margin = 16;
        let top = 0;
        let left = 0;

        switch (step.position) {
          case "below":
            top = rect.bottom + margin + window.scrollY;
            left = Math.max(margin, Math.min(rect.left + rect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - margin));
            break;
          case "above":
            top = rect.top - cardHeight - margin + window.scrollY;
            left = Math.max(margin, Math.min(rect.left + rect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - margin));
            break;
          case "right":
            top = Math.max(margin, rect.top + rect.height / 2 - cardHeight / 2 + window.scrollY);
            left = Math.min(rect.right + margin, window.innerWidth - cardWidth - margin);
            break;
          case "left":
            top = Math.max(margin, rect.top + rect.height / 2 - cardHeight / 2 + window.scrollY);
            left = Math.max(margin, rect.left - cardWidth - margin);
            break;
          default:
            top = window.innerHeight / 2 - cardHeight / 2 + window.scrollY;
            left = window.innerWidth / 2 - cardWidth / 2;
        }

        setCardPosition({ top, left });

        // Scroll element into view if needed
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setSpotlightRect(null);
      setCardPosition(null);
    }
  }, [currentStep]);

  useEffect(() => {
    // Check if user has already completed the tour
    const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasCompletedTour) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateSpotlight();
      window.addEventListener("resize", updateSpotlight);
      return () => window.removeEventListener("resize", updateSpotlight);
    }
  }, [isOpen, currentStep, updateSpotlight]);

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* SVG Spotlight Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%" }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ minHeight: document.body.scrollHeight }}
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {spotlightRect && (
                    <motion.rect
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      x={spotlightRect.left}
                      y={spotlightRect.top}
                      width={spotlightRect.width}
                      height={spotlightRect.height}
                      rx="12"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.7)"
                mask="url(#spotlight-mask)"
                className="pointer-events-auto"
                onClick={handleSkip}
              />
            </svg>

            {/* Spotlight ring glow */}
            {spotlightRect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute rounded-xl pointer-events-none"
                style={{
                  top: spotlightRect.top,
                  left: spotlightRect.left,
                  width: spotlightRect.width,
                  height: spotlightRect.height,
                  boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.3)",
                }}
              />
            )}
          </motion.div>

          {/* Tour Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-50 w-[90vw] max-w-[360px] pointer-events-auto"
            style={
              cardPosition
                ? { top: cardPosition.top, left: cardPosition.left }
                : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
            }
          >
            <div className="glass-card p-5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-background/95">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-3">
                <div className="p-2.5 rounded-full bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-display mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-4">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-5 bg-primary"
                        : index < currentStep
                        ? "w-1.5 bg-primary/50"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                {!isFirstStep ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrev}
                    className="gap-1 h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground h-8"
                  >
                    Skip
                  </Button>
                )}

                <Button
                  variant="hero"
                  size="sm"
                  onClick={handleNext}
                  className="gap-1 h-8"
                >
                  {isLastStep ? "Get Started" : "Next"}
                  {!isLastStep && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
