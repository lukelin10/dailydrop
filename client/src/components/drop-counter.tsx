import { useUnanalyzedEntriesCount, useCreateAnalysis, useAnalyses } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DropCounter() {
  const { data: countData, isLoading: isCountLoading } = useUnanalyzedEntriesCount();
  const { data: analyses } = useAnalyses();
  const createAnalysisMutation = useCreateAnalysis();
  const [latestAnalysisId, setLatestAnalysisId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // The threshold for enabling analysis
  const ANALYSIS_THRESHOLD = 7;
  
  const count = countData?.count || 0;
  const isAnalysisReady = count >= ANALYSIS_THRESHOLD;
  
  // When a new analysis is created, capture its ID
  const handleCreateAnalysis = async () => {
    if (!isAnalysisReady) {
      toast({
        title: "Not enough entries",
        description: `You need at least ${ANALYSIS_THRESHOLD} entries to create an analysis.`,
      });
      return;
    }
    
    try {
      const analysis = await createAnalysisMutation.mutateAsync();
      setLatestAnalysisId(analysis.id);
    } catch (error) {
      // Error is handled in the mutation itself
    }
  };
  
  if (isCountLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }
  
  // If we just created a new analysis, show the view button
  if (latestAnalysisId) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/analysis/${latestAnalysisId}`}>
          View Analysis
        </Link>
      </Button>
    );
  }
  
  // If we have at least one analysis, show the button to the most recent one
  if (analyses && analyses.length > 0) {
    const latestAnalysis = analyses[0]; // Analyses are ordered by createdAt desc
    
    return (
      <div className="flex flex-col items-end gap-1">
        <div className={`text-xs ${isAnalysisReady ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
          {count}/{ANALYSIS_THRESHOLD} drops
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={!isAnalysisReady || createAnalysisMutation.isPending}
            onClick={handleCreateAnalysis}
          >
            {createAnalysisMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              isAnalysisReady ? "New Analysis" : "Need more drops"
            )}
          </Button>
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
      <div className={`text-xs ${isAnalysisReady ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
        {count}/{ANALYSIS_THRESHOLD} drops
      </div>
      <Button 
        variant="outline" 
        size="sm"
        disabled={!isAnalysisReady || createAnalysisMutation.isPending}
        onClick={handleCreateAnalysis}
      >
        {createAnalysisMutation.isPending ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Analyzing...
          </>
        ) : (
          isAnalysisReady ? "Analyze My Drops" : "Need more drops"
        )}
      </Button>
    </div>
  );
}