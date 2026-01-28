import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Check, X, Users, Briefcase, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Platform",
    price: "$2k–$3k",
    period: "/ month",
    description: "Self-serve intelligence for data-driven teams",
    icon: Users,
    features: [
      "Self-serve access to dashboards",
      "Real-time alerts & notifications",
      "Data exports & API access",
      "Customer owns interpretation",
    ],
    buyer: "Analyst, Manager, or Ops / Investor Relations",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    name: "Managed Intelligence",
    price: "$5k–$10k",
    period: "/ month",
    description: "Configured intelligence with ongoing insight delivery",
    icon: Briefcase,
    features: [
      "Everything in Platform",
      "Full platform configuration",
      "Ongoing monitoring & insight briefs",
      "You own interpretation",
    ],
    buyer: "Director, VP, Head of Strategy / Comms / IR",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    popular: true,
  },
  {
    name: "Executive / Board",
    price: "$15k–$25k",
    period: "/ month",
    description: "Board-ready intelligence with executive accountability",
    icon: Crown,
    features: [
      "Everything in Managed Intelligence",
      "Board-ready decks & executive memos",
      "Scenario analysis & modeling",
      "On-call advisory support",
      "Executive-level accountability",
    ],
    buyer: "C-suite (CEO, CFO, CCO) or Board",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
];

const comparisonFeatures = [
  { category: "Access & Dashboards", features: [
    { name: "Self-serve dashboards", platform: true, managed: true, executive: true },
    { name: "Real-time alerts & notifications", platform: true, managed: true, executive: true },
    { name: "Data exports", platform: true, managed: true, executive: true },
    { name: "API access", platform: true, managed: true, executive: true },
  ]},
  { category: "Configuration & Setup", features: [
    { name: "Full platform configuration", platform: false, managed: true, executive: true },
    { name: "Custom dashboards & views", platform: false, managed: true, executive: true },
  ]},
  { category: "Intelligence & Insights", features: [
    { name: "Ongoing monitoring", platform: false, managed: true, executive: true },
    { name: "Insight briefs", platform: false, managed: true, executive: true },
    { name: "Board-ready decks", platform: false, managed: false, executive: true },
    { name: "Executive memos", platform: false, managed: false, executive: true },
  ]},
  { category: "Advisory & Support", features: [
    { name: "Scenario analysis & modeling", platform: false, managed: false, executive: true },
    { name: "On-call advisory support", platform: false, managed: false, executive: true },
    { name: "Executive-level accountability", platform: false, managed: false, executive: true },
  ]},
];

const glassCardClasses = cn(
  "rounded-2xl p-6 md:p-8",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  "border border-black/[0.08] dark:border-white/[0.06]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
  "transition-all duration-300",
  "hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]",
  "hover:-translate-y-1"
);

const glassTableClasses = cn(
  "rounded-2xl overflow-hidden",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  "border border-black/[0.08] dark:border-white/[0.06]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]"
);

const glassCTAClasses = cn(
  "rounded-2xl p-8",
  "bg-white/45 dark:bg-white/[0.04]",
  "backdrop-blur-[12px] backdrop-saturate-[120%]",
  "border border-primary/20 dark:border-primary/15"
);

function FeatureCheck({ included }: { included: boolean }) {
  return included ? (
    <Check className="h-5 w-5 text-bullish mx-auto" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16 md:py-24">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display mb-4">
            Sample <span className="text-gradient">Pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Retail sentiment intelligence tailored to your decision-making needs.
            Choose the tier that matches your accountability level.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                glassCardClasses,
                "relative group",
                tier.popular && "ring-2 ring-primary/50 dark:ring-primary/40"
              )}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={cn("inline-flex p-3 rounded-xl mb-4", tier.iconBg)}>
                <tier.icon className={cn("h-6 w-6", tier.iconColor)} />
              </div>

              {/* Tier Name */}
              <h3 className="text-xl font-display font-semibold mb-2">{tier.name}</h3>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-3xl md:text-4xl font-display font-bold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-bullish mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Buyer Section */}
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Ideal Buyer
                </p>
                <p className="text-sm font-medium">{tier.buyer}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-24 max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display text-center mb-8">
            Feature <span className="text-gradient">Comparison</span>
          </h2>
          
          <div className={glassTableClasses}>
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 p-4 md:p-6 border-b border-black/[0.06] dark:border-white/[0.06] bg-white/30 dark:bg-white/[0.02]">
              <div className="font-medium text-muted-foreground">Features</div>
              <div className="text-center">
                <div className="font-display font-semibold text-blue-500">Platform</div>
                <div className="text-xs text-muted-foreground">$2k–$3k/mo</div>
              </div>
              <div className="text-center">
                <div className="font-display font-semibold text-primary">Managed</div>
                <div className="text-xs text-muted-foreground">$5k–$10k/mo</div>
              </div>
              <div className="text-center">
                <div className="font-display font-semibold text-amber-500">Executive</div>
                <div className="text-xs text-muted-foreground">$15k–$25k/mo</div>
              </div>
            </div>

            {/* Table Body */}
            {comparisonFeatures.map((category, catIdx) => (
              <div key={category.category}>
                {/* Category Header */}
                <div className="px-4 md:px-6 py-3 bg-white/20 dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-sm font-medium">{category.category}</span>
                </div>
                
                {/* Features */}
                {category.features.map((feature, idx) => (
                  <div 
                    key={feature.name}
                    className={cn(
                      "grid grid-cols-4 gap-4 px-4 md:px-6 py-3",
                      (idx !== category.features.length - 1 || catIdx !== comparisonFeatures.length - 1) &&
                        "border-b border-black/[0.04] dark:border-white/[0.04]"
                    )}
                  >
                    <div className="text-sm text-muted-foreground">{feature.name}</div>
                    <div><FeatureCheck included={feature.platform} /></div>
                    <div><FeatureCheck included={feature.managed} /></div>
                    <div><FeatureCheck included={feature.executive} /></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 max-w-2xl mx-auto">
          <div className={glassCTAClasses}>
            <h2 className="text-xl md:text-2xl font-display mb-3">
              Ready to see intelligence in action?
            </h2>
            <p className="text-muted-foreground mb-6">
              Schedule a consultation to explore which tier fits your organization's needs.
            </p>
            <a
              href="mailto:contact@derivestreet.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
