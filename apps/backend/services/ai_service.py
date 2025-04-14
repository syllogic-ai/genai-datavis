from tools.llm_tool import LLMTool

class AIService:
    def __init__(self):
        self.llm_tool = LLMTool()
        self.current_data = None

    def process_query(self, context: str, query: str, wait_for_analysis: bool = False) -> str:
        # Use the LLM tool to process the query
        return self.llm_tool.generate_response(context, query, wait_for_analysis)
    
    def set_analysis_complete(self, status: bool = True) -> None:
        """Update the LLM tool's analysis completion status"""
        self.llm_tool.set_analysis_complete(status)