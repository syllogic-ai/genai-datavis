# SQL Agent Confidence Scoring

## Overview

The SQL agent now includes a confidence scoring tool that evaluates how well generated SQL queries match user requests. This tool provides a quantitative measure (0-100) of the agent's confidence in the generated query's accuracy and relevance.

**The coordinator agent has been updated to automatically handle confidence scoring and provide follow-up questions when confidence is low (< 50).**

## Features

- **Confidence Score**: A numerical score from 0 to 100 indicating confidence level
- **Detailed Reasoning**: Explanation of why the score was assigned
- **Issue Identification**: List of potential problems or concerns with the query
- **Multi-criteria Evaluation**: Considers semantic alignment, technical accuracy, data relevance, logical completeness, and edge case handling
- **Automatic Follow-up Questions**: When confidence is low, the coordinator agent generates specific questions to improve the query
- **Smart Workflow**: Automatically decides whether to proceed with visualization based on confidence score

## Coordinator Agent Integration

The coordinator agent now automatically:

1. **Always calculates confidence** when generating SQL queries
2. **Checks confidence threshold** (50 points) before proceeding
3. **Generates follow-up questions** when confidence is low
4. **Provides clear user feedback** about why the query couldn't be completed
5. **Only creates visualizations** when confidence is high enough

### Workflow Logic

```
User Request → Generate SQL → Calculate Confidence → Decision Point
                                                      ↓
                                              Confidence >= 50?
                                              ↓              ↓
                                         Yes              No
                                         ↓              ↓
                                    Create Chart    Generate Follow-up
                                    & Visualize     Questions
```

## Usage

### Basic Usage

```python
from apps.backend.services.sql_agent import sql_agent, ConfidenceInput
from apps.backend.core.models import Deps

# Create confidence input
confidence_input = ConfidenceInput(
    user_prompt="Show me total sales by month",
    generated_sql="SELECT month, SUM(sales) FROM data GROUP BY month",
    dataset_schema={"month": "TEXT", "sales": "FLOAT"}
)

# Calculate confidence
confidence_result = await sql_agent.calculate_confidence(deps, confidence_input)

print(f"Confidence Score: {confidence_result.confidence_score}/100")
print(f"Reasoning: {confidence_result.reasoning}")
print(f"Issues: {confidence_result.potential_issues}")
```

### Coordinator Agent Usage

```python
from apps.backend.services.coordinator_agent import coordinator_agent
from apps.backend.core.models import Deps

# The coordinator agent handles everything automatically
result = await coordinator_agent.run(user_prompt, deps=deps)

# Check the results
print(f"Answer: {result.output.answer}")
print(f"Confidence Score: {result.output.confidence_score}")

if result.output.follow_up_questions:
    print("Follow-up questions:")
    for question in result.output.follow_up_questions:
        print(f"- {question}")

if result.output.chart_id:
    print(f"Chart created: {result.output.chart_id}")
```

### Integration with SQL Generation

The confidence scoring can be integrated into the SQL generation workflow:

```python
# Generate SQL
sql_result = await sql_agent.run(user_prompt, deps=deps)

# Calculate confidence for the generated SQL
confidence_input = ConfidenceInput(
    user_prompt=user_prompt,
    generated_sql=sql_result.output.sql,
    dataset_schema=profile.columns
)

confidence_result = await sql_agent.calculate_confidence(deps, confidence_input)

# Use confidence score to make decisions
if confidence_result.confidence_score < 70:
    print("Low confidence - consider regenerating query")
```

## Evaluation Criteria

The confidence scoring evaluates queries across five dimensions:

1. **Semantic Alignment (0-30 points)**: Does the SQL address what the user asked for?
2. **Technical Accuracy (0-25 points)**: Is the SQL syntactically correct and follows best practices?
3. **Data Relevance (0-20 points)**: Are the correct columns and tables being used?
4. **Logical Completeness (0-15 points)**: Does the query include all necessary operations?
5. **Edge Case Handling (0-10 points)**: Does the query handle potential data issues?

## Confidence Score Ranges

- **90-100**: Excellent match, highly confident
- **80-89**: Very good match, confident
- **70-79**: Good match, reasonably confident
- **60-69**: Acceptable match, somewhat confident
- **50-59**: Partial match, low confidence
- **40-49**: Poor match, very low confidence
- **30-39**: Significant mismatch, not confident
- **20-29**: Major issues, very not confident
- **10-19**: Critical problems, extremely not confident
- **0-9**: Complete failure, no confidence

## Models

### ConfidenceInput
```python
class ConfidenceInput(BaseModel):
    user_prompt: str = Field(description="The user's original question")
    generated_sql: str = Field(description="The SQL query that was generated")
    dataset_schema: Dict[str, str] = Field(description="The dataset schema with column names and types")
```

### ConfidenceOutput
```python
class ConfidenceOutput(BaseModel):
    confidence_score: int = Field(description="Confidence score from 0 to 100")
    reasoning: str = Field(description="Explanation of the confidence score")
    potential_issues: List[str] = Field(description="List of potential issues or concerns")
```

### Updated AnalysisOutput
```python
class AnalysisOutput(BaseModel):
    answer: str = Field(description="Answer to the user's question")
    chart_id: Optional[str] = Field(default=None, description="ID of the chart if one was created")
    insights_title: Optional[str] = Field(default=None, description="Title of the insights if generated")
    insights_analysis: Optional[str] = Field(default=None, description="Business insights analysis if generated")
    confidence_score: Optional[int] = Field(default=None, description="Confidence score from 0 to 100 if SQL was generated")
    confidence_reasoning: Optional[str] = Field(default=None, description="Explanation of the confidence score if calculated")
    follow_up_questions: Optional[List[str]] = Field(default=None, description="Follow-up questions to improve confidence if score is low")
```

## Follow-up Questions

When confidence is low (< 50), the coordinator agent automatically generates follow-up questions focused on:

1. **Time periods**: "What time period are you interested in?"
2. **Specific columns**: "Which specific columns would you like to see?"
3. **Business logic**: "How should we calculate totals?"
4. **Aggregation level**: "Do you want daily, weekly, monthly, or yearly data?"
5. **Filters**: "Are there any specific conditions we should apply?"

The system generates 2-5 specific, actionable questions to help clarify the user's request and improve SQL query confidence.

## Error Handling

The confidence scoring tool includes robust error handling:

- Returns a default low confidence score (30) if calculation fails
- Logs errors for debugging
- Provides fallback reasoning when errors occur
- Generates default follow-up questions if question generation fails

## Example Output

### High Confidence Scenario
```json
{
    "answer": "I've created a chart showing your monthly sales data for the last 12 months.",
    "chart_id": "chart_12345",
    "confidence_score": 85,
    "confidence_reasoning": "The SQL query correctly addresses the user's request for monthly sales totals...",
    "follow_up_questions": null
}
```

### Low Confidence Scenario
```json
{
    "answer": "I don't have enough information to produce the requested query. Your request is quite vague and I need more details to generate an accurate SQL query.",
    "chart_id": null,
    "confidence_score": 35,
    "confidence_reasoning": "The user's request 'show me some data' is too vague to generate a meaningful SQL query...",
    "follow_up_questions": [
        "What time period are you interested in analyzing?",
        "Which specific columns from the dataset would you like to include?",
        "Are there any specific conditions or filters you'd like to apply?",
        "How would you like the data to be aggregated or grouped?",
        "Are there any business rules or calculations I should be aware of?"
    ]
}
```

## Integration with Existing Workflow

The confidence scoring tool is designed to work seamlessly with the existing SQL agent workflow. It can be called:

1. **After SQL generation** to validate the output
2. **Before visualization** to ensure high-quality data
3. **As part of quality assurance** in automated workflows
4. **For user feedback** to explain confidence levels

## Performance Considerations

- The confidence scoring uses the same LLM model as the SQL agent
- Evaluation is asynchronous and non-blocking
- Results are cached and logged for analysis
- The tool is designed to be lightweight and fast
- Follow-up question generation is optimized for relevance and specificity

## Future Enhancements

Potential improvements to the confidence scoring system:

1. **Historical Learning**: Use past confidence scores to improve future evaluations
2. **User Feedback Integration**: Incorporate user corrections to refine scoring
3. **Domain-Specific Scoring**: Customize evaluation criteria for different data types
4. **Automated Query Regeneration**: Automatically regenerate queries with low confidence scores
5. **Confidence Threshold Tuning**: Allow users to adjust confidence thresholds based on their needs

CONFIDENCE SCORING HANDLING:
- The SQL agent will always return a confidence score (0-100) indicating how well the generated query matches the user's request
- If the confidence score is below 50, DO NOT proceed with visualization
- Instead, inform the user that you don't have enough information to produce the requested query
- Use the generate_follow_up_questions tool to ask 2-5 specific follow-up questions that could help improve the confidence score
- Focus on clarifying ambiguous terms, specifying time periods, identifying specific columns, or defining business logic 