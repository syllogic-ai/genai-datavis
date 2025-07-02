# Dashboard Chat Integration Guide

This guide explains how to integrate the new dashboard-centric chat functionality with your frontend.

## New Backend API Endpoint

### POST `/chat/analyze`

The new endpoint accepts dashboard-centric chat messages:

```typescript
interface ChatAnalysisRequest {
  message: string;
  dashboardId: string;
  contextWidgetIds?: string[];
  targetWidgetType?: string;
  chat_id: string;
  request_id: string;
}
```

## Frontend Integration Steps

### 1. Update Chat Message Sending

Replace your current message sending logic with the new structure:

```typescript
// OLD: File-based approach
const sendMessage = async (message: string, fileId: string) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({
      prompt: message,
      file_id: fileId,
      chat_id: chatId,
      request_id: uuidv4()
    })
  });
};

// NEW: Dashboard-centric approach
const sendMessage = async (
  message: string, 
  dashboardId: string,
  contextWidgetIds?: string[],
  targetWidgetType?: string
) => {
  const response = await fetch('/api/chat/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      dashboardId,
      contextWidgetIds,
      targetWidgetType,
      chat_id: chatId,
      request_id: uuidv4()
    })
  });
};
```

### 2. Handle Widget Context

Allow users to select widgets for context:

```typescript
const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
const [targetWidgetType, setTargetWidgetType] = useState<string | undefined>();

// Widget selection component
const WidgetSelector = () => {
  return (
    <div className="flex gap-2 mb-4">
      {widgets.map(widget => (
        <button
          key={widget.id}
          onClick={() => toggleWidgetSelection(widget.id)}
          className={`px-3 py-1 rounded ${
            selectedWidgets.includes(widget.id) 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200'
          }`}
        >
          {widget.title}
        </button>
      ))}
    </div>
  );
};

const toggleWidgetSelection = (widgetId: string) => {
  setSelectedWidgets(prev => 
    prev.includes(widgetId)
      ? prev.filter(id => id !== widgetId)
      : [...prev, widgetId]
  );
};
```

### 3. Real-time Dashboard Updates

Listen for dashboard changes using Supabase real-time:

```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const useDashboardRealtime = (dashboardId: string) => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const subscription = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dashboards',
          filter: `id=eq.${dashboardId}`
        },
        (payload) => {
          console.log('Dashboard updated:', payload);
          setLastUpdate(new Date());
          // Trigger dashboard refresh
          refreshDashboard();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widgets',
          filter: `dashboard_id=eq.${dashboardId}`
        },
        (payload) => {
          console.log('Widget updated:', payload);
          setLastUpdate(new Date());
          // Trigger widget refresh
          refreshWidgets();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dashboardId]);

  return { lastUpdate };
};
```

### 4. Enhanced Chat Interface

Create an enhanced chat interface with widget context:

```typescript
const DashboardChat = ({ dashboardId }: { dashboardId: string }) => {
  const [message, setMessage] = useState('');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<string>();
  
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    await sendMessage(
      message,
      dashboardId,
      selectedWidgets.length > 0 ? selectedWidgets : undefined,
      targetType
    );
    
    setMessage('');
    setSelectedWidgets([]);
    setTargetType(undefined);
  };

  return (
    <div className="chat-container">
      {/* Widget Context Selection */}
      <WidgetSelector />
      
      {/* Target Widget Type */}
      <select 
        value={targetType || ''} 
        onChange={(e) => setTargetType(e.target.value || undefined)}
        className="mb-2 p-2 border rounded"
      >
        <option value="">Any widget type</option>
        <option value="chart">Chart</option>
        <option value="table">Table</option>
        <option value="kpi">KPI</option>
        <option value="text">Text</option>
      </select>
      
      {/* Message Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about your dashboard or request changes..."
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
      
      {/* Selected Context Indicator */}
      {selectedWidgets.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          Context: {selectedWidgets.length} widget(s) selected
        </div>
      )}
    </div>
  );
};
```

### 5. Chat Message Storage

Update your chat message storage to include the new fields:

```typescript
// Update your ConversationItem type
interface ConversationItem {
  role: string;
  message: string;
  timestamp: string;
  contextWidgetIds?: string[];
  targetWidgetType?: string;
}

// Update chat storage
const saveMessageToChat = async (
  chatId: string,
  role: 'user' | 'assistant',
  message: string,
  contextWidgetIds?: string[],
  targetWidgetType?: string
) => {
  const conversationItem: ConversationItem = {
    role,
    message,
    timestamp: new Date().toISOString(),
    contextWidgetIds,
    targetWidgetType
  };

  // Save to Supabase
  const { data: chat } = await supabase
    .table('chats')
    .select('conversation')
    .eq('id', chatId)
    .single();

  const updatedConversation = [
    ...(chat?.conversation || []),
    conversationItem
  ];

  await supabase
    .table('chats')
    .update({ 
      conversation: updatedConversation,
      updated_at: new Date().toISOString()
    })
    .eq('id', chatId);
};
```

## Message Examples

### Creating New Widgets
```typescript
// User wants to create a chart
sendMessage(
  "Show me sales trends over time",
  dashboardId,
  undefined, // no context widgets
  "chart"    // target type
);

// User wants to create a KPI
sendMessage(
  "What's our total revenue?",
  dashboardId,
  undefined,
  "kpi"
);
```

### Editing Existing Widgets
```typescript
// User wants to edit specific widgets
sendMessage(
  "Change the color scheme to blue",
  dashboardId,
  ["widget-id-1", "widget-id-2"], // context widgets
  undefined
);

// User wants to update a chart
sendMessage(
  "Make this chart show monthly data instead",
  dashboardId,
  ["chart-widget-id"],
  undefined
);
```

### Analysis Requests
```typescript
// User wants insights
sendMessage(
  "What insights can you provide about this data?",
  dashboardId,
  selectedWidgetIds, // optional context
  undefined
);
```

## Error Handling

```typescript
const sendMessage = async (...args) => {
  try {
    const response = await fetch('/api/chat/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // ... message data
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.message) {
      throw new Error('Failed to enqueue message');
    }

    // Show success feedback
    showNotification('Message sent successfully', 'success');
    
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Failed to send message', 'error');
  }
};
```

## Migration Notes

1. **Backward Compatibility**: The old `/analyze` endpoint is still available for legacy support
2. **Chat Association**: Ensure chats are properly linked to dashboards in your database
3. **Real-time Setup**: Configure Supabase real-time subscriptions for your dashboard
4. **Widget Context**: Consider adding UI elements to help users select widget context
5. **Error Boundaries**: Add proper error handling for the new async operations

This integration enables a much more sophisticated and context-aware chat experience for your dashboard users.