import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Check, Users, Briefcase, Crown } from "lucide-react";

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
    buyer: "Analyst, Manager, or Ops / IR",
    accent: "from-blue-500/20 to-cyan-500/20",
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
    accent: "from-primary/20 to-violet-500/20",
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
    accent: "from-amber-500/20 to-orange-500/20",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
];

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
              className={`relative group rounded-2xl p-6 md:p-8 transition-all duration-300
                bg-white/92 dark:bg-[hsl(0_0%_20%/0.65)]
                backdrop-blur-xl
                border border-black/[0.08] dark:border-white/[0.15]
                shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]
                hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)]
                hover:-translate-y-1
                ${tier.popular ? "ring-2 ring-primary/50 dark:ring-primary/40" : ""}
              `}
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
              <div className={`inline-flex p-3 rounded-xl ${tier.iconBg} mb-4`}>
                <tier.icon className={`h-6 w-6 ${tier.iconColor}`} />
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
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Ideal Buyer
                </p>
                <p className="text-sm font-medium">{tier.buyer}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 max-w-2xl mx-auto">
          <div className="rounded-2xl p-8 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <h2 className="text-xl md:text-2xl font-display mb-3">
              Ready to see intelligence in action?
            </h2>
            <p className="text-muted-foreground mb-6">
              Schedule a consultation to explore which tier fits your organization's needs.
            </p>
            <a
              href="mailto:contact@signalsstreet.com"
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
