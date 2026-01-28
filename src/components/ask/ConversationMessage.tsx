import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationMessage as ConversationMessageType } from "@/contexts/AskDeriveStreetContext";
import { TypingIndicator } from "./TypingIndicator";

interface ConversationMessageProps {
  message: ConversationMessageType;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

export const ConversationMessageComponent = memo(function ConversationMessageComponent({
  message,
}: ConversationMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: isUser ? -8 : 12, scale: isUser ? 1 : 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: isUser ? 0.25 : 0.6, 
        ease: isUser ? "easeOut" : [0.25, 0.46, 0.45, 0.94],
        opacity: { duration: isUser ? 0.2 : 0.5 },
        scale: { duration: isUser ? 0.2 : 0.45, ease: [0.34, 1.56, 0.64, 1] }
      }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Message content */}
      <div
        className={cn(
          "flex-1 space-y-1",
          isUser ? "max-w-[85%] items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5",
            isUser
              ? [
                  "bg-[#0F83FF]",
                  "text-foreground",
                  "rounded-tr-md",
                ]
              : [
                  "bg-transparent",
                  "text-foreground",
                  "px-4",
                ]
          )}
        >
          {isStreaming ? (
            <TypingIndicator />
          ) : isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <motion.div 
              className="prose prose-sm dark:prose-invert max-w-none"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              transition={{ 
                duration: 2.5, 
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.15
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-2 last:mb-0">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground/90">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 my-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 my-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm leading-relaxed">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground my-2">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-black/[0.05] dark:bg-white/[0.1] px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-black/[0.05] dark:bg-white/[0.1] p-2 rounded text-xs font-mono overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </motion.div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            "text-[10px] text-muted-foreground/50 px-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
});
