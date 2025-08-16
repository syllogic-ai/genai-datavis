"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FileRecord } from "../hooks/useSetupState";
import { ChatInput } from "@/components/dashboard/ChatInput";
import { useDashboardChat } from "../hooks/useDashboardChat";
import { useChatRealtime } from "@/app/lib/hooks/useChatRealtime";
import { useJobStatusRealtime } from "@/app/lib/hooks/useJobStatusRealtime";

interface ChatPhaseProps {
  dashboardId: string;
  files: FileRecord[];
  onFirstMessage: () => void;
  onBack: () => void;
  onWidgetsRefresh?: () => Promise<void>;
}

export function ChatPhase({ dashboardId, files, onFirstMessage, onBack, onWidgetsRefresh }: ChatPhaseProps) {
  const [hasTyped, setHasTyped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'submitting' | 'processing' | 'completed'>('idle');
  const [processingMessage, setProcessingMessage] = useState('');
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [completionTimer, setCompletionTimer] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedData, setLastSubmittedData] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Get or create chat for this dashboard
  const { chatId, isLoading: isChatLoading } = useDashboardChat(dashboardId);
  
  // Job status monitoring with Supabase Realtime
  const {
    status: jobStatus,
    progress: jobProgress,
    error: jobError,
    job: jobData,
    isCompleted: jobCompleted,
    isFailed: jobFailed,
    disconnect: disconnectJob
  } = useJobStatusRealtime(pendingTaskId, {
    onComplete: async (job) => {
      console.log('Job completed via Realtime:', job);
      if (!hasNavigated) {
        setProcessingStatus('completed');
        setProcessingMessage('Dashboard ready!');
        setHasNavigated(true);
        
        // Clear any existing timer
        if (completionTimer) {
          clearTimeout(completionTimer);
          setCompletionTimer(null);
        }
        
        // Refresh widgets to load the newly created ones with cache busting
        if (onWidgetsRefresh) {
          try {
            console.log('Refreshing dashboard widgets after job completion (with cache bust)');
            // Add small delay to ensure backend has completed all operations
            setTimeout(async () => {
              await onWidgetsRefresh();
            }, 1500);
          } catch (error) {
            console.error('Failed to refresh widgets:', error);
          }
        }
        
        // Small delay to show completion message, then transition
        const timer = setTimeout(() => {
          onFirstMessage();
        }, 1500);
        setCompletionTimer(timer);
      }
    },
    onError: (error) => {
      console.error('Job error via Realtime:', error);
      setProcessingStatus('idle');
      setProcessingMessage('');
      setPendingTaskId(null);
      setErrorMessage(error);
    }
  });
  
  // Subscribe to real-time chat updates to detect completion
  const { conversation, isLoading: isConversationLoading } = useChatRealtime(
    chatId || '',
    {
      onUpdate: (messages) => {
        console.log('Chat messages updated:', messages.length, 'processing status:', processingStatus);
        
        // Only check for completion if we're currently processing
        if (processingStatus === 'processing' && pendingTaskId) {
          // Look for system messages that indicate completion
          const completionMessages = messages.filter(msg => 
            msg.role === 'system' &&
            msg.timestamp && // Ensure it's a recent message
            (msg.chart_id || msg.widget_ids) // Has associated widgets
          );
          
          // Also check for recent system messages with completion indicators in content
          const recentMessages = messages.filter(msg => 
            msg.role === 'system' &&
            msg.timestamp &&
            new Date(msg.timestamp).getTime() > Date.now() - 300000 // Within last 5 minutes
          );
          
          const hasCompletionMessage = completionMessages.length > 0;
          const hasRecentResponse = recentMessages.length > 0;
          
          if (hasCompletionMessage || hasRecentResponse) {
            const relevantMessage = completionMessages[0] || recentMessages[recentMessages.length - 1];
            
            // Check if the message content suggests completion (ChatMessage uses 'content' property)
            const messageContent = (relevantMessage as any).content?.toLowerCase() || '';
            const indicatesCompletion = (
              hasCompletionMessage || // Has widget IDs, definitely completed
              messageContent.includes('widget') ||
              messageContent.includes('chart') ||
              messageContent.includes('visualization') ||
              messageContent.includes('dashboard') ||
              messageContent.includes('analysis') ||
              messageContent.includes('created') ||
              messageContent.includes('generated') ||
              messageContent.includes('complete')
            );
            
            if (indicatesCompletion && !hasNavigated) {
              console.log('AI processing completed, transitioning to dashboard. Message:', relevantMessage);
              setProcessingStatus('completed');
              setProcessingMessage('Dashboard ready!');
              setPendingTaskId(null);
              setErrorMessage(null); // Clear any existing errors
              setHasNavigated(true); // Prevent multiple navigation calls
              
              // Clear any existing timer
              if (completionTimer) {
                clearTimeout(completionTimer);
                setCompletionTimer(null);
              }
              
              // Small delay to show completion message, then transition
              const timer = setTimeout(() => {
                onFirstMessage();
              }, 1500);
              setCompletionTimer(timer);
            }
          }
        }
      }
    }
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (completionTimer) {
        clearTimeout(completionTimer);
      }
    };
  }, [completionTimer]);
  
  // Add fallback timeout for completion detection
  useEffect(() => {
    if (processingStatus === 'processing' && pendingTaskId && !hasNavigated) {
      // Set a fallback timeout (60 seconds) in case real-time detection fails
      const fallbackTimer = setTimeout(() => {
        console.log('Fallback timeout reached, checking for completion');
        // Check if we have any system messages (completion indicators)
        if (conversation.some(msg => msg.role === 'system') && !hasNavigated) {
          setProcessingStatus('completed');
          setProcessingMessage('Dashboard ready!');
          setPendingTaskId(null);
          setHasNavigated(true); // Prevent duplicate navigation
          
          setTimeout(() => {
            onFirstMessage();
          }, 1500);
        } else if (!hasNavigated) {
          // If no response after timeout, show error
          setProcessingStatus('idle');
          setProcessingMessage('');
          setPendingTaskId(null);
          setErrorMessage('Processing is taking longer than expected. The AI might be experiencing high load.');
          
          // Clear error after 15 seconds
          setTimeout(() => {
            setErrorMessage(null);
          }, 15000);
        }
      }, 60000); // 60 second fallback
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [processingStatus, pendingTaskId, conversation, onFirstMessage, hasNavigated]);

  const handleSubmit = async (data: {
    selectedItems: any[];
    message: string;
    widgetType: string;
  }) => {
    if (!data.message.trim() || isSubmitting || !chatId) return;
    
    // Store data for potential retry
    setLastSubmittedData(data);

    setIsSubmitting(true);
    setHasTyped(true);
    setProcessingStatus('submitting');
    setProcessingMessage('Sending your request...');
    setHasNavigated(false); // Reset navigation flag for new submission
    
    try {
      // Real API call to analyze endpoint
      const analyzeRequest = {
        message: data.message,
        dashboardId,
        contextWidgetIds: data.selectedItems?.length ? data.selectedItems.map(item => item.id) : undefined,
        targetWidgetType: data.widgetType || undefined,
        chatId
      };

      console.log('Sending analyze request:', analyzeRequest);

      const response = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText}` };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Analyze response:', result);
      
      if (result.success) {
        console.log(`Message sent successfully. Task ID: ${result.taskId}`);
        
        // Move to processing state - we'll wait for real-time updates to detect completion
        setProcessingStatus('processing');
        setProcessingMessage('Creating your dashboard...');
        
        // Store the task ID for tracking
        const taskId = result.taskId || result.requestId;
        console.log('Setting pending task ID:', taskId);
        
        // Add a small delay to allow backend to create the job record
        setTimeout(() => {
          setPendingTaskId(taskId);
        }, 1000);
        
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error("Failed to analyze message:", error);
      setProcessingStatus('idle');
      setProcessingMessage('');
      setPendingTaskId(null);
      
      // Set user-friendly error message with retry option
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(`Failed to process your request: ${errorMsg}`);
      setRetryCount(prev => prev + 1);
      
      // Clear error after 15 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 15000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show main UI even while chat is loading - the chat functionality will be disabled until ready

  // Show processing state
  if (processingStatus === 'processing' || processingStatus === 'completed') {
    return (
      <div className="min-h-[calc(100vh-1rem)] flex items-center justify-center p-6 bg-transparent">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center"
          >
            {processingStatus === 'completed' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
              >
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </motion.div>
            ) : (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            )}
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {processingStatus === 'completed' ? 'Dashboard Ready!' : 'Creating Dashboard...'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {processingMessage}
          </p>
          {processingStatus === 'processing' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                This may take a few moments while we analyze your data and create visualizations.
              </p>
              
              {/* Progress indicator if we have job progress */}
              {jobProgress > 0 && (
                <div className="w-full max-w-md mx-auto mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{jobProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${jobProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Analyzing data patterns</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-1 opacity-70">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}} />
                <span>Generating SQL queries</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-1 opacity-50">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}} />
                <span>Creating visualizations</span>
              </div>
            </div>
          )}
          {processingStatus === 'completed' && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Analysis complete! Redirecting to your dashboard...
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-1rem)] flex items-center justify-center p-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl mx-auto text-center flex flex-col items-center"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-start mb-16"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:bg-transparent hover:text-foreground cursor-pointer bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Files
          </Button>
        </motion.div>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            How can we help you today?
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Ask me anything about your data and I&apos;ll create visualizations for you
          </p>
          
          {/* Data Source Indicator */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {files.length} file{files.length === 1 ? '' : 's'} connected
            </Badge>
          </div>
        </motion.div>

        {/* Centered Chat Input */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative bg-sidebar w-fit rounded-2xl"
        >
          <ChatInput 
            availableItems={[]}
            onSubmit={handleSubmit}
            messagePlaceholder={isChatLoading || isConversationLoading ? "Setting up chat interface..." : "Ask me anything about your data..."}
            className="border-none shadow-none bg-transparent text-lg placeholder:text-gray-400 resize-none min-h-[120px] focus:ring-0"
            isLoading={isSubmitting || processingStatus === 'submitting' || isChatLoading || isConversationLoading}
            isDisabled={isSubmitting || processingStatus === 'submitting' || isChatLoading || isConversationLoading}
            showTagSelector={false}
            showWidgetDropdown={false}
          />

          {/* Status indicator */}
          {processingStatus === 'submitting' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-md px-4 py-2 border"
            >
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{processingMessage}</span>
              </div>
            </motion.div>
          )}

          {/* Error Message with Retry */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 max-w-md"
            >
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
                <p className="text-red-700 text-sm mb-2">{errorMessage}</p>
                {lastSubmittedData && retryCount < 3 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setErrorMessage(null);
                        handleSubmit(lastSubmittedData);
                      }}
                      className="text-xs border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
                {retryCount >= 3 && (
                  <p className="text-xs text-red-600 mt-1">
                    Multiple attempts failed. Please refresh the page or contact support.
                  </p>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Subtle animation hint */}
          {!hasTyped && processingStatus === 'idle' && !errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -bottom-12 left-1/2 transform -translate-x-1/2"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
                <span>Start typing to begin...</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
          <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        </div>
      </motion.div>
    </div>
  );
}