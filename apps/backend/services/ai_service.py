from tools.llm_tool import LLMTool

class AIService:
    def __init__(self):
        self.llm_tool = LLMTool()

    def process_query(self, context: str, query: str) -> str:
        # Use the LLM tool to process the query
        return self.llm_tool.generate_response(context, query)