import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const patterns = [
  {
    title: "Strategic Innovation Signal",
    signal: "Retail narratives showed rising frustration with perceived stagnation, with a dominant \"losing ground\" theme accelerating week-over-week.",
    implication: "Intelligence indicated that a public innovation commitment could reset narrative trajectory before institutional concern materialized.",
    outcomes: [
      "Retail sentiment shifted +56% toward innovation within 30 days",
      "Discussions reframed from \"stagnant\" to \"positioning for the future\"",
      "Bullish mentions increased 3× in the following quarter"
    ]
  },
  {
    title: "Capital Reallocation Signal",
    signal: "Retail investors consistently called for divestiture of declining legacy assets, with unusually high narrative alignment.",
    implication: "Data suggested asset sales and transparent capital redeployment would be rewarded by the retail base.",
    outcomes: [
      "Stock price increased 34% from announcement to completion",
      "Retail \"hold\" ratings rose from 42% to 71%",
      "Sentiment shifted from \"legacy drag\" to \"smart pivot\""
    ]
  },
  {
    title: "M&A Skepticism Signal",
    signal: "Pre-announcement sentiment analysis revealed concentrated skepticism around valuation and synergy credibility.",
    implication: "Intelligence supported restructuring deal terms to directly address surfaced objections.",
    outcomes: [
      "Positive retail sentiment reached 68% within 48 hours",
      "Discussions praised \"disciplined deal structure\"",
      "Stock held steady vs. expected 8–12% decline"
    ]
  },
  {
    title: "Leadership Credibility Signal",
    signal: "Negative sentiment clustered around leadership effectiveness within an underperforming business unit.",
    implication: "Data supported decisive leadership change paired with transparent turnaround commitments.",
    outcomes: [
      "Retail sentiment improved 41 points within 60 days",
      "Conversations shifted from criticism to confidence",
      "Stock gained 18% in the following quarter"
    ]
  }
];

export function IntelligencePatternsSection() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-display mb-4">
              Intelligence Patterns
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real strategic scenarios where retail sentiment intelligence revealed actionable foresight before market reaction.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {patterns.map((pattern) => (
              <PatternCard key={pattern.title} {...pattern} />
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link 
              to="/learn-more#intelligence-patterns" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              Explore full intelligence patterns
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PatternCard({
  title,
  signal,
  implication,
  outcomes
}: {
  title: string;
  signal: string;
  implication: string;
  outcomes: string[];
}) {
  return (
    <div className="glass-card p-6 h-full">
      <h3 className="text-base font-semibold mb-4">{title}</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Signal Detected
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {signal}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Strategic Implication
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {implication}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Observed Outcome
          </p>
          <ul className="space-y-1">
            {outcomes.map((outcome, index) => (
              <li key={index} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                <span className="text-primary mt-1.5 text-[6px]">●</span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
