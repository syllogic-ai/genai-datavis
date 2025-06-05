"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import type { ChartSpec } from "@/types/chart-types";

/**
 * Specialized renderer for table displays
 */
export function TableRenderer({ spec }: { spec: ChartSpec }) {
  if (spec.chartType !== 'table') {
    console.error(`TableRenderer: Expected chart type 'table', got '${spec.chartType}'`);
    return null;
  }

  if (!spec.data || spec.data.length === 0) {
    console.error("TableRenderer: Table data is empty or undefined");
    return null;
  }

  // Get all columns from the first data item
  const columns = Object.keys(spec.data[0]);
  
  // Format column headers (convert camelCase to Title Case)
  const formatHeader = (key: string) => {
    if (spec.tableConfig?.columnLabels?.[key]) {
      return spec.tableConfig.columnLabels[key];
    }
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
  };

  // Format cell value based on configuration
  const formatCellValue = (value: string | number, columnKey: string) => {
    const formatter = spec.tableConfig?.columnFormatters?.[columnKey];
    if (formatter) {
      if (formatter.type === 'currency') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: formatter.currency || 'USD'
        }).format(Number(value));
      }
      if (formatter.type === 'number') {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: formatter.decimals || 0,
          maximumFractionDigits: formatter.decimals || 0
        }).format(Number(value));
      }
      if (formatter.type === 'percentage') {
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: formatter.decimals || 2,
          maximumFractionDigits: formatter.decimals || 2
        }).format(Number(value) / 100);
      }
    }
    return value;
  };

  // Apply sorting if specified
  let sortedData = [...spec.data];
  if (spec.tableConfig?.sortBy) {
    const { column, direction = 'asc' } = spec.tableConfig.sortBy;
    sortedData.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }

  // Apply pagination if specified
  if (spec.tableConfig?.pagination) {
    const { page = 1, pageSize = 10 } = spec.tableConfig.pagination;
    const startIndex = (page - 1) * pageSize;
    sortedData = sortedData.slice(startIndex, startIndex + pageSize);
  }

  return (
    <div className="w-full h-full overflow-auto">
      <Table>
        {spec.title && (
          <TableCaption className="text-lg font-medium text-foreground mb-4">
            {spec.title}
          </TableCaption>
        )}
        
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={column}
                className={spec.tableConfig?.headerAlignment || "text-left"}
              >
                {formatHeader(column)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow 
              key={index}
              className={spec.tableConfig?.striped && index % 2 === 1 ? "bg-muted/30" : ""}
            >
              {columns.map((column) => (
                <TableCell 
                  key={column}
                  className={spec.tableConfig?.cellAlignment?.[column] || "text-left"}
                >
                  {formatCellValue(row[column], column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}