import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeErrorReporting } from "./lib/error-reporter";

// Initialize global error handlers for frontend error tracking
initializeErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
