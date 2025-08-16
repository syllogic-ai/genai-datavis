import { NextRequest, NextResponse } from 'next/server';

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
    const response = await fetch(filePath);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the file content
    const fileContent = await response.arrayBuffer();
    
    // Extract filename from URL
    const urlObj = new URL(filePath);
    const fileName = urlObj.pathname.split('/').pop() || 'download.csv';

    // Create response with appropriate headers
    const downloadResponse = new NextResponse(fileContent);
    
    // Set headers for file download
    downloadResponse.headers.set('Content-Disposition', `attachment; filename=${fileName}`);
    downloadResponse.headers.set('Content-Type', 'text/csv');
    
    return downloadResponse;
  } catch (error) {
    console.error('Error downloading CSV file:', error);
    
    return NextResponse.json(
      { error: 'Failed to download CSV file' },
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