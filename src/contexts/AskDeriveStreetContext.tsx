import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useMessagesSidebar } from "@/contexts/MessagesSidebarContext";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface IntelligenceContext {
  lensSummary?: string;
  lensConfidence?: string;
  activeLens?: string;
  psychologyOneLiner?: string;
  primaryRisk?: string;
  dominantEmotion?: string;
  topNarratives?: { label: string; sentiment: number; confidence: number }[];
  topEmotions?: { emotion: string; intensity: number; momentum: string }[];
  coherenceScore?: number;
  dataTimestamp?: string;
}

interface AskDeriveStreetContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  conversation: ConversationMessage[];
  setConversation: React.Dispatch<React.SetStateAction<ConversationMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  symbol: string;
  setSymbol: (symbol: string) => void;
  intelligenceContext: IntelligenceContext;
  setIntelligenceContext: (ctx: IntelligenceContext) => void;
  clearConversation: () => void;
  addMessage: (message: Omit<ConversationMessage, "id" | "timestamp">) => string;
  updateMessage: (id: string, content: string) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  deleteConversationForSymbol: (symbol: string) => void;
}

const AskDeriveStreetContext = createContext<AskDeriveStreetContextType | null>(null);

const STORAGE_KEY = "derivestreet:conversations";
const WIDTH_STORAGE_KEY = "derivestreet:ask-panel-width";
const DEFAULT_PANEL_WIDTH = 480;
const MIN_WIDTH = 320;
const MAX_WIDTH = 480;

export function AskDeriveStreetProvider({ children, symbol: initialSymbol = "" }: { children: ReactNode; symbol?: string }) {
  const [isOpen, setIsOpenState] = useState(false);
  const [panelWidth, setPanelWidthState] = useState(DEFAULT_PANEL_WIDTH);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [symbol, setSymbolState] = useState(initialSymbol);
  const [intelligenceContext, setIntelligenceContext] = useState<IntelligenceContext>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesSidebar = useMessagesSidebar();

  // Load panel width from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(WIDTH_STORAGE_KEY);
      if (saved) {
        const width = parseInt(saved, 10);
        if (!isNaN(width) && width >= MIN_WIDTH && width <= MAX_WIDTH) {
          setPanelWidthState(width);
        }
      }
    }
  }, []);

  // Load conversation for current symbol from localStorage
  useEffect(() => {
    if (symbol && typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const all = JSON.parse(stored);
          const symbolConversation = all[symbol.toUpperCase()] || [];
          // Parse dates back
          const parsed = symbolConversation.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setConversation(parsed);
        } catch (e) {
          console.error("Failed to parse conversation history", e);
          setConversation([]);
        }
      } else {
        setConversation([]);
      }
    }
  }, [symbol]);

  // Save conversation to localStorage when it changes
  useEffect(() => {
    if (symbol && conversation.length > 0 && typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : {};
      // Only keep last 50 messages per symbol
      all[symbol.toUpperCase()] = conversation.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  }, [symbol, conversation]);

  const setPanelWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
    setPanelWidthState(clampedWidth);
    localStorage.setItem(WIDTH_STORAGE_KEY, String(clampedWidth));
  }, []);

  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
  }, []);

  const openPanel = useCallback(() => {
    // Close messages sidebar when opening ask panel
    messagesSidebar.setIsOpen(false);
    setIsOpenState(true);
  }, [messagesSidebar]);

  const closePanel = useCallback(() => {
    setIsOpenState(false);
  }, []);

  const setSymbol = useCallback((newSymbol: string) => {
    if (newSymbol !== symbol) {
      setSymbolState(newSymbol);
      // Conversation will be loaded from localStorage via the effect
    }
  }, [symbol]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    if (symbol && typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const all = JSON.parse(stored);
        delete all[symbol.toUpperCase()];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    }
  }, [symbol]);

  const deleteConversationForSymbol = useCallback((targetSymbol: string) => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const all = JSON.parse(stored);
      delete all[targetSymbol.toUpperCase()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      // If we deleted the current symbol's conversation, clear it
      if (targetSymbol.toUpperCase() === symbol.toUpperCase()) {
        setConversation([]);
      }
    }
  }, [symbol]);

  const addMessage = useCallback((message: Omit<ConversationMessage, "id" | "timestamp">) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ConversationMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, newMessage]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setConversation(prev =>
      prev.map(msg =>
        msg.id === id ? { ...msg, content, isStreaming: false } : msg
      )
    );
  }, []);

  return (
    <AskDeriveStreetContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openPanel,
        closePanel,
        panelWidth,
        setPanelWidth,
        conversation,
        setConversation,
        isStreaming,
        setIsStreaming,
        symbol,
        setSymbol,
        intelligenceContext,
        setIntelligenceContext,
        clearConversation,
        addMessage,
        updateMessage,
        isHistoryOpen,
        setIsHistoryOpen,
        deleteConversationForSymbol,
      }}
    >
      {children}
    </AskDeriveStreetContext.Provider>
  );
}

export function useAskDeriveStreet() {
  const context = useContext(AskDeriveStreetContext);
  if (!context) {
    throw new Error("useAskDeriveStreet must be used within an AskDeriveStreetProvider");
  }
  return context;
}

// Safe version that returns defaults if outside provider
export function useAskDeriveStreetSafe() {
  const context = useContext(AskDeriveStreetContext);
  if (!context) {
    return {
      isOpen: false,
      setIsOpen: () => {},
      openPanel: () => {},
      closePanel: () => {},
      panelWidth: DEFAULT_PANEL_WIDTH,
      setPanelWidth: () => {},
      conversation: [],
      setConversation: () => {},
      isStreaming: false,
      setIsStreaming: () => {},
      symbol: "",
      setSymbol: () => {},
      intelligenceContext: {},
      setIntelligenceContext: () => {},
      clearConversation: () => {},
      addMessage: () => "",
      updateMessage: () => "",
      isHistoryOpen: false,
      setIsHistoryOpen: () => {},
      deleteConversationForSymbol: () => {},
    };
  }
  return context;
}
