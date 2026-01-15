import { Shield, Clock, Server, Code } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const stats = [
  { icon: Clock, value: "10M+", label: "Messages processed daily" },
  { icon: Server, value: "8,500+", label: "Symbols tracked" },
  { icon: Shield, value: "99.9%", label: "Platform uptime" },
  { icon: Code, value: "<50ms", label: "API response time" }
];

export function CredibilitySection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-display mb-4">
              Built for Institutional Standards
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enterprise-grade infrastructure designed to meet the demands of professional investors.
            </p>
          </ScrollReveal>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
            {stats.map((stat) => (
              <StaggerItem key={stat.label}>
                <StatCard {...stat} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Trust indicators */}
          <ScrollReveal delay={0.3}>
            <div className="mt-16 glass-card p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <h4 className="font-semibold mb-2">Data Quality</h4>
                  <p className="text-sm text-muted-foreground">
                    AI-powered spam and bot filtering ensures only genuine retail sentiment is captured.
                  </p>
                </div>
                <div className="md:border-x md:border-border/50 md:px-8">
                  <h4 className="font-semibold mb-2">Compliance Ready</h4>
                  <p className="text-sm text-muted-foreground">
                    SOC 2 Type II compliant infrastructure with enterprise security controls.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Flexible Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    REST API, webhooks, and dashboard access to fit your existing workflows.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function StatCard({ 
  icon: Icon, 
  value, 
  label 
}: { 
  icon: React.ElementType; 
  value: string; 
  label: string; 
}) {
  return (
    <div className="glass-card p-6 text-center hover:shadow-glow transition-all duration-300 group">
      <div className="inline-flex p-2.5 rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/15 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="text-3xl font-display text-gradient mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
