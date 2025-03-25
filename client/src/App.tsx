/**
 * Application Root Component
 * 
 * This file defines the top-level structure of the client-side application,
 * including routing, authentication, and global state providers.
 */
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import FeedPage from "@/pages/feed-page";
import SeekPage from "@/pages/seek-page";
import AuthPage from "@/pages/auth-page";
import SharedEntryPage from "@/pages/shared-entry";
import AnalysisPage from "@/pages/analysis-page";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

/**
 * Application Routing Component
 * 
 * Defines all application routes and their corresponding components.
 * Uses ProtectedRoute for routes that require authentication.
 * 
 * Routes:
 * - / - Home page, shows today's question (protected)
 * - /feed - Journal entries feed (protected)
 * - /seek - Analysis overview (protected)
 * - /analysis/:id - View specific analysis (protected)
 * - /auth - Authentication page (public)
 * - /shared/:shareId - Shared entry view (public)
 * - * - 404 Not Found page (public)
 */
function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/feed" component={FeedPage} />
      <ProtectedRoute path="/seek" component={SeekPage} />
      <ProtectedRoute path="/analysis/:id" component={AnalysisPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/shared/:shareId" component={SharedEntryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Main Application Component
 * 
 * Sets up the application with necessary providers:
 * 1. QueryClientProvider - For React Query data fetching
 * 2. AuthProvider - For user authentication
 * 
 * Also includes global components like Toaster for notifications.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;