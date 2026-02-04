import { createContext, useContext, ReactNode } from "react";
import { useParams } from "react-router-dom";

interface DemoContextValue {
  isDemoMode: boolean;
  demoSymbols: string[];
  isCurrentSymbolDemo: () => boolean;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

const DEMO_SYMBOLS = ["AAPL", "NVDA"] as const;

export function DemoProvider({ children }: { children: ReactNode }) {
  const { symbol } = useParams<{ symbol: string }>();

  const isDemoMode = symbol ? DEMO_SYMBOLS.includes(symbol as any) : false;

  const isCurrentSymbolDemo = () => {
    if (!symbol) return false;
    return DEMO_SYMBOLS.includes(symbol as any);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoSymbols: [...DEMO_SYMBOLS],
        isCurrentSymbolDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}

// Helper function to check if a symbol is a demo symbol without using the hook
export function isDemoSymbol(symbol: string): boolean {
  return DEMO_SYMBOLS.includes(symbol as any);
}
