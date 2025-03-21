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