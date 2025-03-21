import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAnalysis } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MainNavigation from "@/components/main-navigation";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const analysisId = id ? parseInt(id) : null;
  const { user } = useAuth();
  const { data: analysis, isLoading } = useAnalysis(analysisId);
  
  if (!user) return null;
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <MainNavigation />
        <div className="flex items-center justify-center flex-grow">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }
  
  if (!analysis) {
    return (
      <div className="flex flex-col min-h-screen">
        <MainNavigation />
        <div className="container mx-auto px-4 py-8 flex-grow">
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            <h1 className="text-2xl font-bold">Analysis Not Found</h1>
            <p>We couldn't find the analysis you're looking for.</p>
            <Button asChild>
              <Link href="/seek">Return to Seek</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center mb-6">
            <Button asChild variant="ghost" size="sm" className="mr-4">
              <Link href="/seek">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Seek
              </Link>
            </Button>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              An analysis of your last {analysis.entryCount} drops
            </h1>
            <p className="text-sm text-muted-foreground">
              Analysis created {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
            </p>
          </div>
          
          <Separator />
          
          <div className="prose prose-sm max-w-none">
            {analysis.content.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}