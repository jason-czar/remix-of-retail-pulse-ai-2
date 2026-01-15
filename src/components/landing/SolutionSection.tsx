import { Brain, Zap, BarChart3, LineChart } from "lucide-react";

export function SolutionSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display mb-4">
              Our Solution
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              SentimentIQ transforms millions of retail investor conversations into 
              actionable intelligence for institutional decision-makers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <SolutionCard
              icon={Brain}
              title="Narrative Intelligence"
              description="AI-powered extraction of the dominant themes, stories, and catalysts driving retail conversation for any symbol."
              bullets={[
                "Top 10 narratives ranked by prevalence",
                "Narrative momentum tracking over time",
                "Representative posts for qualitative review"
              ]}
            />
            <SolutionCard
              icon={LineChart}
              title="Emotion Analysis"
              description="Go beyond bullish/bearish. Understand the nuanced emotional composition of retail sentiment."
              bullets={[
                "Fear, greed, excitement, frustration detection",
                "Conviction scoring and sarcasm filtering",
                "Emotion momentum for regime change signals"
              ]}
            />
            <SolutionCard
              icon={Zap}
              title="Real-Time Alerts"
              description="Never miss a sentiment shift. Configure custom triggers based on your unique criteria."
              bullets={[
                "Sentiment flip detection",
                "Volume surge alerts",
                "Narrative emergence notifications"
              ]}
            />
            <SolutionCard
              icon={BarChart3}
              title="Historical Analytics"
              description="Analyze patterns across multiple timeframes to identify recurring behaviors and signals."
              bullets={[
                "1H, 6H, 24H, 7D, 30D views",
                "Sentiment-to-price correlation",
                "Historical narrative impact scoring"
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SolutionCard({
  icon: Icon,
  title,
  description,
  bullets
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-start gap-4">
        <div className="shrink-0 inline-flex p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
          <ul className="space-y-2">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
