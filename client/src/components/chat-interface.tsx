import { useState, useEffect, useRef } from "react";
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

const MESSAGE_LIMIT = 7;

export default function ChatInterface({ entryId, question, answer, onEndChat }: ChatInterfaceProps) {
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const form = useForm<{ message: string }>();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: [`/api/entries/${entryId}/chat`],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      console.log(`Sending message to entry ${entryId}:`, message);
      const data = {
        content: message,
        isBot: false,
      };
      try {
        return await apiRequest<ChatMessage[]>(`/api/entries/${entryId}/chat`, {
          method: "POST",
          body: data
        });
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`Message sent successfully, got ${data?.length || 0} messages in response`);
      queryClient.invalidateQueries({ queryKey: [`/api/entries/${entryId}/chat`] });
      form.reset();
    },
    onError: (error) => {
      console.error('Chat message error:', error);
    }
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to bottom when messages change or after sending a message
  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessageMutation.isSuccess]);

  useEffect(() => {
    // Send the initial message (user's answer) when the chat first loads
    if (isInitializing && !messagesLoading && messages.length === 0) {
      console.log("Sending initial message to DropBot:", answer);
      if (answer && answer.trim()) {
        sendMessageMutation.mutate(answer);
      } else {
        console.error("Cannot send empty answer to DropBot");
      }
      setIsInitializing(false);
    }
  }, [isInitializing, messagesLoading, messages.length, answer, sendMessageMutation]);

  const handleEndChat = () => {
    setIsChatEnded(true);
    // Call the parent component's callback to navigate to feed page
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
          Let's reflect on your thoughts about today's drop together
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
          <div ref={messagesEndRef} /> {/* Anchor element for scrolling */}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        {messages.length < MESSAGE_LIMIT ? (
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
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You've reached the limit of 7 messages in this conversation
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Return tomorrow for a new question and conversation
            </p>
            <div className="flex justify-center">
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
          </div>
        )}
      </div>
    </div>
  );
}