import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
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
  } = useSpeechRecognition();

  // Update content when transcript changes
  useEffect(() => {
    if (transcript) {
      setContent(prev => prev + ' ' + transcript);
      resetTranscript();
    }
  }, [transcript]);

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
      <div className="flex gap-2 mb-2">
        <Button
          variant="outline"
          onClick={() => {
            SpeechRecognition.startListening({ 
              continuous: true,
              language: 'en-US'
            });
          }}
          disabled={listening}
        >
          Start Recording
        </Button>
        <Button
          variant="outline"
          onClick={SpeechRecognition.stopListening}
          disabled={!listening}
        >
          Stop Recording
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            resetTranscript();
            setContent("");
          }}
        >
          Clear
        </Button>
      </div>

      {listening && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Listening...
        </div>
      )}

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