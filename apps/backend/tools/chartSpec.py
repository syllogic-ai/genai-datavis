from pydantic import BaseModel
from typing import Literal, Optional
from typing import Union

from pydantic_ai import Agent, ModelRetry, RunContext


OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

class BarChartSpec(BaseModel):
    chart_type: Literal["bar"]
    title: str
    x_field: str
    y_field: str
    aggregation: Literal["sum", "mean", "count"]

class LineChartSpec(BaseModel):
    chart_type: Literal["line"]
    title: str
    x_field: str
    y_field: str
    time_granularity: Optional[Literal["day", "week", "month"]] = None

class ScatterChartSpec(BaseModel):
    chart_type: Literal["scatter"]
    title: str
    x_field: str
    y_field: str
    color_field: Optional[str] = None

class PieChartSpec(BaseModel):
    chart_type: Literal["pie"]
    title: str
    category_field: str
    value_field: str

ChartSpecUnion = Union[BarChartSpec, LineChartSpec, ScatterChartSpec, PieChartSpec]

class ChartToolInput(BaseModel):
    user_prompt: str
    available_columns: list[str]
    chart_spec: ChartSpecUnion


prompt = """
The user asked: {user_prompt}
The dataset has the following columns: {available_columns}

Your task is to:
1. Choose the most appropriate chart type from: ["bar", "line", "scatter", "pie"]
2. Based on the selected chart type, fill in the chart_spec object with the correct fields.
Respond using the ChartToolInput schema.
"""

# Example inputs
inputs = {
    "user_prompt": "Show me the trend of sales over time.",
    "available_columns": ["date", "sales", "region"]
}