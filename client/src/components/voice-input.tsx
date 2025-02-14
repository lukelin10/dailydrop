import { useReactMediaRecorder } from "react-media-recorder";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscription, disabled }: VoiceInputProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { toast } = useToast();

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl, blob) => {
      if (!blob) return;

      // Check file size (10MB limit)
      if (blob.size > 10 * 1024 * 1024) {
        toast({
          title: "Recording too long",
          description: "Please keep your recording under 1 minute",
          variant: "destructive",
        });
        return;
      }

      setIsTranscribing(true);
      try {
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (!base64Audio) throw new Error('Failed to convert audio');

          // Send to backend for transcription
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audio: base64Audio }),
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const { text } = await response.json();
          if (text) {
            onTranscription(text);
            toast({
              title: "Voice transcribed",
              description: "Your message has been transcribed successfully",
            });
          }
        };
      } catch (error) {
        console.error('Transcription error:', error);
        toast({
          title: "Transcription failed",
          description: "Please try again or type your message instead",
          variant: "destructive",
        });
      } finally {
        setIsTranscribing(false);
      }
    },
  });

  const isRecording = status === "recording";

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "destructive" : "default"}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isTranscribing}
      className="relative"
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}