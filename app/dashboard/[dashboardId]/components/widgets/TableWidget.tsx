"use client";

import { useState } from "react";
import { Widget } from "@/types/enhanced-dashboard-types";
import { TableRenderer } from "@/components/charts/renderers/TableRenderer";
import { ChartSpec } from "@/types/chart-types";

interface TableWidgetProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function TableWidget({ widget, onUpdate, isEditing, onEditToggle }: TableWidgetProps) {
  const [title, setTitle] = useState(widget.config.title || "Data Table");
  const [showHeader, setShowHeader] = useState(widget.config.showHeader !== false);
  const [sortable, setSortable] = useState(widget.config.sortable !== false);
  const [striped, setStriped] = useState(widget.config.striped || false);

  const handleSave = () => {
    onUpdate(widget.id, {
      config: {
        ...widget.config,
        title,
        showHeader,
        sortable,
        striped,
      },
    });
    onEditToggle();
  };

  const handleCancel = () => {
    setTitle(widget.config.title || "Data Table");
    setShowHeader(widget.config.showHeader !== false);
    setSortable(widget.config.sortable !== false);
    setStriped(widget.config.striped || false);
    onEditToggle();
  };

  // Sample data for demonstration
  const sampleData = [
    { name: "John Doe", email: "john@example.com", role: "Admin", status: "Active", revenue: 12500 },
    { name: "Jane Smith", email: "jane@example.com", role: "Editor", status: "Active", revenue: 8900 },
    { name: "Bob Johnson", email: "bob@example.com", role: "Viewer", status: "Inactive", revenue: 4200 },
    { name: "Alice Brown", email: "alice@example.com", role: "Editor", status: "Active", revenue: 15600 },
    { name: "Charlie Wilson", email: "charlie@example.com", role: "Admin", status: "Active", revenue: 22100 },
  ];

  const tableSpec: ChartSpec = {
    chartType: "table",
    title: widget.config.title || "Sample Table",
    description: "Sample table data",
    data: sampleData,
    tableConfig: {
      columnLabels: {
        name: "Name",
        email: "Email Address",
        role: "Role",
        status: "Status",
        revenue: "Revenue",
      },
      columnFormatters: {
        revenue: {
          type: "currency",
          currency: "USD",
          decimals: 0,
        },
      },
      striped: widget.config.striped,
      sortBy: widget.config.sortable ? {
        column: "name",
        direction: "asc",
      } : undefined,
    },
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        <div className="space-y-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Table Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1 text-sm border rounded bg-background"
              placeholder="Enter table title"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Header</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sortable}
                onChange={(e) => setSortable(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sortable</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={striped}
                onChange={(e) => setStriped(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Striped Rows</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <TableRenderer spec={{ ...tableSpec, title }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg transition-all duration-200 p-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--card-foreground)', boxShadow: 'var(--shadow)' }}>
      {widget.config.title && (
        <div className="mb-3">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            {widget.config.title}
          </h3>
        </div>
      )}
      
      <div className="flex-1 min-h-0 overflow-auto">
        {widget.data || sampleData ? (
          <TableRenderer spec={tableSpec} />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
            <div className="text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">No table data available</p>
              <p className="text-xs mt-1">Click edit to configure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}