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
import { ensureArray } from "@/lib/utils";

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

  // We'll implement our own question fetching logic
  const [directQuestion, setDirectQuestion] = useState<string | null>(null);
  
  // Directly fetch the question from the API to bypass any React Query caching issues
  useEffect(() => {
    async function fetchQuestion() {
      try {
        console.log("Starting direct fetch of question...");
        const response = await fetch('/api/question', {
          credentials: 'include'
        });
        
        console.log("Direct fetch response:", response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Direct fetch question data:", data);
          
          if (data && data.question) {
            console.log("Setting direct question to:", data.question);
            setDirectQuestion(data.question);
          } else {
            console.warn("Question data missing or invalid:", data);
          }
        } else {
          console.error("Failed to fetch question:", response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error fetching question directly:', err);
      }
    }
    
    fetchQuestion();
  }, []);

  const createEntryMutation = useMutation({
    mutationFn: async (answer: string) => {
      // Use directQuestion or from dailyQuestion object
      const questionToUse = directQuestion || 
                           (dailyQuestion && typeof dailyQuestion === 'object' && 'question' in dailyQuestion
                            ? dailyQuestion.question
                            : "Today's question");
      
      const data = {
        question: questionToUse,
        questionId: (dailyQuestion && typeof dailyQuestion === 'object' && 'questionId' in dailyQuestion) 
                    ? dailyQuestion.questionId : 1,
        answer,
        date: new Date(),
      };
      
      // Log what we're about to send
      console.log("Creating entry with data:", data);
      
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

  // Create a safe array from entries
  const safeEntries = ensureArray<Entry>(entries);
  
  // Find entry matching today's questionId instead of just today's date
  // Use a safer check that works even if the data structure is corrupted in production
  const todayEntry = safeEntries.find((entry) => {
    const currentQuestionId = (dailyQuestion && typeof dailyQuestion === 'object' && 'questionId' in dailyQuestion) 
      ? dailyQuestion.questionId 
      : null;
      
    return entry.questionId === currentQuestionId;
  });
  
  // On initial load, if there's an entry for today, immediately show the chat interface
  useEffect(() => {
    // Check if we have entries and a match for today
    if (!entriesLoading && safeEntries.length > 0 && todayEntry) {
      // Set the entry and show chat automatically for today's entry
      setCurrentEntryId(todayEntry.id);
      setShowChat(true);
    }
  }, [safeEntries, entriesLoading, todayEntry]);

  if (entriesLoading || questionLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-accent">
        <MainNavigation />
        <div className="flex items-center justify-center flex-grow">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  console.log("Rendering home page with:", {
    dailyQuestion,
    todayEntry,
    showChat,
    currentEntryId
  });

  return (
    <div className="flex flex-col min-h-screen bg-accent">
      <MainNavigation />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-accent-foreground">Today's Drop</h1>
            <DropCounter />
          </div>
          
          {showChat && currentEntryId ? (
            <div className="space-y-6 fade-in">
              <ChatInterface
                entryId={currentEntryId}
                question={safeEntries.find(e => e.id === currentEntryId)?.question || ""}
                answer={safeEntries.find(e => e.id === currentEntryId)?.answer || ""}
                onEndChat={handleEndChat}
              />
            </div>
          ) : (
            <div className="space-y-6 slide-up">
              {!todayEntry ? (
                <div className="space-y-4 rounded-lg p-6 bg-card text-card-foreground card-container">
                  <p className="text-lg font-medium text-accent-foreground">
                    {directQuestion || 
                     (dailyQuestion && typeof dailyQuestion === 'object' && 'question' in dailyQuestion ? 
                      dailyQuestion.question : 
                      "Today's question is loading...")}
                  </p>
                  <Editor
                    onSave={(answer) => createEntryMutation.mutate(answer)}
                    loading={createEntryMutation.isPending}
                  />
                </div>
              ) : (
                <div className="space-y-4 rounded-lg p-6 bg-card text-card-foreground card-container">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-lg font-medium text-accent-foreground">{todayEntry.question}</p>
                    <div className="text-sm text-white bg-secondary px-2 py-1 rounded-md">
                      Already answered today
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    {todayEntry.answer}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-accent-foreground/80">
                      You've already answered today's question. Continue the conversation with DropBot for deeper insights.
                    </p>
                    <Button 
                      className="primary-button"
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