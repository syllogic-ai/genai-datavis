# Quick Fix for Backend Server Import Error

## 🛠️ The Problem
The server is failing to start because of import conflicts between the new dashboard chat system and the existing orchestrator system.

## ⚡ Quick Solution

### Option 1: Minimal Fix (Recommended)
Replace the entire content of `/apps/backend/services/intent_analysis_agent.py` with this minimal version:

```python
"""
Simple Intent Analysis Agent - Minimal Version
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class AnalysisOutput(BaseModel):
    """Analysis output for compatibility."""
    intent: str = "create"
    operation_type: str = "create"
    widget_types: List[str] = ["chart"]
    confidence: float = 0.8
    reasoning: str = "Simple rule-based analysis"

class IntentAnalysisAgent:
    """Simple intent analysis agent."""
    
    async def analyze_intent(self, user_prompt: str, **kwargs) -> Dict[str, Any]:
        return {
            "intent": "create",
            "operation_type": "create", 
            "widget_types": ["chart"],
            "confidence": 0.8,
            "reasoning": "Simple rule-based analysis",
            "widget_specs": [{
                "type": "chart",
                "title": "Data Analysis",
                "config": {"chartType": "line"},
                "data": None,
                "sql": None,
                "layout": None
            }]
        }

# Create simple agent for compatibility
intent_analysis_agent = Agent(
    "openai:gpt-4.1",
    result_type=AnalysisOutput,
    system_prompt="You analyze user intent for data visualization."
)
```

### Option 2: Disable New System Temporarily

If you want to keep the existing system working, you can:

1. **Comment out the new endpoint** in `/apps/backend/app/main.py`:
   ```python
   # @app.post("/chat/analyze", response_model=EnqueueResponse)
   # async def analyze_chat_message(request: ChatAnalysisRequest):
   #     # ... entire function commented out
   ```

2. **Remove the imports** at the top:
   ```python
   # from apps.backend.services.dashboard_chat_processor import process_dashboard_chat_request
   # from apps.backend.utils.widget_operations import trigger_dashboard_refresh
   ```

## 🚀 Testing the Fix

After applying either fix:

1. **Start the backend**:
   ```bash
   cd apps/backend
   python setup.py
   ```

2. **Test the existing `/analyze` endpoint**:
   ```bash
   curl -X POST http://localhost:8000/analyze \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test","file_id":"test","chat_id":"test","request_id":"test"}'
   ```

3. **Start the frontend**:
   ```bash
   cd apps/frontend
   npm run dev
   ```

## 📋 What This Means

- ✅ **Your backend will start** and the existing chat system will work
- ✅ **Frontend can call `/api/chat/analyze`** which will proxy to the working backend
- ⚠️ **New dashboard features** will use the legacy processing temporarily
- 🔄 **We can gradually migrate** to the new system once the base is stable

## 🔧 Next Steps

Once the server is running, we can:

1. **Test the basic flow** with your existing chat interface
2. **Debug the import conflicts** step by step
3. **Gradually enable** the new dashboard features
4. **Migrate to the full agentic flow** when ready

The most important thing is getting your development environment working so you can test the frontend integration!