import { API_URL } from "@/app/lib/env";
import { ChartMessage as ChartMessageType, ChartSpec } from "@/app/lib/types";

interface ChartMessageProps {
  message: ChartMessageType;
  className?: string;
  fileId: string;
  setVisualization: (chartSpec: ChartSpec) => void;
}

export function ChartMessage({ message, className = "", fileId, setVisualization }: ChartMessageProps) {
  return (
    <button
      className={`relative flex flex-row w-full text-left cursor-pointer items-center bg-accent justify-center py-8 gap-8 p-4 border border-accent rounded-lg overflow-hidden group ${className}`}
      onClick={async () => {
        const chartSpecResponse = await fetch(
            `${API_URL}/compute_chart_spec_data`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chart_id: message.id,
                file_id: fileId,
              }),
            }
          );

          if (chartSpecResponse.ok) {
            const chartSpecData = await chartSpecResponse.json();
            const chartSpecDataJson = chartSpecData.chart_specs;

            // For the most recent chart, update the visualization
            setVisualization(chartSpecDataJson as ChartSpec);
          } else {
            console.error(
              `Error fetching chart spec data for chart ${message.id}:`,
              await chartSpecResponse.text()
            );
          }
      }}
        >
      <div className="flex-shrink-0">
        {/* <Icons.chart className="w-6 h-6 text-accent-foreground" /> */}
        <div
          className="w-26 h-30 overflow-hidden ml-4 -mb-16 bg-white rounded-xl flex items-center justify-center  border border-gray-200 group-hover:scale-105 transition-all duration-300"
          style={{
            transform: "rotate(-10deg)",
          }}
        >
          {/* Atom/React-like icon SVG */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-black"
          >
            <ellipse cx="24" cy="24" rx="16" ry="6.5" />
            <ellipse
              cx="24"
              cy="24"
              rx="16"
              ry="6.5"
              transform="rotate(60 24 24)"
            />
            <ellipse
              cx="24"
              cy="24"
              rx="16"
              ry="6.5"
              transform="rotate(120 24 24)"
            />
            <circle cx="24" cy="24" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-accent-foreground font-bold">
          {message.title.length > 40
            ? `${message.title.substring(0, 40)}...`
            : message.title}
        </h3>
        {message.description && (
          <p className="text-sm text-accent-foreground mt-1">
            {message.description.length > 40
              ? `${message.description.substring(0, 40)}...`
              : message.description}
          </p>
        )}
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6 text-accent-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      </div>
    </button>
  );
}
