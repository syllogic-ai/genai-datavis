from tools.llm_tool import LLMTool
from typing import Optional

class AIService:
    def __init__(self):
        self.llm_tool = LLMTool()
        self.current_data = None

    def process_query(self, context: str, query: str, user_id: Optional[str] = None, 
                     chat_id: Optional[str] = None, api_request: str = "/analyze", 
                     wait_for_analysis: bool = False) -> str:
        """
        Process a user query using the LLM tool.
        
        Args:
            context: The context for the LLM
            query: The user's query
            user_id: Optional user ID for tracking usage
            chat_id: Optional chat ID for tracking usage
            api_request: The API endpoint or function that made the request
            wait_for_analysis: Whether to wait for analysis to complete
            
        Returns:
            str: The response from the LLM
        """
        # Use the LLM tool to process the query with usage tracking
        return self.llm_tool.generate_response(
            context, 
            query, 
            user_id=user_id, 
            chat_id=chat_id, 
            api_request=api_request, 
            wait_for_analysis=wait_for_analysis
        )
    
    def set_analysis_complete(self, status: bool = True) -> None:
        """Update the LLM tool's analysis completion status"""
        self.llm_tool.set_analysis_complete(status)