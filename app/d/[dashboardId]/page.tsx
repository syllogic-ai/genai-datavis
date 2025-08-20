"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Widget } from "@/types/enhanced-dashboard-types";
import { Dashboard } from "@/db/schema";
import { TextBlock } from "@/app/dashboard/[dashboardId]/components/widgets/TextBlock";
import { ChartWidget } from "@/app/dashboard/[dashboardId]/components/widgets/ChartWidget";
import { KPICard } from "@/app/dashboard/[dashboardId]/components/widgets/KPICard";
import { TableWidget } from "@/app/dashboard/[dashboardId]/components/widgets/TableWidget";
import { TextEditorProvider } from "@/app/dashboard/[dashboardId]/components/TextEditorContext";
import { PublicDashboardThemeProvider, usePublicDashboardTheme } from "@/components/theme/PublicDashboardThemeProvider";
import { SyllogicBadge } from "@/components/dashboard/SyllogicBadge";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GoogleFontsLoader } from "@/components/tiptap/GoogleFonts";

interface PublicDashboardData {
  dashboard: Dashboard & { width?: 'full' | 'constrained' };
  widgets: Widget[];
  theme?: any; // Theme data from API
}

function PublicDashboardContent({ 
  data, 
  sortedWidgets 
}: { 
  data: PublicDashboardData; 
  sortedWidgets: Widget[] 
}) {
  const { themeClassName } = usePublicDashboardTheme();

  const renderWidget = (widget: Widget) => {
    const props = {
      widget,
      onUpdate: () => {}, // No-op for read-only mode
      isEditing: false,
      onEditToggle: () => {}, // No-op for read-only mode
    };

    if (widget.type === "text") {
      return <TextBlock {...props} />;
    } else {
      // Treat all non-text widgets as charts
      return <ChartWidget {...props} />;
    }
  };

  // Apply width setting from dashboard data
  const dashboardWidth = data.dashboard.width || 'full';
  const maxWidthClass = dashboardWidth === 'constrained' ? 'max-w-5xl' : 'max-w-none';

  return (
    <div className={`min-h-screen ${themeClassName}`} style={{ backgroundColor: 'var(--background)' }}>
      {/* Main Content */}
      <main className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8 lg:py-24 py-8`}>
        {sortedWidgets.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-4xl mb-4" style={{ color: 'var(--muted-foreground)' }}>📊</div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                No widgets to display
              </h3>
              <p style={{ color: 'var(--muted-foreground)' }}>
                This dashboard doesn&apos;t have any widgets yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedWidgets.map((widget) => (
              <div
                key={widget.id}
                className={`rounded-lg overflow-hidden transition-all duration-200 ${
                  widget.type === 'text' 
                    ? '' // No border or shadow for text blocks
                    : ''
                }`}
                style={widget.type !== 'text' ? {
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  backgroundColor: 'var(--card)',
                  borderRadius: 'var(--radius)'
                } : {}}
              >
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fixed Powered by Syllogic badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <SyllogicBadge />
      </div>
    </div>
  );
}

export default function PublicDashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicDashboard = async () => {
      try {
        const response = await fetch(`/api/public/dashboard/${dashboardId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Dashboard not found or not public");
          } else if (response.status === 403) {
            setError("This dashboard is private");
          } else {
            setError("Failed to load dashboard");
          }
          return;
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (error) {
        console.error("Error fetching public dashboard:", error);
        setError("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (dashboardId) {
      fetchPublicDashboard();
    }
  }, [dashboardId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          {error.includes("private") ? (
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          ) : (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          )}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error.includes("private") ? "Private Dashboard" : "Dashboard Not Found"}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Unable to load dashboard data.</p>
        </div>
      </div>
    );
  }

  // Sort widgets by order for consistent rendering
  const sortedWidgets = [...data.widgets].sort((a, b) => {
    const getOrder = (widget: Widget) => {
      if (typeof widget.order === 'number') return widget.order;
      if (widget.layout?.y !== undefined) return widget.layout.y;
      return 0;
    };
    
    const aOrder = getOrder(a);
    const bOrder = getOrder(b);
    return aOrder - bOrder;
  });

  return (
    <PublicDashboardThemeProvider 
      dashboardId={dashboardId} 
      theme={data.theme}
      dashboardData={data.dashboard}
    >
      <TextEditorProvider>
        <GoogleFontsLoader />
        <PublicDashboardContent data={data} sortedWidgets={sortedWidgets} />
      </TextEditorProvider>
    </PublicDashboardThemeProvider>
  );
}