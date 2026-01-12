import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Check,
  Copy,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

type Step = "plan" | "profile" | "api-key";

const plans = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring",
    features: ["100 API calls/day", "5 watchlist symbols", "15-min delayed data"],
    popular: false
  },
  {
    id: "professional" as const,
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For active traders",
    features: ["10,000 API calls/day", "Unlimited watchlists", "Real-time data", "Custom alerts"],
    popular: true
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For institutions",
    features: ["Unlimited API calls", "Dedicated support", "Custom integrations", "SLA"],
    popular: false
  }
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "professional" | "enterprise">("free");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'siq_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashApiKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handlePlanSelect = (planId: "free" | "professional" | "enterprise") => {
    setSelectedPlan(planId);
    setStep("profile");
  };

  const handleProfileSubmit = async () => {
    if (!user) return;

    setLoading(true);
    
    // Update profile with selected plan and company
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_plan: selectedPlan,
        company: company || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
      setLoading(false);
      return;
    }

    // Generate API key
    const newApiKey = generateApiKey();
    const keyHash = await hashApiKey(newApiKey);
    
    const { error: keyError } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: newApiKey.substring(0, 8),
        name: "Default Key",
      });

    if (keyError) {
      toast.error("Failed to generate API key");
      setLoading(false);
      return;
    }

    setApiKey(newApiKey);
    setLoading(false);
    setStep("api-key");
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard");
  };

  const handleComplete = () => {
    toast.success("Welcome to SentimentIQ!");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="w-full max-w-4xl relative">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["plan", "profile", "api-key"].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === s ? "bg-primary text-primary-foreground" :
                ["plan", "profile", "api-key"].indexOf(step) > idx ? "bg-bullish text-bullish-foreground" :
                "bg-secondary text-muted-foreground"
              }`}>
                {["plan", "profile", "api-key"].indexOf(step) > idx ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 2 && (
                <div className={`w-16 h-0.5 ${
                  ["plan", "profile", "api-key"].indexOf(step) > idx ? "bg-bullish" : "bg-secondary"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step: Plan Selection */}
        {step === "plan" && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display mb-2">Choose your plan</h1>
              <p className="text-muted-foreground">
                Start free and upgrade anytime as you grow
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`p-6 cursor-pointer transition-all hover:-translate-y-1 ${
                    plan.popular ? "border-primary shadow-glow" : "bg-gradient-card"
                  } ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.popular && (
                    <Badge variant="trending" className="mb-4">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-display">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.popular ? "hero" : "outline"} 
                    className="w-full mt-6"
                  >
                    Select {plan.name}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step: Profile Details */}
        {step === "profile" && (
          <Card className="max-w-md mx-auto p-8 bg-gradient-card animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setStep("plan")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-display">Complete your profile</h1>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Selected Plan</span>
                  <Badge variant="glow" className="capitalize">{selectedPlan}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Your company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>

              <Button 
                variant="hero" 
                className="w-full" 
                onClick={handleProfileSubmit}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Generate API Key
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Step: API Key */}
        {step === "api-key" && (
          <Card className="max-w-lg mx-auto p-8 bg-gradient-card animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display mb-2">Your API Key</h1>
              <p className="text-muted-foreground">
                Save this key securely. It won't be shown again.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 mb-6">
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm break-all">
                  {showApiKey ? apiKey : "•".repeat(apiKey.length)}
                </code>
                <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={copyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-chart-5/30 bg-chart-5/10 mb-6">
              <p className="text-sm text-chart-5">
                ⚠️ Make sure to copy your API key now. You won't be able to see it again!
              </p>
            </div>

            <Button variant="hero" className="w-full" onClick={handleComplete}>
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
