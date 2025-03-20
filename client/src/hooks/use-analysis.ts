import { useQuery, useMutation } from "@tanstack/react-query";
import { Analysis } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useUnanalyzedEntriesCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/analysis/count"],
  });
}

export function useAnalyses() {
  return useQuery<Analysis[]>({
    queryKey: ["/api/analysis"],
  });
}

export function useAnalysis(id: number | null) {
  console.log(`useAnalysis hook called with id: ${id}`);
  return useQuery<Analysis>({
    queryKey: [`/api/analysis/${id}`],
    enabled: id !== null,
  });
}

export function useCreateAnalysis() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest<Analysis>("/api/analysis", {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate all analysis-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/count"] });
      
      toast({
        title: "Analysis Created",
        description: "Your entries have been successfully analyzed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create analysis.",
        variant: "destructive",
      });
    },
  });
}