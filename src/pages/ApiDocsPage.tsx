import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Code2,
  Copy,
  Check,
  Key,
  Lock,
  Zap,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
  example: {
    request: string;
    response: string;
  };
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/stocktwits-proxy?action=messages&symbol={symbol}",
    title: "Get Messages",
    description: "Retrieve recent messages for a stock symbol with sentiment data.",
    params: [
      { name: "symbol", type: "string", required: true, description: "Stock symbol (e.g., AAPL, TSLA)" },
      { name: "limit", type: "number", required: false, description: "Number of messages (default: 100, max: 10000)" },
    ],
    response: "Array of messages with sentiment, timestamp, and user data",
    example: {
      request: `curl -X GET "${API_BASE_URL}/stocktwits-proxy?action=messages&symbol=AAPL&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`,
      response: `{
  "messages": [
    {
      "id": 123456789,
      "body": "AAPL looking strong today!",
      "created_at": "2025-01-16T14:30:00Z",
      "sentiment": "bullish",
      "user": {
        "username": "trader123",
        "followers": 1500
      }
    }
  ],
  "cursor": "next_page_cursor"
}`,
    },
  },
  {
    method: "GET",
    path: "/stocktwits-proxy?action=trending",
    title: "Get Trending",
    description: "Retrieve currently trending stock symbols with sentiment scores.",
    params: [],
    response: "Array of trending symbols with sentiment and volume data",
    example: {
      request: `curl -X GET "${API_BASE_URL}/stocktwits-proxy?action=trending" \\
  -H "x-api-key: YOUR_API_KEY"`,
      response: `{
  "symbols": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "sentiment": 72,
      "trend": "bullish",
      "volume": 15420,
      "change": 5.2
    }
  ]
}`,
    },
  },
  {
    method: "GET",
    path: "/get-sentiment-history?symbol={symbol}",
    title: "Get Sentiment History",
    description: "Retrieve historical sentiment data for a symbol over time.",
    params: [
      { name: "symbol", type: "string", required: true, description: "Stock symbol" },
      { name: "days", type: "number", required: false, description: "Number of days (default: 30)" },
    ],
    response: "Time-series sentiment data with daily scores",
    example: {
      request: `curl -X GET "${API_BASE_URL}/get-sentiment-history?symbol=AAPL&days=7" \\
  -H "x-api-key: YOUR_API_KEY"`,
      response: `{
  "symbol": "AAPL",
  "history": [
    {
      "date": "2025-01-16",
      "sentiment_score": 68,
      "bullish_count": 245,
      "bearish_count": 112,
      "message_volume": 357
    }
  ]
}`,
    },
  },
  {
    method: "GET",
    path: "/analyze-emotions?symbol={symbol}",
    title: "Analyze Emotions",
    description: "AI-powered analysis of market emotions like FOMO, fear, and greed.",
    params: [
      { name: "symbol", type: "string", required: true, description: "Stock symbol" },
      { name: "time_range", type: "string", required: false, description: "Time range: 1h, 4h, 24h (default: 24h)" },
    ],
    response: "Emotion breakdown with confidence scores",
    example: {
      request: `curl -X GET "${API_BASE_URL}/analyze-emotions?symbol=TSLA&time_range=4h" \\
  -H "x-api-key: YOUR_API_KEY"`,
      response: `{
  "symbol": "TSLA",
  "emotions": {
    "fomo": 32,
    "fear": 15,
    "greed": 28,
    "euphoria": 18,
    "capitulation": 7
  },
  "dominant_emotion": "fomo",
  "confidence": 0.85,
  "message_count": 1250
}`,
    },
  },
  {
    method: "GET",
    path: "/analyze-narratives?symbol={symbol}",
    title: "Analyze Narratives",
    description: "Extract dominant narratives and themes from social discussions.",
    params: [
      { name: "symbol", type: "string", required: true, description: "Stock symbol" },
      { name: "time_range", type: "string", required: false, description: "Time range: 1h, 4h, 24h (default: 24h)" },
    ],
    response: "List of narratives with strength scores and examples",
    example: {
      request: `curl -X GET "${API_BASE_URL}/analyze-narratives?symbol=NVDA&time_range=24h" \\
  -H "x-api-key: YOUR_API_KEY"`,
      response: `{
  "symbol": "NVDA",
  "narratives": [
    {
      "name": "AI Demand Surge",
      "strength": 45,
      "sentiment": "bullish",
      "examples": ["AI chips flying off shelves", "Data center demand insane"]
    },
    {
      "name": "Valuation Concerns",
      "strength": 22,
      "sentiment": "bearish",
      "examples": ["P/E too stretched", "Priced for perfection"]
    }
  ],
  "message_count": 2100
}`,
    },
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-secondary/50 rounded-lg p-4 overflow-x-auto text-sm font-mono">
        <code className="text-foreground/90">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-bullish" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <AccordionItem value={endpoint.path} className="border-b-0">
      <AccordionTrigger className="hover:no-underline py-4 px-4 rounded-lg hover:bg-secondary/30 data-[state=open]:bg-secondary/30">
        <div className="flex items-center gap-3 text-left">
          <Badge
            variant={endpoint.method === "GET" ? "bullish" : "default"}
            className="font-mono text-xs"
          >
            {endpoint.method}
          </Badge>
          <div>
            <p className="font-semibold">{endpoint.title}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {endpoint.path.split("?")[0]}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4 pt-2">
          <p className="text-muted-foreground">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Parameters</h4>
              <div className="space-y-2">
                {endpoint.params.map((param) => (
                  <div
                    key={param.name}
                    className="flex items-start gap-2 text-sm"
                  >
                    <code className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">
                      {param.name}
                    </code>
                    <span className="text-muted-foreground">
                      <span className="text-foreground/70">{param.type}</span>
                      {param.required && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          required
                        </Badge>
                      )}
                      {" — "}
                      {param.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="request" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="mt-3">
              <CodeBlock code={endpoint.example.request} />
            </TabsContent>
            <TabsContent value="response" className="mt-3">
              <CodeBlock code={endpoint.example.response} />
            </TabsContent>
          </Tabs>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2 flex items-center gap-3">
              <Code2 className="h-8 w-8 text-primary" />
              API Documentation
            </h1>
            <p className="text-muted-foreground">
              Integrate Derive Street data into your applications
            </p>
          </div>

          <Link to="/settings/api-keys">
            <Button variant="hero" className="gap-2">
              <Key className="h-4 w-4" />
              Get API Key
            </Button>
          </Link>
        </div>

        {/* Quick Start */}
        <Card className="p-6 glass-card mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Quick Start
          </h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              All API requests require authentication via an API key passed in the{" "}
              <code className="px-1.5 py-0.5 bg-secondary rounded text-sm">
                x-api-key
              </code>{" "}
              header.
            </p>
            <CodeBlock
              code={`curl -X GET "${API_BASE_URL}/stocktwits-proxy?action=trending" \\
  -H "x-api-key: siq_your_api_key_here"`}
            />
          </div>
        </Card>

        {/* Authentication */}
        <Card className="p-6 glass-card mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Authentication
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              API keys can be created and managed from your{" "}
              <Link
                to="/settings/api-keys"
                className="text-primary hover:underline"
              >
                Settings page
              </Link>
              . Each key is prefixed with <code className="px-1.5 py-0.5 bg-secondary rounded text-sm">siq_</code> for easy identification.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-medium text-foreground mb-2">Rate Limits</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="font-medium text-foreground">Free:</span> 100 requests/day
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Professional:</span> 10,000 requests/day
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Enterprise:</span> Unlimited
                  </li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <h4 className="font-medium text-foreground mb-2">Error Codes</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <code className="text-bearish">401</code> — Invalid or missing API key
                  </li>
                  <li>
                    <code className="text-bearish">429</code> — Rate limit exceeded
                  </li>
                  <li>
                    <code className="text-bearish">500</code> — Server error
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Endpoints */}
        <Card className="p-6 glass-card">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Endpoints
          </h2>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Messages API</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
              <TrendingUp className="h-5 w-5 text-bullish" />
              <span className="text-sm font-medium">Trending API</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
              <BarChart3 className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">Sentiment API</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
              <Zap className="h-5 w-5 text-chart-5" />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.path} endpoint={endpoint} />
            ))}
          </Accordion>
        </Card>

        {/* SDKs Coming Soon */}
        <Card className="mt-8 p-6 glass-card text-center">
          <Code2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-2">SDKs Coming Soon</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            We're working on official SDKs for Python, JavaScript, and Go. In the meantime, 
            use the REST API directly with any HTTP client.
          </p>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
