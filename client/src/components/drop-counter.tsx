/**
 * Drop Counter Component
 * 
 * This component displays the number of unanalyzed "drops" (journal entries)
 * and provides analysis functionality when the user has enough entries.
 * 
 * Key features:
 * 1. Shows count of unanalyzed entries vs. threshold (7 entries)
 * 2. Conditionally displays "New Analysis" button when threshold is met
 * 3. Shows "Unlock analysis with more drops" message when below threshold
 * 4. Provides access to the latest analysis when one exists
 */
import { useUnanalyzedEntriesCount, useCreateAnalysis, useAnalyses } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DropCounter() {
  // Fetch data about unanalyzed entries and existing analyses
  const { data: countData, isLoading: isCountLoading } = useUnanalyzedEntriesCount();
  const { data: analyses } = useAnalyses();
  const createAnalysisMutation = useCreateAnalysis();
  const [latestAnalysisId, setLatestAnalysisId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // The number of entries required before an analysis can be generated
  const ANALYSIS_THRESHOLD = 7;
  
  // Count of unanalyzed entries available for analysis
  const count = countData?.count || 0;
  
  // Whether the user has enough entries to create a new analysis
  const isAnalysisReady = count >= ANALYSIS_THRESHOLD;
  
  /**
   * Handle creating a new analysis
   * 
   * This function is called when the user clicks the "New Analysis" or
   * "Analyze My Drops" button. It checks if the user has enough entries,
   * then calls the API to generate an analysis.
   */
  const handleCreateAnalysis = async () => {
    // Prevent analysis creation if not enough entries
    if (!isAnalysisReady) {
      toast({
        title: "Not enough entries",
        description: `You need at least ${ANALYSIS_THRESHOLD} entries to create an analysis.`,
      });
      return;
    }
    
    try {
      // Create the analysis and store its ID for navigation
      const analysis = await createAnalysisMutation.mutateAsync();
      setLatestAnalysisId(analysis.id);
    } catch (error) {
      // Error is handled in the mutation itself (see use-analysis.ts)
    }
  };
  
  // Show loading state while fetching the count
  if (isCountLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }
  
  // After creating a new analysis, show a button to view it
  if (latestAnalysisId) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/analysis/${latestAnalysisId}`}>
          View Analysis
        </Link>
      </Button>
    );
  }
  
  // For users who already have at least one previous analysis
  if (analyses && analyses.length > 0) {
    const latestAnalysis = analyses[0]; // Analyses are ordered by createdAt desc
    
    return (
      <div className="flex flex-col items-end gap-1">
        {/* Display drop count, highlighted in green if threshold met */}
        <div className={`text-xs ${isAnalysisReady ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
          {count}/{ANALYSIS_THRESHOLD} drops
        </div>
        <div className="flex gap-2">
          {/* Show analysis button only if enough entries */}
          {isAnalysisReady && (
            <Button 
              variant="outline" 
              size="sm"
              disabled={createAnalysisMutation.isPending}
              onClick={handleCreateAnalysis}
            >
              {createAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : "New Analysis"}
            </Button>
          )}
          {/* Show explanatory message if not enough entries */}
          {!isAnalysisReady && (
            <div className="text-xs text-muted-foreground italic">
              Unlock analysis with more drops
            </div>
          )}
          {/* Always show link to latest analysis */}
          <Button asChild variant="ghost" size="sm">
            <Link href={`/analysis/${latestAnalysis.id}`}>
              Latest
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // First-time user with no analyses yet
  return (
    <div className="flex flex-col items-end gap-1">
      {/* Display drop count, highlighted in green if threshold met */}
      <div className={`text-xs ${isAnalysisReady ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
        {count}/{ANALYSIS_THRESHOLD} drops
      </div>
      
      {/* Conditional rendering based on whether threshold is met */}
      {isAnalysisReady ? (
        // Show analysis button if threshold met
        <Button 
          variant="outline" 
          size="sm"
          disabled={createAnalysisMutation.isPending}
          onClick={handleCreateAnalysis}
        >
          {createAnalysisMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Analyzing...
            </>
          ) : "Analyze My Drops"}
        </Button>
      ) : (
        // Show explanatory message if not enough entries
        <div className="text-xs text-muted-foreground italic">
          Unlock analysis with more drops
        </div>
      )}
    </div>
  );
}