import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Scale, Shield, AlertTriangle, CreditCard, Ban, Globe, Gavel, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompactFooter } from "@/components/layout/CompactFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TermsPage() {
  const lastUpdated = "January 29, 2026";
  const effectiveDate = "January 29, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-50 border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Legal Documentation
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Scale className="h-4 w-4" />
            Legal Agreement
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Please read these terms carefully before using DeriveStreet. By accessing or using our platform, you agree to be bound by these terms.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span>Last Updated: {lastUpdated}</span>
            <span className="text-border">•</span>
            <span>Effective: {effectiveDate}</span>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Acceptance", href: "#acceptance" },
              { label: "Services", href: "#services" },
              { label: "User Accounts", href: "#accounts" },
              { label: "Subscriptions", href: "#subscriptions" },
              { label: "Prohibited Use", href: "#prohibited" },
              { label: "Intellectual Property", href: "#ip" },
              { label: "Disclaimers", href: "#disclaimers" },
              { label: "Contact", href: "#contact" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm text-center transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Terms Content */}
        <div className="space-y-8">
          {/* Section 1: Acceptance of Terms */}
          <section id="acceptance" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">Foundation of our legal agreement</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and DeriveStreet, Inc. ("DeriveStreet," "Company," "we," "us," or "our") governing your access to and use of the DeriveStreet platform, including our website at derivestreet.com, mobile applications, APIs, and all related services (collectively, the "Services").
              </p>
              
              <p>
                <strong>By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms.</strong> If you do not agree to these Terms, you must not access or use our Services.
              </p>

              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="eligibility">
                  <AccordionTrigger className="text-left">1.1 Eligibility Requirements</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>To use our Services, you must:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Be at least 18 years of age or the age of legal majority in your jurisdiction</li>
                      <li>Have the legal capacity to enter into a binding contract</li>
                      <li>Not be prohibited from using the Services under applicable laws</li>
                      <li>Not have been previously suspended or removed from our Services</li>
                      <li>Provide accurate, current, and complete registration information</li>
                    </ul>
                    <p>
                      If you are using the Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="modifications">
                  <AccordionTrigger className="text-left">1.2 Modifications to Terms</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We reserve the right to modify these Terms at any time at our sole discretion. When we make material changes, we will:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Update the "Last Updated" date at the top of these Terms</li>
                      <li>Notify you via email or through a prominent notice on our platform</li>
                      <li>Provide at least 30 days' notice before material changes take effect</li>
                    </ul>
                    <p>
                      Your continued use of the Services after any modifications indicates your acceptance of the updated Terms. If you do not agree to the modified Terms, you must discontinue using the Services.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 2: Description of Services */}
          <section id="services" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">2. Description of Services</h2>
                <p className="text-muted-foreground">What DeriveStreet provides</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                DeriveStreet is a market intelligence platform that provides sentiment analysis, narrative tracking, and psychological insights derived from social media discussions about publicly traded securities. Our Services include:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 my-6">
                {[
                  { title: "Sentiment Analysis", desc: "Real-time analysis of market sentiment from social media sources" },
                  { title: "Narrative Intelligence", desc: "Identification and tracking of emerging market narratives" },
                  { title: "Decision Lenses", desc: "AI-powered insights tailored to specific investment perspectives" },
                  { title: "Historical Analytics", desc: "Historical sentiment and narrative trend data" },
                  { title: "Alert Systems", desc: "Customizable notifications for sentiment changes" },
                  { title: "API Access", desc: "Programmatic access to our data and analytics" },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <h4 className="font-medium mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="not-advice">
                  <AccordionTrigger className="text-left">2.1 Not Investment Advice</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p className="font-semibold text-destructive">
                      IMPORTANT: DeriveStreet does NOT provide investment advice, financial advice, trading advice, or any other form of professional financial guidance.
                    </p>
                    <p>
                      All information, data, analysis, and insights provided through our Services are for informational and educational purposes only. The content on our platform:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Should not be construed as a recommendation to buy, sell, or hold any security</li>
                      <li>Does not constitute a solicitation or offer to buy or sell securities</li>
                      <li>Is not personalized to your specific financial situation or investment objectives</li>
                      <li>Should not be the sole basis for any investment decision</li>
                    </ul>
                    <p>
                      You should consult with a qualified financial advisor before making any investment decisions. Past performance of any security or market indicator is not indicative of future results.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="data-sources">
                  <AccordionTrigger className="text-left">2.2 Data Sources and Accuracy</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Our Services aggregate and analyze data from various third-party sources, including social media platforms, financial data providers, and other publicly available sources. While we strive for accuracy:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>We do not guarantee the accuracy, completeness, or timeliness of any data</li>
                      <li>Third-party data may contain errors, omissions, or delays</li>
                      <li>Sentiment analysis and AI-generated insights are probabilistic, not deterministic</li>
                      <li>Historical data may be subject to revision or correction</li>
                    </ul>
                    <p>
                      You acknowledge that reliance on any information provided through our Services is at your own risk.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="availability">
                  <AccordionTrigger className="text-left">2.3 Service Availability</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We strive to maintain high availability of our Services but cannot guarantee uninterrupted access. We reserve the right to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Modify, suspend, or discontinue any part of the Services at any time</li>
                      <li>Perform scheduled or emergency maintenance</li>
                      <li>Limit features or access based on subscription tier</li>
                      <li>Impose usage limits or rate restrictions</li>
                    </ul>
                    <p>
                      We will endeavor to provide advance notice of significant changes or planned downtime when possible.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 3: User Accounts */}
          <section id="accounts" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">3. User Accounts</h2>
                <p className="text-muted-foreground">Account creation and responsibilities</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                To access certain features of our Services, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>

              <Accordion type="single" collapsible>
                <AccordionItem value="security">
                  <AccordionTrigger className="text-left">3.1 Account Security</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>You are responsible for:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Maintaining the confidentiality of your account credentials</li>
                      <li>All activities that occur under your account</li>
                      <li>Immediately notifying us of any unauthorized access or security breach</li>
                      <li>Ensuring your account information is accurate and up to date</li>
                    </ul>
                    <p>
                      We recommend using a strong, unique password and enabling two-factor authentication when available. You agree not to share your account credentials with third parties.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="termination">
                  <AccordionTrigger className="text-left">3.2 Account Termination</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including but not limited to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Violation of these Terms or any applicable policies</li>
                      <li>Fraudulent, abusive, or illegal activity</li>
                      <li>Non-payment of fees</li>
                      <li>Extended periods of inactivity</li>
                      <li>Upon your request</li>
                    </ul>
                    <p>
                      Upon termination, your right to use the Services will immediately cease. We may retain certain data as required by law or for legitimate business purposes.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 4: Subscriptions and Payments */}
          <section id="subscriptions" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">4. Subscriptions and Payments</h2>
                <p className="text-muted-foreground">Billing terms and subscription management</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                DeriveStreet offers various subscription plans with different features and pricing. By subscribing to a paid plan, you agree to pay all applicable fees as described at the time of purchase.
              </p>

              <Accordion type="single" collapsible>
                <AccordionItem value="billing">
                  <AccordionTrigger className="text-left">4.1 Billing and Payment</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>All fees are quoted and payable in U.S. dollars unless otherwise specified</li>
                      <li>Subscription fees are billed in advance on a recurring basis (monthly or annually)</li>
                      <li>You authorize us to charge your designated payment method for all fees</li>
                      <li>Fees are non-refundable except as expressly stated in these Terms</li>
                      <li>You are responsible for all taxes associated with your subscription</li>
                    </ul>
                    <p>
                      We use third-party payment processors to handle transactions. Your payment information is subject to their terms and privacy policies.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="changes">
                  <AccordionTrigger className="text-left">4.2 Price Changes</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We may change our subscription prices at any time. Price changes will:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Be communicated with at least 30 days' advance notice</li>
                      <li>Take effect at the start of your next billing cycle</li>
                      <li>Not affect the current billing period</li>
                    </ul>
                    <p>
                      Your continued use of the Services after a price change constitutes acceptance of the new pricing.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="cancellation">
                  <AccordionTrigger className="text-left">4.3 Cancellation and Refunds</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      You may cancel your subscription at any time through your account settings. Upon cancellation:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Your subscription will remain active until the end of the current billing period</li>
                      <li>You will not be charged for subsequent billing periods</li>
                      <li>No partial refunds will be issued for unused time in the current period</li>
                      <li>Your account will revert to the free tier after the paid period ends</li>
                    </ul>
                    <p>
                      Refunds may be issued at our sole discretion in exceptional circumstances. Contact support@derivestreet.com for refund requests.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="free-trial">
                  <AccordionTrigger className="text-left">4.4 Free Trials and Promotions</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We may offer free trials or promotional pricing from time to time. These offers:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Are subject to specific terms disclosed at the time of the offer</li>
                      <li>May require a valid payment method to activate</li>
                      <li>Will automatically convert to a paid subscription unless canceled</li>
                      <li>Are limited to one per user or household</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 5: Prohibited Conduct */}
          <section id="prohibited" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">5. Prohibited Conduct</h2>
                <p className="text-muted-foreground">Activities that violate these Terms</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                You agree not to engage in any of the following prohibited activities:
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2">Illegal Activities</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Using the Services for any unlawful purpose or in violation of any laws</li>
                    <li>Engaging in market manipulation, insider trading, or securities fraud</li>
                    <li>Money laundering or financing of illegal activities</li>
                    <li>Violating any applicable financial regulations</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2">System Abuse</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Attempting to gain unauthorized access to our systems or networks</li>
                    <li>Interfering with the proper functioning of the Services</li>
                    <li>Using automated systems (bots, scrapers) without authorization</li>
                    <li>Circumventing rate limits or access restrictions</li>
                    <li>Reverse engineering, decompiling, or disassembling our software</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2">Misuse of Data</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Redistributing, reselling, or sublicensing our data without permission</li>
                    <li>Using our data to create competing products or services</li>
                    <li>Misrepresenting the source or nature of our data</li>
                    <li>Storing or caching data beyond permitted timeframes</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2">Account Violations</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Creating multiple accounts to circumvent restrictions</li>
                    <li>Sharing account credentials with unauthorized parties</li>
                    <li>Impersonating other users or DeriveStreet personnel</li>
                    <li>Providing false information during registration</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Violation of these prohibitions may result in immediate account termination, legal action, and reporting to appropriate authorities.
              </p>
            </div>
          </section>

          {/* Section 6: Intellectual Property */}
          <section id="ip" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">6. Intellectual Property</h2>
                <p className="text-muted-foreground">Ownership and license rights</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <Accordion type="single" collapsible>
                <AccordionItem value="ownership">
                  <AccordionTrigger className="text-left">6.1 Our Intellectual Property</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      The Services and all content, features, and functionality thereof, including but not limited to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Software, code, algorithms, and data models</li>
                      <li>Text, graphics, logos, icons, and images</li>
                      <li>Audio, video, and other multimedia content</li>
                      <li>User interface design and look and feel</li>
                      <li>Documentation and marketing materials</li>
                    </ul>
                    <p>
                      Are owned by DeriveStreet, its licensors, or other providers and are protected by copyright, trademark, patent, trade secret, and other intellectual property laws.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="license">
                  <AccordionTrigger className="text-left">6.2 License Grant</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Access and use the Services for your personal or internal business purposes</li>
                      <li>View and display content provided through the Services</li>
                      <li>Use our API in accordance with our API documentation and rate limits</li>
                    </ul>
                    <p>
                      This license does not include the right to modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell any information obtained from the Services.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="trademarks">
                  <AccordionTrigger className="text-left">6.3 Trademarks</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      "DeriveStreet," the DeriveStreet logo, and other DeriveStreet trademarks, service marks, graphics, and logos are trademarks or registered trademarks of DeriveStreet, Inc. You may not use these marks without our prior written permission.
                    </p>
                    <p>
                      Other trademarks, service marks, and logos used in connection with the Services are the trademarks of their respective owners.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="feedback">
                  <AccordionTrigger className="text-left">6.4 Feedback</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      If you provide us with any feedback, suggestions, or ideas regarding the Services ("Feedback"), you grant us a non-exclusive, worldwide, royalty-free, perpetual, irrevocable license to use, reproduce, modify, and distribute such Feedback for any purpose without attribution or compensation.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 7: Disclaimers */}
          <section id="disclaimers" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">7. Disclaimers and Limitations</h2>
                <p className="text-muted-foreground">Important legal disclaimers</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 space-y-4">
                <h4 className="font-semibold uppercase text-sm tracking-wider">Disclaimer of Warranties</h4>
                <p className="text-sm">
                  THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                </p>
                <p className="text-sm">
                  WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, THAT DEFECTS WILL BE CORRECTED, OR THAT THE SERVICES OR THE SERVERS THAT MAKE THEM AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                </p>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="liability">
                  <AccordionTrigger className="text-left">7.1 Limitation of Liability</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p className="uppercase text-sm font-medium">
                      TO THE FULLEST EXTENT PERMITTED BY LAW, DERIVESTREET SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Loss of profits, revenue, or data</li>
                      <li>Business interruption</li>
                      <li>Cost of substitute services</li>
                      <li>Investment losses or trading losses</li>
                      <li>Any other intangible losses</li>
                    </ul>
                    <p>
                      IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="investment">
                  <AccordionTrigger className="text-left">7.2 Investment Risk Disclaimer</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      INVESTING IN SECURITIES INVOLVES SUBSTANTIAL RISK OF LOSS. THE INFORMATION PROVIDED THROUGH OUR SERVICES:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Is not a substitute for professional financial advice</li>
                      <li>Should not be relied upon as the sole basis for investment decisions</li>
                      <li>May not reflect current market conditions</li>
                      <li>Is derived from social media sentiment, which may be unreliable or manipulated</li>
                    </ul>
                    <p>
                      YOU ACKNOWLEDGE THAT ANY INVESTMENT DECISIONS YOU MAKE ARE SOLELY YOUR RESPONSIBILITY AND THAT DERIVESTREET IS NOT LIABLE FOR ANY LOSSES YOU MAY INCUR.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="indemnification">
                  <AccordionTrigger className="text-left">7.3 Indemnification</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      You agree to indemnify, defend, and hold harmless DeriveStreet and its officers, directors, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Your violation of these Terms</li>
                      <li>Your use of the Services</li>
                      <li>Your violation of any rights of a third party</li>
                      <li>Your violation of any applicable laws or regulations</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 8: Governing Law */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Gavel className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">8. Governing Law and Disputes</h2>
                <p className="text-muted-foreground">Legal jurisdiction and dispute resolution</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <Accordion type="single" collapsible>
                <AccordionItem value="law">
                  <AccordionTrigger className="text-left">8.1 Governing Law</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="arbitration">
                  <AccordionTrigger className="text-left">8.2 Binding Arbitration</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Any dispute, controversy, or claim arising out of or relating to these Terms or the Services shall be resolved by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules.
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>The arbitration shall be conducted in Wilmington, Delaware</li>
                      <li>The arbitrator's decision shall be final and binding</li>
                      <li>Judgment on the award may be entered in any court of competent jurisdiction</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="class-action">
                  <AccordionTrigger className="text-left">8.3 Class Action Waiver</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p className="font-medium">
                      YOU AND DERIVESTREET AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
                    </p>
                    <p>
                      The arbitrator may not consolidate more than one person's claims and may not otherwise preside over any form of a representative or class proceeding.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 9: General Provisions */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">9. General Provisions</h2>
                <p className="text-muted-foreground">Additional terms and conditions</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <Accordion type="single" collapsible>
                <AccordionItem value="entire">
                  <AccordionTrigger className="text-left">9.1 Entire Agreement</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    These Terms, together with our Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and DeriveStreet regarding the Services and supersede all prior agreements and understandings.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="severability">
                  <AccordionTrigger className="text-left">9.2 Severability</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall be enforced to the fullest extent under law.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="waiver">
                  <AccordionTrigger className="text-left">9.3 Waiver</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of such right or provision. Any waiver must be in writing and signed by an authorized representative of DeriveStreet.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="assignment">
                  <AccordionTrigger className="text-left">9.4 Assignment</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign our rights and obligations under these Terms without restriction.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="force-majeure">
                  <AccordionTrigger className="text-left">9.5 Force Majeure</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 10: Contact */}
          <section id="contact" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">10. Contact Information</h2>
                <p className="text-muted-foreground">How to reach us</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                If you have any questions about these Terms or the Services, please contact us:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">General Inquiries</h4>
                  <p className="text-sm text-muted-foreground">
                    <a href="mailto:support@derivestreet.com" className="text-primary hover:underline">
                      support@derivestreet.com
                    </a>
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Legal Matters</h4>
                  <p className="text-sm text-muted-foreground">
                    <a href="mailto:legal@derivestreet.com" className="text-primary hover:underline">
                      legal@derivestreet.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/30 mt-4">
                <h4 className="font-medium mb-2">Mailing Address</h4>
                <p className="text-sm text-muted-foreground">
                  DeriveStreet, Inc.<br />
                  Attn: Legal Department<br />
                  251 Little Falls Drive<br />
                  Wilmington, DE 19808<br />
                  United States
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Related Links */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/privacy">
            <Button variant="outline" className="gap-2">
              <Shield className="h-4 w-4" />
              Privacy Policy
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </main>

      <CompactFooter />
    </div>
  );
}
