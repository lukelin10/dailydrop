import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Droplet, Archive, BrainCog } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function MainNavigation() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const navItems = [
    {
      name: "Drop",
      path: "/",
      icon: <Droplet className="h-4 w-4 mr-2" />,
      description: "Today's Question",
    },
    {
      name: "Feed",
      path: "/feed",
      icon: <Archive className="h-4 w-4 mr-2" />,
      description: "Past Entries",
    },
    {
      name: "Know",
      path: "/seek",
      icon: <BrainCog className="h-4 w-4 mr-2" />,
      description: "Analyses",
    },
  ];

  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mr-8">
            MindDrop
          </h1>
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "px-4 py-2 rounded-md flex items-center text-sm font-medium transition-colors",
                  location === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "w-12 h-12 flex flex-col items-center justify-center rounded-md text-xs font-medium transition-colors",
                location === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.icon}
              <span className="mt-1">{item.name}</span>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logoutMutation.mutate()}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
