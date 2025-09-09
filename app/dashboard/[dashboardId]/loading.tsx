import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground mb-1">Loading Dashboard</h2>
          <p className="text-sm text-muted-foreground">Preparing your data and widgets...</p>
        </div>
      </div>
    </div>
  );
}