import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('filePath');

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
    const response = await fetch(filePath, {
      method: 'HEAD'
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get basic file info from response headers
    const lastModified = response.headers.get('last-modified');
    const contentLength = response.headers.get('content-length');
    
    // Make a separate request to get the content for parsing
    const contentResponse = await fetch(filePath);
    const fileContent = await contentResponse.text();
    
    // Parse CSV content to get rows and columns
    const records = parse(fileContent, {
      skip_empty_lines: true,
      trim: true,
    });
    
    const rows = records.length;
    const columns = rows > 0 ? records[0].length : 0;
    
    // Extract filename from URL
    const urlObj = new URL(filePath);
    const fileName = urlObj.pathname.split('/').pop() || 'unknown.csv';

    return NextResponse.json({
      size: parseInt(contentLength || '0', 10),
      created: lastModified || new Date().toISOString(),
      modified: lastModified || new Date().toISOString(),
      rows,
      columns,
      fileName
    });
  } catch (error) {
    console.error('Error getting file info:', error);
    
    return NextResponse.json(
      { error: 'Failed to get file info' },
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