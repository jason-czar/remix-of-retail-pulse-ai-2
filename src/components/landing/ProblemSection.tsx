import { TrendingUp, MessageSquare, AlertTriangle } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";
export function ProblemSection() {
  return <section className="py-20 lg:py-28 landing-section-contained">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Problem Statement */}
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display mb-6 text-balance">
              The Problem
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed text-balance">
              Retail investors now move markets. Their sentiment can create short squeezes, amplify momentum, or signal regime changes - yet most institutional players lack systematic ways to monitor and interpret this signal at scale.
            </p>
          </ScrollReveal>

          {/* Challenge Cards */}
          <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.15}>
            <StaggerItem>
              <ChallengeCard icon={TrendingUp} title="Market-Moving Retail Activity" description="Retail flows have grown to represent a significant share of daily volume in many stocks, yet remain poorly understood." />
            </StaggerItem>
            <StaggerItem>
              <ChallengeCard icon={MessageSquare} title="Signal Buried in Noise" description="Millions of social posts daily contain valuable sentiment and narrative signals, but extracting them requires specialized infrastructure." />
            </StaggerItem>
            <StaggerItem>
              <ChallengeCard icon={AlertTriangle} title="Delayed Response" description="By the time retail sentiment shifts surface in price, it's often too late to act on the underlying opportunity or risk." />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </div>
    </section>;
}
function ChallengeCard({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return <div className="glass-card p-6 hover:shadow-glow transition-all duration-300 h-full">
      <div className="inline-flex p-2.5 rounded-lg bg-primary/10 mb-4">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>;
}