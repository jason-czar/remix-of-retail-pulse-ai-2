import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/Header";
import { Zap, ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const glassCardClasses = cn(
  "p-8 rounded-2xl",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  "border border-black/[0.08] dark:border-white/[0.06]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]"
);

const glassInputClasses = cn(
  "bg-white/50 dark:bg-white/[0.06]",
  "backdrop-blur-[8px]",
  "border-black/[0.08] dark:border-white/[0.08]",
  "focus:border-primary/30 dark:focus:border-primary/40"
);

const glassBenefitClasses = cn(
  "p-1 rounded-full",
  "bg-primary/10 dark:bg-primary/20"
);

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({ fullName, email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome to DeriveStreet!");
      navigate("/symbol/NVDA");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 relative">
          {/* Benefits Panel */}
          <div className="hidden md:flex flex-col justify-center">
            <h2 className="text-3xl font-display mb-6">
              Start decoding{" "}
              <span className="text-gradient">market psychology</span>
            </h2>
            
            <ul className="space-y-4">
              {[
                "Real-time sentiment analytics for 8,500+ symbols",
                "AI-powered narrative and emotion extraction",
                "Custom alerts for sentiment shifts",
                "Developer API with generous free tier",
                "No credit card required"
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <div className={cn(glassBenefitClasses, "mt-0.5")}>
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Signup Form */}
          <div className={glassCardClasses}>
            {/* Logo */}
            <Link to="/" className="flex items-center justify-center gap-2 mb-8">
              <Zap className="h-8 w-8 text-primary" />
              <span className="font-display text-2xl">
                <span className="text-gradient">Derive</span>
                <span className="text-foreground">Street</span>
              </span>
            </Link>

            <h1 className="text-2xl font-display text-center mb-2">Create your account</h1>
            <p className="text-muted-foreground text-center mb-8">
              Get started with your free account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={glassInputClasses}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={glassInputClasses}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={glassInputClasses}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters
                </p>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground mt-4">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
