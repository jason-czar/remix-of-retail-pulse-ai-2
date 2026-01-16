import { Link } from "react-router-dom";
import { ArrowRight, Building2, Handshake, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const LearnMorePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4 border-b border-border/30">
          <div className="container max-w-3xl mx-auto">
            <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
              How Retail Sentiment Becomes Strategic Intelligence
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
              Retail Sentiment Is No Longer Noise — It's a Leading Indicator
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Retail investor conversations increasingly influence short-term volatility, narrative momentum, 
              deal reception, leadership credibility, and capital allocation outcomes. Signals Street exists 
              to translate those conversations into structured, decision-grade intelligence — not raw sentiment dashboards.
            </p>
          </div>
        </section>

        {/* The Core Insight */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30 bg-muted/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Institutional Research Explains the Past.<br />
              <span className="text-primary">Retail Narratives Reveal What's Next.</span>
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Analysts model fundamentals. Price reflects execution. But narratives determine reaction.
              </p>
              <p>
                Retail investors surface expectations before announcements, skepticism before deals fail, 
                and conviction before momentum accelerates. They reveal the interpretive layer — the story 
                investors tell themselves about what's happening and what it means.
              </p>
              <p className="text-foreground font-medium">
                Signals Street captures that layer before it appears in price.
              </p>
            </div>
          </div>
        </section>

        {/* What Narrative Intelligence Means */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              From Sentiment to Narrative Intelligence
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Simple bullish/bearish metrics tell you direction. Narrative intelligence tells you <em>why</em>.
              </p>
              <div className="grid md:grid-cols-2 gap-6 my-8">
                <div className="p-5 rounded-lg bg-muted/50 border border-border/30">
                  <h3 className="font-semibold text-foreground mb-3">What We Track</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Dominant belief clusters</li>
                    <li>• Narrative prevalence across conversations</li>
                    <li>• Narrative momentum (accelerating vs decaying)</li>
                    <li>• Emotional drivers (fear vs conviction vs excitement)</li>
                  </ul>
                </div>
                <div className="p-5 rounded-lg bg-muted/50 border border-border/30">
                  <h3 className="font-semibold text-foreground mb-3">The Question We Answer</h3>
                  <p className="text-sm">
                    We don't ask "are investors bullish?"<br /><br />
                    We ask "what do investors believe — and how fast is that belief spreading?"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Psychology Layer */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30 bg-muted/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Retail Psychology Moves Faster Than Models
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Signals Street analyzes emotion composition — fear, greed, frustration, confidence — 
                and distinguishes conviction from sarcasm from low-signal chatter.
              </p>
              <div className="p-5 rounded-lg border border-border/30 bg-background my-8">
                <h3 className="font-semibold text-foreground mb-3">Key Behavioral Patterns</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span><strong>Emotional compression</strong> often precedes breakouts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span><strong>Emotional divergence</strong> often precedes reversals</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span><strong>Emotional volatility</strong> signals regime change</span>
                  </li>
                </ul>
              </div>
              <p className="text-foreground font-medium">
                This is behavioral finance at scale, not sentiment scoring.
              </p>
            </div>
          </div>
        </section>

        {/* Strategic Translation */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Turning Social Signals Into Strategic Foresight
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                The platform detects emerging risks before announcements, pressure-tests decisions 
                before execution, and surfaces misalignment between leadership intent and investor interpretation.
              </p>
              <div className="my-8 space-y-4">
                <h3 className="font-semibold text-foreground">In Practice</h3>
                <ul className="space-y-3 text-sm">
                  <li className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    M&A skepticism detected weeks before official announcement
                  </li>
                  <li className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    Capital allocation narratives turning negative before earnings
                  </li>
                  <li className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    Leadership credibility erosion visible in conversation patterns
                  </li>
                  <li className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    Competitive repositioning signals emerging from investor discourse
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* From Consulting to Software */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30 bg-muted/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              From Bespoke Consulting to Autonomous Intelligence
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                RetailCzar delivered this analysis manually through custom research and advisory engagements. 
                Signals Street automates the same logic — continuously and objectively.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 my-8">
                <div className="p-4 rounded-lg bg-background border border-border/30 text-center">
                  <p className="text-sm font-medium text-foreground">No analyst bias</p>
                </div>
                <div className="p-4 rounded-lg bg-background border border-border/30 text-center">
                  <p className="text-sm font-medium text-foreground">No selective reading</p>
                </div>
                <div className="p-4 rounded-lg bg-background border border-border/30 text-center">
                  <p className="text-sm font-medium text-foreground">No lag</p>
                </div>
              </div>
              <p className="text-foreground font-medium">
                Signals Street is a real-time strategic sensing layer — always on.
              </p>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
              Who This Is For
            </h2>
            <div className="grid gap-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Corporate Strategy Teams</h3>
                  <p className="text-sm text-muted-foreground">
                    Understand how strategy is being interpreted externally. Identify narrative risk before capital is committed.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Investment Banks & Deal Teams</h3>
                  <p className="text-sm text-muted-foreground">
                    Forecast market reaction before deals go public. Strengthen valuation and messaging logic.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Investor Relations</h3>
                  <p className="text-sm text-muted-foreground">
                    Detect perception gaps early. Prepare leadership for the questions investors will ask.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What This Is Not */}
        <section className="py-16 md:py-20 px-4 border-b border-border/30 bg-muted/30">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              What This Platform Is Not
            </h2>
            <ul className="space-y-3 text-muted-foreground mb-8">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                Not social listening software
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                Not retail trading signals
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                Not hype-driven sentiment dashboards
              </li>
            </ul>
            <p className="text-foreground font-medium">
              Signals Street exists to provide clarity, foresight, and decision confidence — not noise.
            </p>
          </div>
        </section>

        {/* Closing */}
        <section className="py-16 md:py-24 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Executives Don't Need More Data.<br />
              <span className="text-primary">They Need Foresight.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Signals Street delivers structured intelligence from the fastest-moving investor segment 
              in the market — so decisions are informed before reactions occur.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/symbol/AAPL">
                  See an Example
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/signup">
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LearnMorePage;
