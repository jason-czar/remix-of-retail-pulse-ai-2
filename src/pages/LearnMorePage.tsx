import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Handshake, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Case study data
const caseStudies = [
  {
    category: "Corporate Strategy",
    categoryColor: "bg-primary",
    title: "Strategic Innovation Investment Fund",
    sentimentSignal: "Retail investors viewed company as mature incumbent losing ground to nimbler competitors. Sentiment data showed declining confidence in innovation capability.",
    insight: "Signals Street identified a growing 'stagnant' narrative cluster with 34% prevalence, accelerating week-over-week. Emotional composition shifted toward frustration.",
    strategicImplication: "Intelligence suggested public commitment to innovation could reset narrative trajectory and improve sentiment before institutional concern materialized.",
    investorResponse: [
      "Retail sentiment shifted 56% more positive on innovation within 30 days of announcement",
      "Discussions pivoted from 'stagnant' to 'positioning for AI future'",
      "StockTwits 'bullish' mentions increased 3x in following quarter"
    ]
  },
  {
    category: "Capital Markets",
    categoryColor: "bg-accent",
    title: "Divested Legacy Assets to Fund Digital Growth",
    sentimentSignal: "Retail investors repeatedly called for divestiture of declining broadcast assets to reduce debt and pivot to streaming. Sentiment analysis showed 78% of discussions mentioned 'sell the stations.'",
    insight: "Narrative coherence score reached 0.82 on divestiture theme — unusually high alignment. Platform detected conviction-driven language patterns rather than speculation.",
    strategicImplication: "Data indicated retail base would respond positively to asset sale announcement. Phased communication strategy could build momentum.",
    investorResponse: [
      "Stock price increased 34% from announcement to completion",
      "Retail 'hold' ratings increased from 42% to 71% during transition",
      "Social sentiment shifted from 'legacy dinosaur' to 'smart pivot'"
    ]
  },
  {
    category: "M&A Intelligence",
    categoryColor: "bg-chart-2",
    title: "Restructured M&A Approach Based on Retail Skepticism",
    sentimentSignal: "Sentiment analysis of planned $500M acquisition revealed 72% negative retail response in pre-announcement testing. Investors questioned premium and saw integration risk.",
    insight: "Decision Lens overlay showed M&A skepticism concentrated on valuation and synergy doubts. Historical pattern matching predicted 8-12% decline on announcement.",
    strategicImplication: "Intelligence suggested restructuring deal terms — performance earn-outs and reduced upfront payment could address specific objections surfaced in retail discourse.",
    investorResponse: [
      "68% positive retail sentiment within 48 hours vs. 28% in initial testing",
      "Discussions praised 'disciplined deal structure' and 'smart valuation'",
      "Stock held steady through announcement vs. expected 8-12% decline"
    ]
  },
  {
    category: "Leadership Change",
    categoryColor: "bg-primary",
    title: "Replaced Underperforming Business Unit Leadership",
    sentimentSignal: "Retail sentiment analysis revealed 67% of negative discussions centered on 'weak leadership' in struggling division. Investors openly called for management change.",
    insight: "Emotion momentum showed frustration accelerating while confidence declined. Narrative tracking identified specific leadership concerns versus general business pessimism.",
    strategicImplication: "Data supported decisive leadership action with external credibility. Platform showed retail preference for transparency and measurable turnaround commitments.",
    investorResponse: [
      "Retail sentiment improved 41 points within 60 days of announcement",
      "StockTwits discussions shifted from 'fire the CEO' to 'finally taking action'",
      "Stock gained 18% in quarter following leadership change"
    ]
  },
  {
    category: "Investor Relations",
    categoryColor: "bg-chart-3",
    title: "Pivoted Earnings Message to Address Growth Concerns",
    sentimentSignal: "Sentiment data showed retail investors fixated on decelerating growth rate despite strong fundamentals. 82% of discussions questioned TAM and unit economics.",
    insight: "Narrative intelligence revealed 'growth story' fatigue — investors wanted profitability messaging. Decision readiness score for 'earnings pivot' was elevated.",
    strategicImplication: "Intelligence supported reframing from 'growth story' to 'profitability inflection.' Lead with margin expansion, free cash flow guidance, and unit economics.",
    investorResponse: [
      "Post-earnings sentiment improved 42% vs. previous quarter",
      "Discussions shifted from 'growth slowing' to 'cash flow machine'",
      "Stock volatility dropped 28% in week following earnings"
    ]
  },
  {
    category: "Capital Allocation",
    categoryColor: "bg-accent",
    title: "Exited Underperforming Geographic Market",
    sentimentSignal: "Sentiment tracking revealed retail investors consistently questioned money-losing European expansion. 71% of bearish posts cited 'bleeding cash in Europe.'",
    insight: "Narrative prevalence for 'European exit' grew from 12% to 38% over three months. Platform detected increasing conviction and emotional intensity around this theme.",
    strategicImplication: "Intelligence supported full market exit with capital redeployment narrative. Transparent communication of rationale aligned with retail expectations.",
    investorResponse: [
      "Retail sentiment shifted 52% more positive within 45 days",
      "Discussions praised 'cutting losses' and 'disciplined capital allocation'",
      "Stock gained 23% from announcement through execution"
    ]
  }
];

const CaseStudiesSection = () => {
  const [showAll, setShowAll] = useState(false);
  const displayedStudies = showAll ? caseStudies : caseStudies.slice(0, 3);

  return (
    <section className="py-16 md:py-20 px-4 border-b border-border/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Intelligence Patterns
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real strategic scenarios where retail sentiment intelligence revealed actionable foresight.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedStudies.map((study, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 backdrop-blur-sm p-6 flex flex-col h-full hover:border-border transition-colors"
            >
              {/* Category Badge */}
              <span className={`inline-flex self-start px-2.5 py-1 rounded-md text-xs font-medium text-primary-foreground ${study.categoryColor} mb-4`}>
                {study.category}
              </span>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-4 leading-tight">
                {study.title}
              </h3>

              {/* Sentiment Signal */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Sentiment Signal
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {study.sentimentSignal}
                </p>
              </div>

              {/* Platform Insight */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Platform Insight
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {study.insight}
                </p>
              </div>

              {/* Strategic Implication */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">
                  Strategic Implication
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {study.strategicImplication}
                </p>
              </div>

              {/* Investor Response */}
              <div className="mt-auto pt-4 border-t border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Investor Response
                </p>
                <ul className="space-y-2">
                  {study.investorResponse.map((response, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{response}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Show More/Less Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
          >
            {showAll ? "Show Less" : "Show More"}
            {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-8 max-w-2xl mx-auto">
          Case studies reflect aggregated examples derived from real sentiment patterns and strategic scenarios. 
          Company identities and proprietary details are anonymized. Metrics are illustrative; actual results vary by situation.
        </p>
      </div>
    </section>
  );
};

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

        {/* Case Studies Section */}
        <CaseStudiesSection />

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
