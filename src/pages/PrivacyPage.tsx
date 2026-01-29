import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Database, Lock, Bell, Globe, UserCheck, Cookie, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompactFooter } from "@/components/layout/CompactFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PrivacyPage() {
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
            <Shield className="h-4 w-4" />
            Legal Documentation
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Lock className="h-4 w-4" />
            Your Privacy Matters
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We are committed to protecting your privacy and being transparent about how we collect, use, and share your information.
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
              { label: "Information We Collect", href: "#collect" },
              { label: "How We Use Data", href: "#use" },
              { label: "Sharing & Disclosure", href: "#sharing" },
              { label: "Data Retention", href: "#retention" },
              { label: "Your Rights", href: "#rights" },
              { label: "Security", href: "#security" },
              { label: "Cookies", href: "#cookies" },
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

        {/* Privacy Summary Card */}
        <div className="glass-card p-6 mb-8 border-l-4 border-l-primary">
          <h3 className="font-semibold mb-3">Privacy at a Glance</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">We don't sell your data</p>
                <p className="text-muted-foreground">Your personal information is never sold to third parties.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="p-1 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Encryption in transit & at rest</p>
                <p className="text-muted-foreground">All data is encrypted using industry-standard protocols.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="p-1 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">You control your data</p>
                <p className="text-muted-foreground">Request access, correction, or deletion at any time.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Content */}
        <div className="space-y-8">
          {/* Section 1: Introduction */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">1. Introduction</h2>
                <p className="text-muted-foreground">About this Privacy Policy</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                DeriveStreet, Inc. ("DeriveStreet," "Company," "we," "us," or "our") respects your privacy and is committed to protecting it through our compliance with this Privacy Policy.
              </p>
              
              <p>
                This Privacy Policy describes the types of information we may collect from you or that you may provide when you visit derivestreet.com (our "Website"), use our mobile applications, APIs, or other services (collectively, the "Services"), and our practices for collecting, using, maintaining, protecting, and disclosing that information.
              </p>

              <p>
                This policy applies to information we collect:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>On our Website and through our Services</li>
                <li>In email, text, and other electronic messages between you and us</li>
                <li>Through mobile applications you download from us</li>
                <li>When you interact with our advertising on third-party websites</li>
                <li>Through third-party sources, such as social media platforms</li>
              </ul>

              <p>
                Please read this policy carefully to understand our policies and practices regarding your information. If you do not agree with our policies and practices, do not use our Services. By accessing or using our Services, you agree to this Privacy Policy.
              </p>
            </div>
          </section>

          {/* Section 2: Information We Collect */}
          <section id="collect" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">2. Information We Collect</h2>
                <p className="text-muted-foreground">Types of data we gather</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                We collect several types of information from and about users of our Services, including:
              </p>

              <Accordion type="single" collapsible>
                <AccordionItem value="personal">
                  <AccordionTrigger className="text-left">2.1 Personal Information</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>Information that identifies you as an individual, including:</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm mt-4">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4 font-medium">Category</th>
                            <th className="text-left py-2 font-medium">Examples</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          <tr>
                            <td className="py-3 pr-4">Identifiers</td>
                            <td className="py-3">Name, email address, username, account ID</td>
                          </tr>
                          <tr>
                            <td className="py-3 pr-4">Contact Information</td>
                            <td className="py-3">Email address, phone number, mailing address</td>
                          </tr>
                          <tr>
                            <td className="py-3 pr-4">Account Credentials</td>
                            <td className="py-3">Password (encrypted), security questions</td>
                          </tr>
                          <tr>
                            <td className="py-3 pr-4">Payment Information</td>
                            <td className="py-3">Credit card details, billing address (processed by payment providers)</td>
                          </tr>
                          <tr>
                            <td className="py-3 pr-4">Profile Information</td>
                            <td className="py-3">Company name, job title, preferences</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="usage">
                  <AccordionTrigger className="text-left">2.2 Usage Information</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>Information about how you use our Services, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Browsing Activity:</strong> Pages viewed, features used, buttons clicked, time spent</li>
                      <li><strong>Search Queries:</strong> Symbols searched, filters applied, saved preferences</li>
                      <li><strong>Watchlist Data:</strong> Symbols added to watchlists, alert configurations</li>
                      <li><strong>API Usage:</strong> Endpoints called, request frequency, response times</li>
                      <li><strong>Feature Interactions:</strong> Decision lenses used, charts viewed, exports generated</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="technical">
                  <AccordionTrigger className="text-left">2.3 Technical Information</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>Information about your device and connection, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Device Information:</strong> Device type, operating system, browser type and version</li>
                      <li><strong>Network Information:</strong> IP address, internet service provider, connection type</li>
                      <li><strong>Location Data:</strong> Approximate location based on IP address (country/region level)</li>
                      <li><strong>Session Information:</strong> Session IDs, login times, session duration</li>
                      <li><strong>Error Logs:</strong> Crash reports, performance data, debugging information</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="third-party">
                  <AccordionTrigger className="text-left">2.4 Information from Third Parties</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>We may receive information about you from third parties, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Social Login Providers:</strong> If you sign in using Google or other providers, we receive your name, email, and profile picture</li>
                      <li><strong>Analytics Providers:</strong> Aggregated usage data and insights</li>
                      <li><strong>Payment Processors:</strong> Transaction status and payment confirmation</li>
                      <li><strong>Marketing Partners:</strong> Advertising attribution and campaign performance</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 3: How We Use Information */}
          <section id="use" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">3. How We Use Your Information</h2>
                <p className="text-muted-foreground">Purposes for data processing</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                We use the information we collect about you for various purposes, including:
              </p>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                {[
                  {
                    title: "Service Delivery",
                    items: [
                      "Provide, maintain, and improve our Services",
                      "Process transactions and send related information",
                      "Create and manage your account",
                      "Deliver features you request",
                    ],
                  },
                  {
                    title: "Personalization",
                    items: [
                      "Customize your experience and content",
                      "Remember your preferences and settings",
                      "Provide personalized recommendations",
                      "Tailor analytics to your interests",
                    ],
                  },
                  {
                    title: "Communication",
                    items: [
                      "Send service-related notices and updates",
                      "Respond to your inquiries and requests",
                      "Provide customer support",
                      "Send marketing communications (with consent)",
                    ],
                  },
                  {
                    title: "Security & Compliance",
                    items: [
                      "Detect and prevent fraud and abuse",
                      "Protect the security of our Services",
                      "Comply with legal obligations",
                      "Enforce our terms and policies",
                    ],
                  },
                ].map((category) => (
                  <div key={category.title} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <h4 className="font-medium mb-3">{category.title}</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {category.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="legal-basis">
                  <AccordionTrigger className="text-left">3.1 Legal Basis for Processing (GDPR)</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>For users in the European Economic Area (EEA), we process personal data under the following legal bases:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Contract Performance:</strong> Processing necessary to provide our Services</li>
                      <li><strong>Legitimate Interests:</strong> Improving services, security, fraud prevention</li>
                      <li><strong>Consent:</strong> Marketing communications, cookies (where required)</li>
                      <li><strong>Legal Obligation:</strong> Compliance with applicable laws</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="automated">
                  <AccordionTrigger className="text-left">3.2 Automated Decision-Making</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Our Services use automated processing to analyze market sentiment and generate insights. This processing:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Does not produce legal effects or similarly significant decisions about you</li>
                      <li>Is used for informational purposes only</li>
                      <li>May be supplemented with human review upon request</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 4: Information Sharing */}
          <section id="sharing" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">4. Information Sharing and Disclosure</h2>
                <p className="text-muted-foreground">When and how we share data</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 mb-6">
                <p className="font-medium text-green-700 dark:text-green-400">
                  We do not sell your personal information to third parties.
                </p>
              </div>

              <p>
                We may share your information in the following circumstances:
              </p>

              <Accordion type="single" collapsible>
                <AccordionItem value="service-providers">
                  <AccordionTrigger className="text-left">4.1 Service Providers</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We share information with third-party vendors who perform services on our behalf, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Cloud Hosting:</strong> Infrastructure and data storage providers</li>
                      <li><strong>Payment Processing:</strong> Secure payment handling services</li>
                      <li><strong>Analytics:</strong> Usage analysis and performance monitoring</li>
                      <li><strong>Customer Support:</strong> Help desk and communication tools</li>
                      <li><strong>Email Services:</strong> Transactional and marketing email delivery</li>
                    </ul>
                    <p>
                      These providers are contractually obligated to protect your information and may only use it to perform services for us.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="legal">
                  <AccordionTrigger className="text-left">4.2 Legal Requirements</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>We may disclose your information when required by law or in response to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Court orders, subpoenas, or legal process</li>
                      <li>Government or regulatory requests</li>
                      <li>Investigations of suspected illegal activity</li>
                      <li>Protection of our rights, property, or safety</li>
                      <li>Prevention of fraud or security threats</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="business-transfers">
                  <AccordionTrigger className="text-left">4.3 Business Transfers</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email and/or prominent notice on our Website of any change in ownership or uses of your personal information.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="aggregated">
                  <AccordionTrigger className="text-left">4.4 Aggregated and De-identified Data</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      We may share aggregated or de-identified information that cannot reasonably be used to identify you. This includes:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Aggregate usage statistics and trends</li>
                      <li>Industry research and benchmarking data</li>
                      <li>Anonymized analytics and insights</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 5: Data Retention */}
          <section id="retention" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">5. Data Retention</h2>
                <p className="text-muted-foreground">How long we keep your data</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes for which it was collected and to comply with our legal obligations.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Data Type</th>
                      <th className="text-left py-2 font-medium">Retention Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="py-3 pr-4">Account Information</td>
                      <td className="py-3">Duration of account + 30 days after deletion</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Usage Data</td>
                      <td className="py-3">24 months from collection</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Transaction Records</td>
                      <td className="py-3">7 years (legal requirement)</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Customer Support Records</td>
                      <td className="py-3">3 years from resolution</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Marketing Preferences</td>
                      <td className="py-3">Until you withdraw consent</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Security Logs</td>
                      <td className="py-3">12 months</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                After the retention period expires, we will securely delete or anonymize your information unless retention is required by law.
              </p>
            </div>
          </section>

          {/* Section 6: Your Rights */}
          <section id="rights" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">6. Your Privacy Rights</h2>
                <p className="text-muted-foreground">Control over your data</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                Depending on your location, you may have certain rights regarding your personal information:
              </p>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                {[
                  { title: "Access", desc: "Request a copy of the personal information we hold about you" },
                  { title: "Correction", desc: "Request correction of inaccurate or incomplete information" },
                  { title: "Deletion", desc: "Request deletion of your personal information (subject to exceptions)" },
                  { title: "Portability", desc: "Receive your data in a structured, machine-readable format" },
                  { title: "Restriction", desc: "Request limitation of processing in certain circumstances" },
                  { title: "Objection", desc: "Object to processing based on legitimate interests" },
                  { title: "Withdraw Consent", desc: "Withdraw consent where processing is based on consent" },
                  { title: "Non-Discrimination", desc: "Not be discriminated against for exercising your rights" },
                ].map((right) => (
                  <div key={right.title} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <h4 className="font-medium mb-1">{right.title}</h4>
                    <p className="text-sm text-muted-foreground">{right.desc}</p>
                  </div>
                ))}
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="exercise">
                  <AccordionTrigger className="text-left">6.1 How to Exercise Your Rights</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>To exercise any of these rights, you may:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Email us at <a href="mailto:privacy@derivestreet.com" className="text-primary hover:underline">privacy@derivestreet.com</a></li>
                      <li>Use the privacy controls in your account settings</li>
                      <li>Submit a request through our online form</li>
                    </ul>
                    <p>
                      We will respond to your request within 30 days (or as required by applicable law). We may need to verify your identity before processing your request.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="ccpa">
                  <AccordionTrigger className="text-left">6.2 California Privacy Rights (CCPA/CPRA)</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      California residents have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Know:</strong> What personal information is collected and how it's used</li>
                      <li><strong>Delete:</strong> Request deletion of personal information</li>
                      <li><strong>Opt-Out:</strong> Opt out of the "sale" or "sharing" of personal information</li>
                      <li><strong>Correct:</strong> Request correction of inaccurate personal information</li>
                      <li><strong>Limit Use:</strong> Limit use of sensitive personal information</li>
                    </ul>
                    <p className="font-medium mt-3">
                      We do not sell personal information. We do not use or disclose sensitive personal information for purposes other than those permitted by the CPRA.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gdpr">
                  <AccordionTrigger className="text-left">6.3 European Privacy Rights (GDPR)</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR) including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>The right to lodge a complaint with your local data protection authority</li>
                      <li>The right to data portability</li>
                      <li>The right to object to automated decision-making</li>
                    </ul>
                    <p>
                      For data transfers outside the EEA, we use Standard Contractual Clauses approved by the European Commission or other lawful transfer mechanisms.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 7: Security */}
          <section id="security" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">7. Data Security</h2>
                <p className="text-muted-foreground">How we protect your information</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                {[
                  { title: "Encryption", desc: "TLS 1.3 for data in transit, AES-256 for data at rest" },
                  { title: "Access Controls", desc: "Role-based access, multi-factor authentication" },
                  { title: "Monitoring", desc: "24/7 security monitoring and intrusion detection" },
                  { title: "Audits", desc: "Regular security assessments and penetration testing" },
                ].map((measure) => (
                  <div key={measure.title} className="p-4 rounded-lg bg-muted/30 border border-border/30 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{measure.title}</h4>
                      <p className="text-sm text-muted-foreground">{measure.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Section 8: Cookies */}
          <section id="cookies" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Cookie className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">8. Cookies and Tracking Technologies</h2>
                <p className="text-muted-foreground">How we use cookies</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                We use cookies and similar tracking technologies to collect and store information about your interactions with our Services.
              </p>

              <Accordion type="single" collapsible>
                <AccordionItem value="types">
                  <AccordionTrigger className="text-left">8.1 Types of Cookies We Use</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-medium mb-1">Essential Cookies</h5>
                        <p className="text-sm">Required for the Services to function. Cannot be disabled.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-medium mb-1">Analytics Cookies</h5>
                        <p className="text-sm">Help us understand how you use our Services to improve them.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-medium mb-1">Functional Cookies</h5>
                        <p className="text-sm">Remember your preferences and settings.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <h5 className="font-medium mb-1">Marketing Cookies</h5>
                        <p className="text-sm">Used to deliver relevant advertisements and track campaign effectiveness.</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="manage">
                  <AccordionTrigger className="text-left">8.2 Managing Cookies</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>You can control cookies through:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Our cookie preference center (available in the footer)</li>
                      <li>Your browser settings to block or delete cookies</li>
                      <li>Opt-out tools provided by third-party analytics services</li>
                    </ul>
                    <p>
                      Note that blocking certain cookies may affect the functionality of our Services.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dnt">
                  <AccordionTrigger className="text-left">8.3 Do Not Track</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our Services currently do not respond to "Do Not Track" signals from browsers. However, you can manage tracking preferences through our cookie settings or your browser controls.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Section 9: Children's Privacy */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">9. Children's Privacy</h2>
                <p className="text-muted-foreground">Protection of minors</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                Our Services are not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:privacy@derivestreet.com" className="text-primary hover:underline">privacy@derivestreet.com</a>.
              </p>
              <p>
                If we learn that we have collected personal information from a child under 18, we will take steps to delete that information as quickly as possible.
              </p>
            </div>
          </section>

          {/* Section 10: International Transfers */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">10. International Data Transfers</h2>
                <p className="text-muted-foreground">Cross-border data processing</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                DeriveStreet is based in the United States. Your information may be transferred to, stored, and processed in the United States or other countries where our service providers operate.
              </p>
              <p>
                When we transfer personal information internationally, we implement appropriate safeguards in accordance with applicable law, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Binding Corporate Rules for intra-group transfers</li>
                <li>Certification schemes such as the EU-U.S. Data Privacy Framework</li>
              </ul>
            </div>
          </section>

          {/* Section 11: Updates */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">11. Updates to This Policy</h2>
                <p className="text-muted-foreground">How we notify you of changes</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. When we make material changes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We will update the "Last Updated" date at the top of this policy</li>
                <li>We will notify you via email or through a prominent notice on our Website</li>
                <li>We will provide at least 30 days' notice before material changes take effect</li>
              </ul>
              <p>
                We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
              </p>
            </div>
          </section>

          {/* Section 12: Contact */}
          <section id="contact" className="glass-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">12. Contact Us</h2>
                <p className="text-muted-foreground">Questions about privacy</p>
              </div>
            </div>
            
            <div className="space-y-4 text-foreground/90">
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Privacy Inquiries</h4>
                  <p className="text-sm text-muted-foreground">
                    <a href="mailto:privacy@derivestreet.com" className="text-primary hover:underline">
                      privacy@derivestreet.com
                    </a>
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Data Protection Officer</h4>
                  <p className="text-sm text-muted-foreground">
                    <a href="mailto:dpo@derivestreet.com" className="text-primary hover:underline">
                      dpo@derivestreet.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/30 mt-4">
                <h4 className="font-medium mb-2">Mailing Address</h4>
                <p className="text-sm text-muted-foreground">
                  DeriveStreet, Inc.<br />
                  Attn: Privacy Team<br />
                  251 Little Falls Drive<br />
                  Wilmington, DE 19808<br />
                  United States
                </p>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                For EU residents, you may also contact your local data protection authority if you have concerns about our privacy practices.
              </p>
            </div>
          </section>
        </div>

        {/* Related Links */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/terms">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Terms of Service
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
