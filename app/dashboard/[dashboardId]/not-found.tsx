import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-6">
        <FileX className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Dashboard Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The dashboard you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Back to Dashboards
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}