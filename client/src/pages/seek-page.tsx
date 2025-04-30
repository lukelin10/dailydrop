import { useAnalyses } from "@/hooks/use-analysis";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import MainNavigation from "@/components/main-navigation";
import { Link } from "wouter";
import { Analysis } from "@shared/schema";

// Helper to generate a short summary from analysis content
function generateShortSummary(content: string): string {
  // Extract first sentence or first 10 words
  const firstSentence = content.split(/[.!?]/)[0];
  const words = firstSentence.split(/\s+/).slice(0, 10);
  return words.join(" ") + (words.length >= 10 ? "..." : "");
}

export default function SeekPage() {
  const { data: analyses = [], isLoading } = useAnalyses();
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-accent">
        <MainNavigation />
        <div className="flex items-center justify-center flex-grow">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <MainNavigation />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-accent-foreground">Your Insights</h1>
          
          {analyses.length === 0 ? (
            <div className="text-center py-12 border border-primary/30 rounded-lg bg-card text-card-foreground shadow-md">
              <h3 className="text-lg font-medium">No insights yet</h3>
              <p className="text-accent-foreground/80 mt-2">
                Keep journaling! Once you have at least 7 unanalyzed entries, 
                you can generate your first insight analysis.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {analyses.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface AnalysisCardProps {
  analysis: Analysis;
}

function AnalysisCard({ analysis }: AnalysisCardProps) {
  const summary = generateShortSummary(analysis.content);
  const timeAgo = formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true });
  
  return (
    <Link 
      href={`/analysis/${analysis.id}`}
      className="block border border-primary/30 rounded-lg p-6 bg-card text-card-foreground shadow-md hover:bg-primary/10 transition-colors cursor-pointer card-container"
    >
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-primary">Analysis from {timeAgo}</h3>
            <div className="text-sm text-accent-foreground/80">
              Based on {analysis.entryCount} journal entries
            </div>
          </div>
          <div className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full">
            Insight
          </div>
        </div>
        
        <p className="text-sm text-accent-foreground">
          {summary}
        </p>
      </div>
    </Link>
  );
}