import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@shared/schema";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChatInterfaceProps {
  entryId: number;
  question: string;
  answer: string;
  onEndChat: () => void;
}

export default function ChatInterface({ entryId, question, answer, onEndChat }: ChatInterfaceProps) {
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const form = useForm<{ message: string }>();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/entries/${entryId}/chat`],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const data = {
        content: message,
        isBot: false,
        entryId,
      };
      const response = await apiRequest("POST", `/api/entries/${entryId}/chat`, data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send message: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/entries/${entryId}/chat`] });
      form.reset();
    },
    onError: (error) => {
      console.error('Chat message error:', error);
    }
  });

  useEffect(() => {
    // Send the initial message (user's answer) when the chat first loads
    if (isInitializing && !messagesLoading && messages.length === 0) {
      sendMessageMutation.mutate(answer);
      setIsInitializing(false);
    }
  }, [isInitializing, messagesLoading, messages.length, answer, sendMessageMutation]);

  const handleEndChat = () => {
    setIsChatEnded(true);
    onEndChat();
  };

  const onSubmit = form.handleSubmit(({ message }) => {
    if (message.trim() && !isChatEnded) {
      sendMessageMutation.mutate(message);
    }
  });

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat with DropBot</h2>
        <p className="text-sm text-muted-foreground">
          Let's reflect on your thoughts together
        </p>
      </div>

      <div className="p-4 border-b bg-muted/50 sticky top-0">
        <p className="text-sm font-medium">Today's Question:</p>
        <p className="text-sm text-muted-foreground">{question}</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isBot ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isBot
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            {...form.register("message")}
            placeholder="Type your message..."
            className="min-h-[80px]"
            disabled={isChatEnded}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              size="icon"
              disabled={isChatEnded || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEndChat}
              disabled={isChatEnded}
            >
              End Chat
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}