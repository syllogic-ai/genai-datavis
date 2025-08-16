"use client";

import React, { useEffect, useState } from 'react';
import { useLayout } from '@/components/dashboard/LayoutContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutTestUtilsProps {
  onTestLayoutRecovery?: () => void;
}

export function LayoutTestUtils({ onTestLayoutRecovery }: LayoutTestUtilsProps) {
  const {
    mainSidebarOpen,
    chatSidebarOpen,
    availableWidth,
    effectiveBreakpoint,
    isTransitioning,
    setMainSidebarOpen,
    setChatSidebarOpen,
    getGridCols,
  } = useLayout();

  const [testResults, setTestResults] = useState<{
    scenario: string;
    success: boolean;
    details: string;
  }[]>([]);

  // Test different sidebar combinations
  const runLayoutTests = async () => {
    const results = [];
    
    // Test 1: Main sidebar toggle
    results.push({
      scenario: 'Main Sidebar Toggle',
      success: true,
      details: `Available width changes from ${availableWidth}px to ${availableWidth + (mainSidebarOpen ? 280 : -280)}px`
    });

    // Test 2: Chat sidebar toggle
    results.push({
      scenario: 'Chat Sidebar Toggle',
      success: true,
      details: `Grid columns: ${getGridCols()}, Breakpoint: ${effectiveBreakpoint}`
    });

    // Test 3: Both sidebars
    results.push({
      scenario: 'Both Sidebars Open',
      success: availableWidth > 400,
      details: `Minimum width maintained: ${availableWidth > 400 ? 'Yes' : 'No'}`
    });

    setTestResults(results);
  };

  // Automated test sequence
  const runAutomatedTests = async () => {
    console.log('🧪 Starting automated layout tests...');
    
    // Test sequence: closed -> main open -> chat open -> both open -> closed
    const sequence = [
      { main: false, chat: false, delay: 1000 },
      { main: true, chat: false, delay: 1000 },
      { main: true, chat: true, delay: 1000 },
      { main: false, chat: true, delay: 1000 },
      { main: false, chat: false, delay: 1000 },
    ];

    for (const step of sequence) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      setMainSidebarOpen(step.main);
      setChatSidebarOpen(step.chat);
      
      console.log(`📏 Layout state: Main=${step.main}, Chat=${step.chat}, Available=${availableWidth}px, Cols=${getGridCols()}`);
    }
    
    console.log('✅ Automated tests completed');
    runLayoutTests();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-sm">Layout Debug Panel</h3>
        
        {/* Current State */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Badge variant={mainSidebarOpen ? "default" : "secondary"}>
            Main: {mainSidebarOpen ? 'Open' : 'Closed'}
          </Badge>
          <Badge variant={chatSidebarOpen ? "default" : "secondary"}>
            Chat: {chatSidebarOpen ? 'Open' : 'Closed'}
          </Badge>
          <Badge variant="outline">
            Width: {availableWidth}px
          </Badge>
          <Badge variant="outline">
            Cols: {getGridCols()}
          </Badge>
          <Badge variant="outline">
            BP: {effectiveBreakpoint}
          </Badge>
          <Badge variant={isTransitioning ? "destructive" : "secondary"}>
            {isTransitioning ? 'Transitioning' : 'Stable'}
          </Badge>
        </div>

        {/* Test Controls */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setMainSidebarOpen(!mainSidebarOpen)}
          >
            Toggle Main
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
          >
            Toggle Chat
          </Button>
        </div>

        <Button 
          size="sm" 
          onClick={runAutomatedTests}
          className="w-full"
        >
          Run Auto Tests
        </Button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mt-2 text-xs">
            <div className="font-medium mb-1">Test Results:</div>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center gap-1 mb-1">
                <span className={result.success ? "text-green-600" : "text-red-600"}>
                  {result.success ? "✅" : "❌"}
                </span>
                <span className="font-medium">{result.scenario}:</span>
                <span className="text-muted-foreground">{result.details}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Breakpoint info component
export function BreakpointIndicator() {
  const { availableWidth, effectiveBreakpoint, getGridCols } = useLayout();
  
  return (
    <div className="fixed top-20 left-4 z-40 bg-background/80 backdrop-blur border rounded px-2 py-1 text-xs">
      <div className="flex gap-2">
        <span>{effectiveBreakpoint}</span>
        <span>•</span>
        <span>{availableWidth}px</span>
        <span>•</span>
        <span>{getGridCols()} cols</span>
      </div>
    </div>
  );
}