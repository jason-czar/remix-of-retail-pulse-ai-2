import { 
  TrendingUp, 
  Brain, 
  Zap, 
  Bell, 
  BarChart3, 
  MessageSquare,
  Target,
  Code
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Sentiment",
    description: "Track bullish vs bearish sentiment shifts as they happen across thousands of symbols.",
    color: "text-bullish"
  },
  {
    icon: Brain,
    title: "Narrative Intelligence",
    description: "AI-powered extraction of the top 10 narratives driving each symbol's conversation.",
    color: "text-chart-3"
  },
  {
    icon: Target,
    title: "Emotion Analysis",
    description: "DeepMoji-inspired detection of nuanced emotions: fear, excitement, conviction, sarcasm.",
    color: "text-chart-4"
  },
  {
    icon: Zap,
    title: "Volume Spikes",
    description: "Instant alerts when message volume surges beyond baseline thresholds.",
    color: "text-chart-5"
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Configure custom triggers for sentiment flips, narrative surges, and emotion spikes.",
    color: "text-primary"
  },
  {
    icon: BarChart3,
    title: "Historical Trends",
    description: "Analyze sentiment patterns over 1H, 6H, 24H, 7D, and 30D timeframes.",
    color: "text-chart-7"
  },
  {
    icon: MessageSquare,
    title: "Representative Posts",
    description: "Surface the most influential messages driving each narrative cluster.",
    color: "text-chart-8"
  },
  {
    icon: Code,
    title: "Developer API",
    description: "Full REST API with comprehensive documentation for building custom integrations.",
    color: "text-chart-9"
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4">
            Bloomberg-Level Intelligence for{" "}
            <span className="text-gradient">Retail Psychology</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Go beyond simple positive/negative scoring. Understand the narratives, emotions, 
            and momentum that move retail investor behavior.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color,
  index 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string;
  index: number;
}) {
  return (
    <div 
      className="group glass-card p-6 hover:shadow-glow transition-all hover:-translate-y-1"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`inline-flex p-3 rounded-lg bg-secondary/50 mb-4 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
