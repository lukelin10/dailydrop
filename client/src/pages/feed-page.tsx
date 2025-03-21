import { useQuery, useMutation } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2 } from "lucide-react";
import MainNavigation from "@/components/main-navigation";
import { Button } from "@/components/ui/button";
import ChatInterface from "@/components/chat-interface";

export default function FeedPage() {
  const { toast } = useToast();
  const [showChat, setShowChat] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  
  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });
  
  const shareEntryMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: number; isPublic: boolean }) => {
      const response = await apiRequest<Entry>(`/api/entries/${id}/share`, {
        method: "PATCH",
        body: { isPublic }
      });
      return response;
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
  
  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const handleEndChat = () => {
    setShowChat(false);
    setCurrentEntryId(null);
  };
  
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
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        {showChat && currentEntryId ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <ChatInterface
              entryId={currentEntryId}
              question={entries.find(e => e.id === currentEntryId)?.question || ""}
              answer={entries.find(e => e.id === currentEntryId)?.answer || ""}
              onEndChat={handleEndChat}
            />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Your Journey</h1>
            
            {entries.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-accent/20">
                <h3 className="text-lg font-medium">No entries yet</h3>
                <p className="text-muted-foreground mt-2">
                  Start your journaling journey by answering today's question.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="border rounded-lg p-6 space-y-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setCurrentEntryId(entry.id);
                      setShowChat(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-lg font-medium">{entry.question}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            shareEntryMutation.mutate({
                              id: entry.id,
                              isPublic: !entry.isPublic,
                            });
                          }}
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}