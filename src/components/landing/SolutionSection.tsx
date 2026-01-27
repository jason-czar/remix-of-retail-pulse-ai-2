import { Brain, Zap, BarChart3, LineChart } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

export function SolutionSection() {
  return (
    <section className="py-20 lg:py-28 relative">
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display mb-4 text-balance">
              Our Solution
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Derive Street transforms millions of retail investor conversations into 
              actionable intelligence for institutional decision-makers.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 gap-6" staggerDelay={0.12}>
            <StaggerItem>
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
            </StaggerItem>
            <StaggerItem>
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
            </StaggerItem>
            <StaggerItem>
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
            </StaggerItem>
            <StaggerItem>
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
            </StaggerItem>
          </StaggerContainer>
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
    <div className="glass-card p-6 hover:shadow-glow transition-all duration-300 group h-full">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="shrink-0 inline-flex p-3 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors w-fit">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
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
