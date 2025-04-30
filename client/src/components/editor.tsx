import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface EditorProps {
  onSave: (content: string) => void;
  loading?: boolean;
}

export default function Editor({ onSave, loading }: EditorProps) {
  const [content, setContent] = useState("");

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Write your thoughts..."
        className="min-h-[200px] bg-accent text-accent-foreground border-primary/30 focus:border-primary"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button
        className="w-full primary-button"
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
