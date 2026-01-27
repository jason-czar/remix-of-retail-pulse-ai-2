import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Key, 
  CreditCard, 
  Bell,
  Database,
  Palette,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertTriangle,
  HelpCircle
} from "lucide-react";
import AlertsManager from "@/components/AlertsManager";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import HistoryBackfillUploader from "@/components/HistoryBackfillUploader";
import ManualSnapshotTrigger from "@/components/ManualSnapshotTrigger";
import AdminDataControls from "@/components/AdminDataControls";
import { MetricsGlossaryContent } from "@/components/MetricsGlossary";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  subscription_plan: "free" | "professional" | "enterprise";
  api_calls_today: number;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  
  // Profile form state
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;

    const [profileRes, keysRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    if (profileRes.data) {
      const profileData = profileRes.data as Profile;
      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setCompany(profileData.company || "");
    }
    if (keysRes.data) {
      setApiKeys(keysRes.data as ApiKey[]);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user || !profile) return;

    // Validate inputs
    const trimmedName = fullName.trim();
    const trimmedCompany = company.trim();
    
    if (trimmedName.length > 100) {
      toast.error("Full name must be less than 100 characters");
      return;
    }
    if (trimmedCompany.length > 100) {
      toast.error("Company name must be less than 100 characters");
      return;
    }

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: trimmedName || null,
        company: trimmedCompany || null,
      })
      .eq("user_id", user.id);

    setSavingProfile(false);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      setProfile({
        ...profile,
        full_name: trimmedName || null,
        company: trimmedCompany || null,
      });
      toast.success("Profile saved successfully");
    }
  };

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

  const createApiKey = async () => {
    if (!user || !newKeyName.trim()) {
      toast.error("Please enter a name for your API key");
      return;
    }

    setCreatingKey(true);
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: apiKey.substring(0, 8),
      name: newKeyName.trim(),
    });

    if (error) {
      toast.error("Failed to create API key");
    } else {
      setNewApiKey(apiKey);
      setNewKeyName("");
      fetchData();
      toast.success("API key created successfully");
    }
    setCreatingKey(false);
  };

  const deleteApiKey = async (keyId: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", keyId);
    if (error) {
      toast.error("Failed to delete API key");
    } else {
      toast.success("API key deleted");
      fetchData();
    }
  };

  const toggleApiKey = async (keyId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: !isActive })
      .eq("id", keyId);
    if (error) {
      toast.error("Failed to update API key");
    } else {
      fetchData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getPlanLimits = (plan: string) => {
    switch (plan) {
      case "professional": return 10000;
      case "enterprise": return Infinity;
      default: return 100;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display mb-8">Settings</h1>

      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })} className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={100}
                    className="bg-secondary/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input 
                    value={company} 
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company (optional)"
                    maxLength={100}
                    className="bg-secondary/50" 
                  />
                </div>
                <Button 
                  variant="hero" 
                  onClick={saveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys">
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">API Keys</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your API keys for accessing the Derive Street API
                  </p>
                </div>
              </div>

              {/* New API Key Alert */}
              {newApiKey && (
                <div className="p-4 rounded-lg border border-chart-5/30 bg-chart-5/10 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-chart-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-chart-5 mb-2">
                        Save your API key now — it won't be shown again!
                      </p>
                      <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                        <code className="text-sm font-mono flex-1">{newApiKey}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newApiKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setNewApiKey(null)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        I've saved it
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Create New Key */}
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Key name (e.g., Production, Development)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-secondary/50 max-w-xs"
                />
                <Button onClick={createApiKey} disabled={creatingKey}>
                  {creatingKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </div>

              {/* API Keys List */}
              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No API keys yet. Create one to get started.
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div 
                      key={key.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge variant={key.is_active ? "bullish" : "outline"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-mono">{key.key_prefix}...</span>
                          <span className="mx-2">•</span>
                          Created {new Date(key.created_at).toLocaleDateString()}
                          {key.last_used_at && (
                            <>
                              <span className="mx-2">•</span>
                              Last used {new Date(key.last_used_at).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleApiKey(key.id, key.is_active)}
                        >
                          {key.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteApiKey(key.id)}
                          className="text-bearish hover:text-bearish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <AlertsManager />
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-6">
            <AdminDataControls />
            <ManualSnapshotTrigger />
            <HistoryBackfillUploader />
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-semibold mb-6">Appearance</h2>
              <div className="space-y-6">
                <div>
                  <Label className="text-base">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose how Derive Street looks to you
                  </p>
                  <ThemeSwitcher />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-semibold mb-6">Subscription & Usage</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Current Plan */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Current Plan</span>
                    <Badge variant="glow" className="capitalize">
                      {profile?.subscription_plan || "free"}
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    Upgrade Plan
                  </Button>
                </div>

                {/* API Usage */}
                <div className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">API Calls Today</span>
                    <span className="font-mono">
                      {profile?.api_calls_today || 0} / {getPlanLimits(profile?.subscription_plan || "free")}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary rounded-full"
                      style={{ 
                        width: `${Math.min(100, ((profile?.api_calls_today || 0) / getPlanLimits(profile?.subscription_plan || "free")) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resets daily at midnight UTC
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <Card className="p-6 glass-card">
              <MetricsGlossaryContent />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
