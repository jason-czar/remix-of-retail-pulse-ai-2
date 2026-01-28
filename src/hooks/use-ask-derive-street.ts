import { useCallback, useRef } from "react";
import { useAskDeriveStreet, ConversationMessage } from "@/contexts/AskDeriveStreetContext";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface StreamCallbacks {
  onStart?: () => void;
  onDelta?: (delta: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

export function useAskDeriveStreetStream() {
  const {
    symbol,
    conversation,
    intelligenceContext,
    addMessage,
    updateMessage,
    setIsStreaming,
    openPanel,
  } = useAskDeriveStreet();

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userInput: string, callbacks?: StreamCallbacks) => {
      if (!userInput.trim() || !symbol) return;

      // Cancel any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Add user message
      addMessage({
        role: "user",
        content: userInput.trim(),
      });

      // Open panel if not already open
      openPanel();

      // Add placeholder assistant message
      const assistantId = addMessage({
        role: "assistant",
        content: "",
        isStreaming: true,
      });

      setIsStreaming(true);
      callbacks?.onStart?.();

      let fullContent = "";

      try {
        // Build messages array for API (only include conversation history)
        const historyMessages = conversation.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Add the new user message
        historyMessages.push({
          role: "user" as const,
          content: userInput.trim(),
        });

        const response = await fetch(`${SUPABASE_URL}/functions/v1/ask-derive-street`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            messages: historyMessages,
            context: intelligenceContext,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            toast.error("Rate limit reached. Try again in a moment.");
            throw new Error("Rate limit exceeded");
          }
          if (response.status === 402) {
            toast.error("AI credits exhausted. Please add credits to continue.");
            throw new Error("Payment required");
          }
          const errorText = await response.text();
          console.error("Ask API error:", response.status, errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process line-by-line
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            // Handle CRLF
            if (line.endsWith("\r")) line = line.slice(0, -1);

            // Skip comments and empty lines
            if (line.startsWith(":") || line.trim() === "") continue;

            // Only process data lines
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();

            // Check for stream end
            if (jsonStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                updateMessage(assistantId, fullContent);
                callbacks?.onDelta?.(delta);
              }
            } catch (e) {
              // Incomplete JSON, put it back and wait for more data
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Final flush of any remaining buffer
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                updateMessage(assistantId, fullContent);
                callbacks?.onDelta?.(delta);
              }
            } catch {
              // Ignore partial leftovers
            }
          }
        }

        // Ensure final update
        updateMessage(assistantId, fullContent || "I couldn't generate a response. Try rephrasing your question.");
        callbacks?.onComplete?.(fullContent);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Request was cancelled
          return;
        }
        console.error("Stream error:", error);
        updateMessage(
          assistantId,
          "Sorry, I encountered an error. Please try again."
        );
        callbacks?.onError?.(error as Error);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [symbol, conversation, intelligenceContext, addMessage, updateMessage, setIsStreaming, openPanel]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, [setIsStreaming]);

  return {
    sendMessage,
    cancelStream,
  };
}
