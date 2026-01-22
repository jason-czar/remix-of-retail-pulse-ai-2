import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to DeriveStreet! 👋",
    description: "Let's take a quick tour of the intelligence dashboard. We analyze social sentiment to help you understand market psychology.",
  },
  {
    title: "Narrative & Emotion Charts",
    description: "These charts show real-time narrative themes and emotional patterns from social discussions. Use the tabs to switch between views.",
  },
  {
    title: "Decision Lens",
    description: "Select different decision lenses to get AI-powered analysis tailored to your investment style—whether you're a day trader or long-term investor.",
  },
  {
    title: "Intelligence Summary",
    description: "Our AI synthesizes thousands of messages into actionable insights, highlighting key narratives and sentiment shifts.",
  },
  {
    title: "You're All Set! 🎉",
    description: "Explore the dashboard, add symbols to your watchlist, and set up alerts to stay informed. Happy analyzing!",
  },
];

const TOUR_STORAGE_KEY = "derivestreet_welcome_tour_completed";

export function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has already completed the tour
    const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasCompletedTour) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md"
          >
            <div className="glass-card p-6 rounded-2xl border border-white/20 shadow-2xl">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-display mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-6">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                {!isFirstStep ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrev}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip tour
                  </Button>
                )}

                <Button
                  variant="hero"
                  size="sm"
                  onClick={handleNext}
                  className="gap-1"
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
