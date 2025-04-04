/**
 * Home Page Component
 * 
 * This is the main page of the application where users:
 * 1. See the daily question fetched from Google Sheets
 * 2. Enter their journal entry ("drop") for the day
 * 3. Interact with the AI assistant through chat
 * 
 * The page handles three main states:
 * - Loading: While fetching question and existing entries
 * - Question Entry: Shows the daily question and answer form
 * - Chat Interface: For conversation with the AI about the entry
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import Editor from "@/components/editor";
import ChatInterface from "@/components/chat-interface";
import DropCounter from "@/components/drop-counter";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import MainNavigation from "@/components/main-navigation";
import { useLocation } from "wouter";

export default function HomePage() {
  const [showChat, setShowChat] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: entries = [], isLoading: entriesLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"]
  });

  const { data: dailyQuestion, isLoading: questionLoading } = useQuery<{
    question: string;
    questionId: number;
  }>({
    queryKey: ["/api/question"],
  });

  const createEntryMutation = useMutation({
    mutationFn: async (answer: string) => {
      const data = {
        question: dailyQuestion?.question,
        questionId: dailyQuestion?.questionId,
        answer,
        date: new Date(),
      };
      const entry = await apiRequest<Entry>("/api/entries", {
        method: "POST",
        body: data
      });
      return entry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      setCurrentEntryId(entry.id);
      setShowChat(true);
    },
  });

  // Find entry matching today's questionId instead of just today's date
  const todayEntry = entries.find(
    (entry) => entry.questionId === dailyQuestion?.questionId
  );
  
  // On initial load, if there's an entry for today, immediately show the chat interface
  useEffect(() => {
    if (!entriesLoading && entries.length > 0 && todayEntry) {
      // Set the entry and show chat automatically for today's entry
      setCurrentEntryId(todayEntry.id);
      setShowChat(true);
    }
  }, [entries, entriesLoading, todayEntry]);

  if (entriesLoading || questionLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <MainNavigation />
        <div className="flex items-center justify-center flex-grow">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const handleEndChat = () => {
    // Reset local state
    setShowChat(false);
    setCurrentEntryId(null);
    
    // Navigate to the feed page
    setLocation("/feed");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Today's Drop</h1>
            <DropCounter />
          </div>
          
          {showChat && currentEntryId ? (
            <div className="space-y-6">
              <ChatInterface
                entryId={currentEntryId}
                question={entries.find(e => e.id === currentEntryId)?.question || ""}
                answer={entries.find(e => e.id === currentEntryId)?.answer || ""}
                onEndChat={handleEndChat}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {!todayEntry ? (
                <div className="space-y-4 border rounded-lg p-6">
                  <p className="text-lg font-medium">{dailyQuestion?.question}</p>
                  <Editor
                    onSave={(answer) => createEntryMutation.mutate(answer)}
                    loading={createEntryMutation.isPending}
                  />
                </div>
              ) : (
                <div className="space-y-4 border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-lg font-medium">{todayEntry.question}</p>
                    <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      Already answered today
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    {todayEntry.answer}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      You've already answered today's question. Continue the conversation with DropBot for deeper insights.
                    </p>
                    <Button 
                      onClick={() => {
                        setCurrentEntryId(todayEntry.id);
                        setShowChat(true);
                      }}
                    >
                      Chat with DropBot
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}