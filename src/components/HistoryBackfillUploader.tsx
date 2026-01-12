import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileJson, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Database
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedFile {
  name: string;
  symbol: string;
  messageCount: number;
  status: "pending" | "processing" | "success" | "error";
  result?: {
    bucketsProcessed: number;
    narrativeRecords: number;
    emotionRecords: number;
    errors: string[];
  };
}

export default function HistoryBackfillUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(selectedFiles)) {
      if (!file.name.endsWith(".json")) {
        toast.error(`${file.name} is not a JSON file`);
        continue;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Extract symbol from filename (e.g., "stocktwits_JPM_messages.json" -> "JPM")
        let symbol = file.name.replace(".json", "").toUpperCase();
        // Try to extract ticker from patterns like "stocktwits_JPM_messages" or "AAPL_messages"
        const symbolMatch = symbol.match(/(?:STOCKTWITS_)?([A-Z]{1,5})(?:_MESSAGES)?(?:_\d+)?$/i);
        if (symbolMatch) {
          symbol = symbolMatch[1].toUpperCase();
        }
        
        // Handle different JSON structures
        let messages = [];
        if (Array.isArray(data)) {
          messages = data;
        } else if (data.messages && Array.isArray(data.messages)) {
          messages = data.messages;
        } else if (data.cursor && data.messages) {
          messages = data.messages;
        }

        if (messages.length === 0) {
          toast.error(`${file.name} contains no messages`);
          continue;
        }

        // Normalize date format for all messages
        const normalizedMessages = messages.map((msg: any) => ({
          ...msg,
          // Convert "2026-01-12 22:29:46" to ISO format "2026-01-12T22:29:46Z"
          created_at: msg.created_at?.replace(" ", "T") + (msg.created_at?.includes("T") ? "" : "Z"),
        }));

        newFiles.push({
          name: file.name,
          symbol,
          messageCount: normalizedMessages.length,
          status: "pending",
        });

        // Store the normalized data for processing
        (window as any)[`backfill_${symbol}`] = normalizedMessages;

      } catch (err) {
        console.error("Parse error:", err);
        toast.error(`Failed to parse ${file.name}`);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }, []);

  const processFiles = async () => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status !== "pending") continue;

      setCurrentFileIndex(i);
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "processing" } : f
        )
      );

      try {
        const messages = (window as any)[`backfill_${file.symbol}`];
        
        if (!messages) {
          throw new Error("Message data not found");
        }

        const { data, error } = await supabase.functions.invoke("backfill-history", {
          body: {
            symbol: file.symbol,
            messages,
          },
        });

        if (error) throw error;

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "success",
                  result: {
                    bucketsProcessed: data.bucketsProcessed || 0,
                    narrativeRecords: data.narrativeRecords || 0,
                    emotionRecords: data.emotionRecords || 0,
                    errors: data.errors || [],
                  },
                }
              : f
          )
        );

        // Clean up stored data
        delete (window as any)[`backfill_${file.symbol}`];

        toast.success(`${file.symbol}: Created ${data.narrativeRecords + data.emotionRecords} history records`);

      } catch (err: any) {
        console.error("Processing error:", err);
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  result: {
                    bucketsProcessed: 0,
                    narrativeRecords: 0,
                    emotionRecords: 0,
                    errors: [err.message || "Unknown error"],
                  },
                }
              : f
          )
        );
        toast.error(`${file.symbol}: ${err.message}`);
      }
    }

    setIsProcessing(false);
    setCurrentFileIndex(-1);
  };

  const clearFiles = () => {
    // Clean up stored data
    files.forEach((f) => {
      delete (window as any)[`backfill_${f.symbol}`];
    });
    setFiles([]);
  };

  const totalRecords = files.reduce(
    (sum, f) => sum + (f.result?.narrativeRecords || 0) + (f.result?.emotionRecords || 0),
    0
  );

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Historical Data Backfill</h2>
          <p className="text-sm text-muted-foreground">
            Upload StockTwits JSON files to populate historical narrative and emotion data
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-6 hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept=".json"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="json-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="json-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">
            Drop JSON files here or click to browse
          </span>
          <span className="text-xs text-muted-foreground">
            One file per symbol (e.g., AAPL.json, NVDA.json)
          </span>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              {pendingCount > 0 && !isProcessing && (
                <Button onClick={processFiles} variant="hero">
                  <Upload className="h-4 w-4 mr-2" />
                  Process {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </Button>
              )}
              {!isProcessing && (
                <Button onClick={clearFiles} variant="outline">
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Progress Summary */}
          {isProcessing && (
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  Processing {currentFileIndex + 1} of {files.length}...
                </span>
              </div>
              <Progress
                value={((currentFileIndex + 1) / files.length) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* File Items */}
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <FileJson className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{file.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {file.messageCount.toLocaleString()} messages
                      </Badge>
                    </div>
                    {file.result && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {file.result.bucketsProcessed} buckets →{" "}
                        {file.result.narrativeRecords} narratives,{" "}
                        {file.result.emotionRecords} emotions
                        {file.result.errors.length > 0 && (
                          <span className="text-bearish ml-2">
                            ({file.result.errors.length} errors)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {file.status === "pending" && (
                    <Badge variant="outline">Pending</Badge>
                  )}
                  {file.status === "processing" && (
                    <Badge variant="glow" className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {file.status === "success" && (
                    <Badge variant="bullish" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Done
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <Badge variant="bearish" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
              {successCount > 0 && (
                <div className="flex items-center gap-2 text-bullish">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">
                    {successCount} completed, {totalRecords} records created
                  </span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-bearish">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{errorCount} failed</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50">
        <h3 className="text-sm font-medium mb-2">Supported Formats</h3>
        <pre className="text-xs text-muted-foreground overflow-x-auto">
{`[
  {
    "id": 123456,
    "body": "Message text here",
    "created_at": "2025-01-01 14:30:00"
  }
]`}
        </pre>
        <p className="text-xs text-muted-foreground mt-2">
          Accepts StockTwits exports. Symbol extracted from filename (e.g., stocktwits_JPM_messages.json → JPM).
        </p>
      </div>
    </Card>
  );
}
