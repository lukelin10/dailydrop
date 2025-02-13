import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import Editor from "@/components/editor";
import { Loader2, LogOut, Share2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showFeed, setShowFeed] = useState(false);

  const { data: entries = [], isLoading: entriesLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });

  const { data: dailyQuestion, isLoading: questionLoading } = useQuery<{
    question: string;
  }>({
    queryKey: ["/api/question"],
  });

  const createEntryMutation = useMutation({
    mutationFn: async (answer: string) => {
      const data = {
        question: dailyQuestion?.question,
        answer,
        date: new Date(),
      };
      await apiRequest("POST", "/api/entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      setShowFeed(true);
    },
  });

  const shareEntryMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: number; isPublic: boolean }) => {
      const res = await apiRequest("PATCH", `/api/entries/${id}/share`, { isPublic });
      return res.json();
    },
    onSuccess: (entry: Entry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      if (entry.isPublic && entry.shareId) {
        const shareUrl = `${window.location.origin}/shared/${entry.shareId}`;
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Share link copied!",
          description: "The link to your entry has been copied to your clipboard.",
        });
      }
    },
  });

  const todayEntry = entries.find(
    (entry) => new Date(entry.date).toDateString() === new Date().toDateString(),
  );

  // Get unique entries by keeping only the latest answer for each question
  const uniqueEntries = entries.reduce((acc, entry) => {
    const existingEntry = acc.find((e) => e.question === entry.question);
    if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
      const filtered = acc.filter((e) => e.question !== entry.question);
      return [...filtered, entry];
    }
    return acc;
  }, [] as Entry[]);

  if (entriesLoading || questionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Drop
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.username}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!showFeed ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-semibold">Today's Question</h2>
            {!todayEntry ? (
              <div className="space-y-4">
                <p className="text-lg">{dailyQuestion?.question}</p>
                <Editor
                  onSave={(answer) => createEntryMutation.mutate(answer)}
                  loading={createEntryMutation.isPending}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg">{todayEntry.question}</p>
                <div className="prose prose-sm max-w-none">
                  {todayEntry.answer}
                </div>
                <Button onClick={() => setShowFeed(true)}>View Past Entries</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-semibold">Your Journey</h2>
            <div className="space-y-6">
              {uniqueEntries
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <p className="text-lg font-medium">{entry.question}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            shareEntryMutation.mutate({
                              id: entry.id,
                              isPublic: !entry.isPublic,
                            })
                          }
                        >
                          <Share2
                            className={`h-4 w-4 ${
                              entry.isPublic ? "text-primary" : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {entry.answer}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}