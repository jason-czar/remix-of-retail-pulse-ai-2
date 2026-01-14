import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring retail sentiment data",
    features: [
      "100 API calls/day",
      "5 symbols on watchlist",
      "15-minute delayed data",
      "Basic sentiment scores",
      "Community support"
    ],
    cta: "Start Free",
    popular: false
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "Real-time intelligence for active traders",
    features: [
      "10,000 API calls/day",
      "Unlimited watchlists",
      "Real-time data streaming",
      "Narrative & emotion analysis",
      "Custom alerts (email + in-app)",
      "Historical data (90 days)",
      "Priority support"
    ],
    cta: "Start Pro Trial",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For funds and institutions needing scale",
    features: [
      "Unlimited API calls",
      "Dedicated infrastructure",
      "Custom data pipelines",
      "Webhook integrations",
      "Full historical archive",
      "Custom reports & exports",
      "Dedicated account manager",
      "SLA guarantees"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

export function PricingSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free and scale as your needs grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  popular
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}) {
  return (
    <Card className={`relative p-6 glass-card ${popular ? "border-primary shadow-glow" : ""}`}>
      {popular && (
        <Badge variant="trending" className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Sparkles className="h-3 w-3 mr-1" />
          Most Popular
        </Badge>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-display">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link to="/signup">
        <Button 
          variant={popular ? "hero" : "outline"} 
          className="w-full"
        >
          {cta}
        </Button>
      </Link>
    </Card>
  );
}
