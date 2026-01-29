import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/Header";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const glassCardClasses = cn("w-full max-w-md p-8 rounded-2xl", "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]", "backdrop-blur-[28px] backdrop-saturate-[140%]", "border border-black/[0.08] dark:border-white/[0.06]", "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]");
const glassInputClasses = cn("bg-white/50 dark:bg-white/[0.06]", "backdrop-blur-[8px]", "border-black/[0.08] dark:border-white/[0.08]", "focus:border-primary/30 dark:focus:border-primary/40");
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    signIn
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get the returnTo destination, defaulting to dashboard
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse({
      email,
      password
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    setLoading(true);
    const {
      error
    } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate(decodeURIComponent(returnTo));
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={glassCardClasses}>
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            
            <span className="font-display text-2xl">
              <span className="text-gradient">Derive</span>
              <span className="text-foreground">Street</span>
            </span>
          </Link>

          <h1 className="text-2xl font-display text-center mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-center mb-8">
            Sign in to access your sentiment intelligence
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className={glassInputClasses} required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={glassInputClasses} required />
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>;
}