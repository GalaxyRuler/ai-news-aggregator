import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force HTTPS redirect on client side for production (only on deployed domains)
if (typeof window !== 'undefined' && 
    window.location.protocol === 'http:' && 
    window.location.hostname !== 'localhost' &&
    window.location.hostname.includes('.replit.app')) {
  window.location.href = window.location.href.replace('http://', 'https://');
}

createRoot(document.getElementById("root")!).render(<App />);
