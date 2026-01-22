import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface MessagesSidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

const MessagesSidebarContext = createContext<MessagesSidebarContextType | null>(null);

export function MessagesSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);

  return (
    <MessagesSidebarContext.Provider value={{ isOpen, setIsOpen, sidebarWidth, setSidebarWidth }}>
      {children}
    </MessagesSidebarContext.Provider>
  );
}

export function useMessagesSidebar() {
  const context = useContext(MessagesSidebarContext);
  if (!context) {
    // Return default values if used outside provider
    return { isOpen: false, setIsOpen: () => {}, sidebarWidth: 320, setSidebarWidth: () => {} };
  }
  return context;
}
