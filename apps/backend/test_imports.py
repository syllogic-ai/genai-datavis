#!/usr/bin/env python3
"""
Test to verify all imports work correctly after schema alignment changes.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all imports work correctly."""
    
    print("🔍 Testing Backend Imports After Schema Alignment")
    print("=" * 50)
    
    try:
        print("✅ Testing core models...")
        from core.models import Deps, ConversationItem, ChatMessageRequest
        from services.coordinator_agent import AnalysisOutput
        from services.sql_agent import SQLOutput
        print("  - Core models imported successfully")
        
        print("✅ Testing chat utilities...")
        from utils.chat import append_chat_message, get_widget_specs, update_widget_specs
        print("  - Chat utilities imported successfully")
        
        print("✅ Testing agents...")
        from services.coordinator_agent import coordinator_agent
        from services.sql_agent import sql_agent  
        from services.viz_agent import viz_agent
        print("  - All agents imported successfully")
        
        print("✅ Testing LLM interaction...")
        from tools.llm_interaction import process_user_request
        print("  - LLM interaction imported successfully")
        
        print("✅ Testing utils...")
        from utils.utils import get_data
        print("  - Utils imported successfully")
        
        print("\n🎉 All imports successful!")
        print("✅ Backend is ready to start")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)