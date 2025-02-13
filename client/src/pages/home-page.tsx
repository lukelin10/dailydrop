import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Entry } from "@shared/schema";
import Editor from "@/components/editor";
import CalendarView from "@/components/calendar-view";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

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
    },
  });

  const todayEntry = entries.find(
    (entry) => new Date(entry.date).toDateString() === new Date().toDateString(),
  );

  const selectedEntry = entries.find(
    (entry) =>
      new Date(entry.date).toDateString() === selectedDate.toDateString(),
  );

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
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
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Past Entries</h2>
            <CalendarView
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {selectedEntry && selectedDate.toDateString() !== new Date().toDateString() && (
              <div className="space-y-4">
                <p className="text-lg">{selectedEntry.question}</p>
                <div className="prose prose-sm max-w-none">
                  {selectedEntry.answer}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}