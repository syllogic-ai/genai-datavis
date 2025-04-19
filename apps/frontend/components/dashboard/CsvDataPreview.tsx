'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CsvDataPreviewProps {
  filePath: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

export function CsvDataPreview({ filePath }: CsvDataPreviewProps) {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: 0
  });
  const [totalColumns, setTotalColumns] = useState(0);

  const fetchCsvData = useCallback(async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!filePath) {
        throw new Error("File path is required to fetch CSV data");
      }
      
      const response = await fetch(
        `/api/csv?filePath=${encodeURIComponent(filePath)}&page=${page}&pageSize=${pageSize}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result || !result.records) {
        throw new Error("Invalid response format from the server");
      }
      
      setData(result.records || []);
      setPagination(result.pagination || {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalRecords: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CSV data');
      console.error('Error fetching CSV data:', err);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  // Initial data load
  useEffect(() => {
    if (filePath) {
      fetchCsvData();
    } else {
      setError("No file path provided");
      setLoading(false);
    }
  }, [filePath, fetchCsvData]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchCsvData(newPage, pagination.pageSize);
  };

  // Get the range of rows being displayed
  const getDisplayRange = () => {
    if (pagination.totalRecords === 0) return 'No data';
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(start + pagination.pageSize - 1, pagination.totalRecords);
    return `${start}-${end} of ${pagination.totalRecords} rows`;
  };

  if (loading && pagination.page === 1) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 border border-red-200 rounded bg-red-50">
        <p className="font-medium">Error loading data:</p>
        <p>{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => fetchCsvData()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!data.length) {
    return <div className="p-4">No data available</div>;
  }

  const headers = data[0];
  const rows = data.slice(1);
  
  // Calculate the starting row index
  const startRowIndex = (pagination.page - 1) * pagination.pageSize;

  // Render pagination items based on current page
  const renderPaginationItems = () => {
    const items = [];
    
    // Current page
    items.push(
      <PaginationItem key={pagination.page}>
        <Button 
          variant="default"
          size="icon"
          className="h-7 w-fit min-w-7 px-2 text-xs"
          disabled={loading}
        >
          {pagination.page}
        </Button>
      </PaginationItem>
    );
    
    // Next page if not last page
    if (pagination.page < pagination.totalPages) {
      items.push(
        <PaginationItem key={pagination.page + 1}>
          <Button 
            variant="outline"
            size="icon"
            className="h-7 w-fit min-w-7 px-2 text-xs"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={loading}
          >
            {pagination.page + 1}
          </Button>
        </PaginationItem>
      );
    }
    
    // Add ellipsis if there are more pages
    if (pagination.page + 1 < pagination.totalPages) {
      items.push(
        <PaginationItem key="ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
      
      // Last page
      items.push(
        <PaginationItem key={pagination.totalPages}>
          <Button 
            variant="outline"
            size="icon"
            className="h-7 w-fit min-w-7 px-2 text-xs"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={loading}
          >
            {pagination.totalPages}
          </Button>
        </PaginationItem>
      );
    }
    
    return items;
  };

  return (
    <div className="w-full space-y-3">
      <div className="w-full overflow-hidden rounded-md border">
        <div className="max-h-[300px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[60px] bg-muted/50 sticky left-0 z-20">#</TableHead>
                {headers.map((header, index) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: pagination.pageSize }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell className="font-medium bg-muted/20 sticky left-0 z-10">{startRowIndex + index + 1}</TableCell>
                    {Array.from({ length: headers.length }).map((_, cellIndex) => (
                      <TableCell key={`loading-cell-${cellIndex}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-muted/5' : ''}>
                    <TableCell className="font-medium bg-muted/20 sticky left-0 z-10">{startRowIndex + rowIndex + 1}</TableCell>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {getDisplayRange()}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button 
                variant="outline" 
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePageChange(pagination.page - 1)} 
                disabled={pagination.page === 1 || loading}
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="sr-only">Previous page</span>
              </Button>
            </PaginationItem>
            
            {renderPaginationItems()}
            
            <PaginationItem>
              <Button 
                variant="outline" 
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePageChange(pagination.page + 1)} 
                disabled={pagination.page === pagination.totalPages || loading}
              >
                <ChevronRight className="h-3 w-3" />
                <span className="sr-only">Next page</span>
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
} 