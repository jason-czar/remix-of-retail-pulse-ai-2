import { Database, Cpu, BarChart, Send } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const steps = [
  {
    icon: Database,
    number: "01",
    title: "Aggregate Data",
    description: "We ingest millions of messages daily from StockTwits, capturing the full breadth of retail investor conversation."
  },
  {
    icon: Cpu,
    number: "02",
    title: "Apply AI Analysis",
    description: "Advanced NLP models extract sentiment, emotions, and narratives from raw text with institutional-grade accuracy."
  },
  {
    icon: BarChart,
    number: "03",
    title: "Generate Insights",
    description: "Structured data is transformed into actionable metrics: sentiment scores, narrative rankings, and emotion breakdowns."
  },
  {
    icon: Send,
    number: "04",
    title: "Deliver in Real-Time",
    description: "Access insights via our dashboard, API, or custom alerts — however fits your workflow best."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-20 lg:py-28 relative">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-glow opacity-30 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display mb-4 text-balance">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-balance">
              From raw social data to institutional-grade intelligence in four steps.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" staggerDelay={0.1}>
            {steps.map((step, index) => (
              <StaggerItem key={step.number} className="h-full">
                <StepCard {...step} isLast={index === steps.length - 1} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  icon: Icon,
  number,
  title,
  description,
  isLast
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
  isLast: boolean;
}) {
  return (
    <div className="relative group">
      <div className="glass-card p-6 h-full hover:shadow-glow transition-all duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-mono text-muted-foreground">{number}</span>
        </div>
        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {/* Connector arrow - hidden on mobile and last item */}
      {!isLast && (
        <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 text-primary/30 z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
