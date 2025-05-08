from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional
from typing import Union

import os
import asyncio
import pandas as pd
import numpy as np
from pprint import pprint

from pydantic_ai import Agent, ModelRetry, RunContext

from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")



# class LineChartSpec(BaseModel):
#     chart_type: Literal["line"]
#     title: str = Field(description="The title of the chart")
#     x_field: str = Field(description="The field to use for the x-axis")
#     y_field: str = Field(description="The field to use for the y-axis")
#     time_granularity: Optional[Literal["day", "week", "month"]] = None

# class ScatterChartSpec(BaseModel):
#     chart_type: Literal["scatter"]
#     title: str
#     x_field: str
#     y_field: str
#     color_field: Optional[str] = None

# class PieChartSpec(BaseModel):
#     chart_type: Literal["pie"]
#     title: str
#     category_field: str
#     value_field: str

# ChartSpecUnion = Union[BarChartSpec, LineChartSpec, ScatterChartSpec, PieChartSpec]

# class ChartToolInput(BaseModel):
#     user_prompt: str
#     available_columns: list[str]
#     chart_spec: ChartSpecUnion


# Define the dependencies class
# Add the dependencies
class Deps(BaseModel):
    """Dependencies required by all agents in the system."""
    available_columns: list[str]
    data_cur: pd.DataFrame
    model_config = {"arbitrary_types_allowed": True}



# =============================================== Bar Chart definitions ===============================================

# Define the input schema
class xAxisConfigClass(BaseModel):
    dataKey: str = Field(description="The field to use for the x-axis. Should be one of the available columns.")

class yAxisConfigClass(BaseModel):
    tickLine: bool = Field(default=False, description="Whether to show the tick lines")
    axisLine: bool = Field(default=False, description="Whether to show the axis line")

class barConfigClass(BaseModel):
    radius: int = Field(default=4, description="The radius of the bars")
    fillOpacity: float = Field(default=0.8, description="The opacity of the bars")
    accessibilityLayer: bool = Field(default=True, description="Whether to show the accessibility layer")

class colorPaletteClass(BaseModel):
    colors: list[str] = Field(default=["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1"], description="The color palette to use for the chart")

class BarChartInput(BaseModel):
    """
    What will be given as an input to the tool (by the agent).
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the bars")
    xColumn: str = Field(description="The column to use for the x-axis. Should be one of the input dataframe's available columns.")
    
    barConfig: barConfigClass = Field(description="The configuration for the bars")
    yAxisConfig: yAxisConfigClass = Field(description="The configuration for the y-axis")
    

# Define the output schema
class BarChartOutput(BaseModel):
    """
    What is finally expected as an output from the tool.
    """
    chartType: Literal["bar"]
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    data: list[dict] = Field(description="The data to display in the chart")
    xAxisConfig: xAxisConfigClass = Field(description="The configuration for the x-axis")
    chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")
    barConfig: barConfigClass = Field(description="The configuration for the bars")
    yAxisConfig: yAxisConfigClass = Field(description="The configuration for the y-axis")


def convert_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype)):
        return value.isoformat()
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    if isinstance(value, (np.bool_)):
        return bool(value)
    return value

# Define the tool / calculations
# @viz_agent.tool
async def visualize_bar(ctx: RunContext[Deps], input: BarChartInput) -> BarChartOutput:
    """
    Enhance the charts specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize bar tool!")
    chartType = "bar"
    colors = colorPaletteClass().colors

    data_cur = ctx.deps.data_cur
    data_cols = input.dataColumns
    x_key = input.xColumn
    # Calculate the data field
    chart_data_array = []
    for i in range(min(len(data_cur), 100)):  # Limit to 100 data points
        item = {}
        try:
            item[x_key] = data_cur.iloc[i][x_key]
            for col in data_cols:
                if col in data_cur.columns:
                    item[col] = convert_value(data_cur.iloc[i][col])
            chart_data_array.append(item)
        except:
            continue

    # Calculate the chartConfig field
    chartConfig = {}
    for i, col in enumerate(data_cols):
        if col in data_cur.columns:
            chartConfig[col] = {
                "color": colors[i % len(colors)],
                "label": col.replace("_", " ").lower()
            }

    return BarChartOutput(
        chartType=chartType,
        title=input.title,
        description=input.description,
        data=chart_data_array,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chartConfig,
        barConfig=input.barConfig,
        yAxisConfig=input.yAxisConfig,
        
    )


"""
=============================================== Agent run ===============================================
"""

# Declare the agent
viz_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    output_type=BarChartOutput,
    tools=[visualize_bar],
    allow_tool_output=True
    # output_validator=validate_visual
)

@viz_agent.output_validator
async def validate_visual(
    ctx: RunContext[Deps],
    output: BarChartOutput
) -> BarChartOutput:
    """Validate business insights output."""

    # Ensure the title is not empty
    if not output.data:
        raise ValueError("No data to display in the chart")
    if not output.chartConfig:
        raise ValueError("No chart config to display in the chart")

# Declare the systems prompt
@viz_agent.system_prompt
async def system_prompt(ctx: RunContext[Deps]) -> str:
    prompt = f"""
    Your task is to:
    1. Run one of the following tools with appropriate parameters
        - visualize_bar for bar chart
    2. Return the EXACT output from the tool call without any modifications
    
    The output should be in this format:
    {{
        "chartType": "bar",
        "title": "<title>",
        "description": "<description>",
        "data": [...],
        "xAxisConfig": {{"dataKey": "<x_column>"}},
        "chartConfig": {{...}},
        "barConfig": {{...}},
        "yAxisConfig": {{...}}
    }}

    DO NOT modify the tool output in any way. Return it exactly as received from the tool.
    """
    return prompt

# Declare an agent's tool



user_prompt = "Show me the trend of sales over time."
available_columns = ["date", "sales", "region"]
data_cur = pd.DataFrame({
    "date": ["2020-01-01", "2020-01-02", "2020-01-03"],
    "sales": [100, 200, 300],
    "region": ["North", "South", "East"]
})
viz_deps = Deps(
    # user_prompt=user_prompt,
    available_columns=available_columns,
    data_cur=data_cur
)

# Declare an agent's output validator

async def main():
    # Run the agent
    async with viz_agent.run_stream(user_prompt=user_prompt, deps=viz_deps) as response:
        tool_return_part = response.all_messages()[-1].parts[0]
        tool_used = tool_return_part.tool_name
        tool_output = tool_return_part.content
        print(tool_used)
        print(tool_output)

"""
1. Check what happens if I ask for specific specs.
2. Add extra visuals.
3. Try to fix the issue with the output!

"""

if __name__ == "__main__":
    asyncio.run(main())