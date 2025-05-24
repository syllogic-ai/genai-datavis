import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('filePath');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const getMetadataOnly = searchParams.get('metadataOnly') === 'true';

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Validate that the URL is a CSV file
    if (!filePath.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // For security, validate the URL
    if (!isValidUrl(filePath)) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Fetch the remote CSV file
    const response = await fetch(filePath);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the file content
    const fileContent = await response.text();
    
    // Parse CSV content
    const allRecords = parse(fileContent, {
      skip_empty_lines: true,
      trim: true,
    });

    // Get total records count and headers
    const totalRecords = allRecords.length;
    const headers = totalRecords > 0 ? allRecords[0] : [];

    // If only metadata is requested, return that
    if (getMetadataOnly) {
      return NextResponse.json({
        totalRecords: totalRecords > 0 ? totalRecords - 1 : 0, // Exclude header row
        totalColumns: headers.length,
        headers,
      });
    }

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);
    
    // Get records for the requested page (including header row if it's the first page)
    const paginatedRecords = page === 1 
      ? allRecords.slice(0, endIndex)
      : [allRecords[0], ...allRecords.slice(startIndex, endIndex)];

    return NextResponse.json({
      records: paginatedRecords,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil((totalRecords - 1) / pageSize), // Exclude header row from pagination calculation
        totalRecords: totalRecords > 0 ? totalRecords - 1 : 0, // Exclude header row from total
      }
    });
  } catch (error) {
    console.error('Error processing CSV file:', error);
    
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}

// Helper function to validate URLs
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
} 