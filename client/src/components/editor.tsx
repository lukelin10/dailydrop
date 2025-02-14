import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic, MicOff } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface EditorProps {
  onSave: (content: string) => void;
  loading?: boolean;
}

export default function Editor({ onSave, loading }: EditorProps) {
  const [content, setContent] = useState("");
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({
    clearTranscriptOnListen: false,
  });

  // Update content when transcript changes
  useEffect(() => {
    if (transcript) {
      setContent(prev => prev + ' ' + transcript);
      resetTranscript();
    }
  }, [transcript]);

  const handleVoiceInput = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ 
        continuous: true,
        interimResults: true,
        language: 'en-US'
      });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="space-y-4">
        <Textarea
          placeholder="Write your thoughts..."
          className="min-h-[200px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={() => onSave(content)}
          disabled={loading || !content.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Save Entry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          placeholder="Write your thoughts..."
          className="min-h-[200px] pr-12"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`absolute right-2 top-2 ${listening ? 'bg-red-100 hover:bg-red-200' : ''}`}
          onClick={handleVoiceInput}
        >
          {listening ? (
            <MicOff className="h-4 w-4 text-destructive" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Button
        className="w-full"
        onClick={() => onSave(content)}
        disabled={loading || !content.trim()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Save Entry
      </Button>
    </div>
  );
}