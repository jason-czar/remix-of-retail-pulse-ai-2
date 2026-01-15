import { Database, Cpu, BarChart, Send } from "lucide-react";

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
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From raw social data to institutional-grade intelligence in four steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <StepCard key={step.number} {...step} isLast={index === steps.length - 1} />
            ))}
          </div>
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
    <div className="relative">
      <div className="bg-card rounded-xl border border-border p-6 shadow-card h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex p-2.5 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-mono text-muted-foreground">{number}</span>
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {/* Connector arrow - hidden on mobile and last item */}
      {!isLast && (
        <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-border">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
