import { Calendar } from "@/components/ui/calendar";
import { Entry } from "@shared/schema";

interface CalendarViewProps {
  entries: Entry[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function CalendarView({
  entries,
  selectedDate,
  onSelectDate,
}: CalendarViewProps) {
  const entryDates = entries.map((entry) => new Date(entry.date));

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => date && onSelectDate(date)}
      className="rounded-md border"
      modifiers={{
        entry: entryDates,
      }}
      modifiersStyles={{
        entry: {
          backgroundColor: "hsl(var(--primary))",
          color: "white",
          borderRadius: "9999px",
        },
      }}
    />
  );
}
