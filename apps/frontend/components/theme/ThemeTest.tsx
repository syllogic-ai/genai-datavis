"use client";

import { useDashboardTheme } from "./DashboardThemeProvider";

export function ThemeTest() {
  const { activeTheme, getThemeStyles } = useDashboardTheme();
  const styles = getThemeStyles();

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="font-semibold mb-2">Theme Test</h3>
      <p className="text-sm mb-2">
        Active Theme: {activeTheme?.name || "None"}
      </p>
      
      {/* Test chart colors */}
      <div className="flex gap-2 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-8 h-8 rounded"
            style={{ 
              backgroundColor: `var(--chart-${i})`,
              border: '1px solid var(--border)'
            }}
            title={`Chart ${i}`}
          />
        ))}
      </div>
      
      {/* Raw theme data */}
      <details className="text-xs">
        <summary>Theme Data</summary>
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
          {JSON.stringify(styles, null, 2)}
        </pre>
      </details>
    </div>
  );
}