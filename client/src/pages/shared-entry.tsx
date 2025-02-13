import { useQuery } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SharedEntryPage() {
  const { shareId } = useParams();
  const { data: entry, isLoading } = useQuery<Entry>({
    queryKey: [`/api/shared/${shareId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-destructive">Entry Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This entry might have been removed or made private by its owner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Drop
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-medium mb-4">{entry.question}</p>
              <div className="prose prose-sm max-w-none">
                {entry.answer}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Shared on {new Date(entry.date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
