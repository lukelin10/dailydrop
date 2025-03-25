/**
 * Client Application Entry Point
 * 
 * This is the main entry point for the React client application.
 * It initializes the React app and mounts it to the DOM.
 * 
 * The application flow:
 * 1. React DOM creates a root in the "root" element
 * 2. The App component is rendered into this root
 * 3. The App component handles routing and authentication
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; // Global CSS styles

// Mount the React application to the DOM
// The "!" tells TypeScript that we're certain the element exists
createRoot(document.getElementById("root")!).render(<App />);
