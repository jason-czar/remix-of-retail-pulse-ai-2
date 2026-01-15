import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Landmark, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function AudienceSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Corporate Strategy */}
          <AudienceBlock
            icon={Building2}
            title="For Corporate Strategy"
            subtitle="Understand how retail investors perceive your company and competitors in real-time."
            description="Monitor narrative shifts around your brand, track sentiment changes after announcements, and identify emerging themes before they hit mainstream coverage. Our platform gives strategy teams the retail perspective they need for informed decision-making."
            bullets={[
              "Track narrative evolution around key announcements",
              "Monitor competitive sentiment positioning",
              "Identify emerging retail concerns or opportunities"
            ]}
            cta="Learn More"
            ctaLink="/signup"
          />

          {/* Investment Banks */}
          <AudienceBlock
            icon={Landmark}
            title="For Investment Banks"
            subtitle="Incorporate retail sentiment into deal intelligence and market analysis."
            description="Enhance your research coverage with systematic retail sentiment data. Understand how retail positioning may impact pricing, timing, and execution of transactions. Give your clients an edge with insights they can't get elsewhere."
            bullets={[
              "Systematic retail sentiment for research coverage",
              "Deal intelligence and market timing signals",
              "Differentiated insights for client presentations"
            ]}
            cta="Contact Sales"
            ctaLink="/signup"
            reverse
          />

          {/* Investor Relations */}
          <AudienceBlock
            icon={Users}
            title="For Investor Relations"
            subtitle="Stay ahead of retail investor perception and engagement."
            description="Track how retail investors discuss your company, identify the narratives driving sentiment, and prepare for questions before they arise. Our platform helps IR teams understand their retail shareholder base like never before."
            bullets={[
              "Real-time retail perception monitoring",
              "Narrative tracking for proactive communication",
              "Sentiment trend analysis for board reporting"
            ]}
            cta="Get Started"
            ctaLink="/signup"
          />
        </div>
      </div>
    </section>
  );
}

function AudienceBlock({
  icon: Icon,
  title,
  subtitle,
  description,
  bullets,
  cta,
  ctaLink,
  reverse = false
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  cta: string;
  ctaLink: string;
  reverse?: boolean;
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-2xl font-display mb-2">{title}</h3>
        <p className="text-primary font-medium mb-4">{subtitle}</p>
        <p className="text-muted-foreground mb-6 leading-relaxed">{description}</p>
        <Link to={ctaLink}>
          <Button variant="outline" className="group backdrop-blur-sm">
            {cta}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
      <div className={`glass-card p-6 ${reverse ? 'lg:order-1' : ''}`}>
        <h4 className="font-semibold mb-4">Key Benefits</h4>
        <ul className="space-y-3">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-xs font-medium text-primary">{i + 1}</span>
              </div>
              <span className="text-sm text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
