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

import logfire
logfire.configure()
Agent.instrument_all()


# Define the dependencies class
class Deps(BaseModel):
    """Dependencies required by all agents in the system."""
    available_columns: list[str]
    data_cur: pd.DataFrame
    model_config = {"arbitrary_types_allowed": True}

# Define the x axis config class
class xAxisConfigClass(BaseModel):
    dataKey: str = Field(description="The field to use for the x-axis. Should be one of the available columns.")
    dateFormat: Optional[str] = Field(default=None, description="Format string for date values on the x-axis (uses moment.js)")
    tickLine: bool = Field(default=False, description="Whether to show the x-axis tick lines")
    axisLine: bool = Field(default=False, description="Whether to show the x-axis line")
    tickMargin: int = Field(default=10, description="Margin for the x-axis tick labels")
    hide: bool = Field(default=False, description="Whether to hide the x-axis")

# Define the y axis config class
class yAxisConfigClass(BaseModel):
    tickLine: bool = Field(default=False, description="Whether to show the tick lines for y axis")
    axisLine: bool = Field(default=False, description="Whether to show the y axis line")
    tickMargin: int = Field(default=8, description="Margin for the y-axis tick labels")
    tickCount: int = Field(default=5, description="Number of ticks to display")
    hide: bool = Field(default=False, description="Whether to hide the y-axis")

class colorPaletteClass(BaseModel):
    colors: list[str] = Field(default=["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1"], description="The color palette to use for the chart")

# =============================================== Bar Chart definitions ===============================================
class barConfigClass(BaseModel):
    isHorizontal: Optional[bool] = Field(default=False, description="Whether to display bars horizontally instead of vertically")
    truncateLabels: Optional[bool] = Field(default=None, description="Whether to truncate long labels on the axis")
    maxLabelLength: Optional[int] = Field(default=3, description="Maximum length of labels before truncation (used with truncateLabels)")
    radius: int = Field(default=4, description="The radius of the bars")
    fillOpacity: float = Field(default=0.8, description="The opacity of the bars")
    barGap: Optional[int] = Field(default=None, description="Gap between bars in the same group")
    barSize: Optional[int] = Field(default=None, description="Size of the bars")
    barCategoryGap: Optional[int] = Field(default=None, description="Gap between bar groups")

class BarChartInput(BaseModel):
    """
    What will be given as an input to the tool (by the agent).
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the bars")
    xAxisConfig: xAxisConfigClass = Field(description="The configuration for the x-axis")
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

# =============================================== Area Chart definitions ===============================================
class gradientStopsClass(BaseModel):
    topOffset: str = Field(default="5%", description="Offset for the top gradient stop")
    bottomOffset: str = Field(default="95%", description="Offset for the bottom gradient stop")
    topOpacity: float = Field(default=0.8, description="Opacity for the top gradient stop")
    bottomOpacity: float = Field(default=0.1, description="Opacity for the bottom gradient stop")

class areaConfigClass(BaseModel):
    useGradient: bool = Field(default=None, description="Whether to use gradient fills instead of solid colors")
    fillOpacity: float = Field(default=0.4, description="Opacity of the area fill")
    gradientStops: Optional[gradientStopsClass] = Field(default=None, description="Configuration for gradient stops")

class AreaChartInput(BaseModel):
    """
    Input specification for area charts
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the y axis")
    xColumn: str = Field(description="The column to use for the x-axis. Should be one of the input dataframe's available columns.")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    areaConfig: Optional[areaConfigClass] = Field(default=None, description="Configuration specific to area charts")
    stacked: bool = Field(default=False, description="Whether to stack the areas on top of each other")

class AreaChartOutput(BaseModel):
    """
    Output specification for area charts
    """
    chartType: Literal["area", "line"]
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    data: list[dict] = Field(description="The data to display in the chart")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    areaConfig: Optional[areaConfigClass] = Field(default=None, description="Configuration specific to area charts")
    stacked: bool = Field(default=False, description="Whether to stack the areas on top of each other")
    chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")

# =============================================== Line Chart definitions ===============================================
class LineChartInput(BaseModel):
    """
    Input specification for line charts
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumns: list[str] = Field(description="The columns to use for the y axis")
    xColumn: str = Field(description="The column to use for the x-axis. Should be one of the input dataframe's available columns.")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    
class LineChartOutput(BaseModel):
    """
    Output specification for line charts
    """
    chartType: Literal["line"] = Field(default="line", description="Type of chart")
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    data: list[dict] = Field(description="The data to display in the chart")
    xAxisConfig: xAxisConfigClass = Field(description="Configuration for the X-axis")
    yAxisConfig: yAxisConfigClass = Field(description="Configuration for the Y-axis")
    lineType: str = Field(default="monotone", description="Type of line interpolation (monotone, step, bump, linear, natural)")
    strokeWidth: int = Field(default=2, description="Width of the line stroke")
    dot: bool = Field(default=False, description="Whether to show dots on the line")
    chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")

# =============================================== KPI definitions ===============================================
class fontSizeClass(BaseModel):
    value: Optional[Union[str, int]] = Field(default=None, description="Font size for the main value")
    label: Optional[Union[str, int]] = Field(default=None, description="Font size for the main label")
    change: Optional[Union[str, int]] = Field(default=None, description="Font size for the change indicator")

class kpiStylesClass(BaseModel):
    valueColor: Optional[str] = Field(default=None, description="Color for the main value text")
    labelColor: Optional[str] = Field(default=None, description="Color for the main label text")
    subLabelColor: Optional[str] = Field(default=None, description="Color for the sub-label text")
    changePositiveColor: Optional[str] = Field(default=None, description="Color for positive change indicators")
    changeNegativeColor: Optional[str] = Field(default=None, description="Color for negative change indicators")
    changeFlatColor: Optional[str] = Field(default=None, description="Color for flat/neutral change indicators")
    backgroundColor: Optional[str] = Field(default=None, description="Background color of the KPI container")
    padding: Optional[Union[str, int]] = Field(default=None, description="Padding of the KPI container")
    borderRadius: Optional[Union[str, int]] = Field(default=None, description="Border radius of the KPI container")
    fontSize: Optional[fontSizeClass] = Field(default=None, description="Font size configuration for different text elements")

class KPIInput(BaseModel):
    """
    Input specification for KPI components
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(default="", description="a 5 word description of the chart")
    # kpiValue: Optional[Union[str, int, float]] = Field(default=None, description="The main value to display in the KPI")
    dataColumn: str = Field(description="The column to use for the KPI value")
    kpiSuffix: Optional[str] = Field(default=None, description="Text to append after the value (e.g., %, $, etc.)")
    kpiPrefix: Optional[str] = Field(default=None, description="Text to prepend before the value (e.g., $, €, etc.)")
    kpiLabel: Optional[str] = Field(default=None, description="Main label text displayed below the value")
    kpiSubLabel: Optional[str] = Field(default=None, description="Secondary label text displayed below the main label")
    changeColumn: Optional[str] = Field(default=None, description="The column to use for the change value")
    # kpiChange: Optional[float] = Field(default=None, description="Numeric value representing the change (e.g., 5.2 for 5.2% increase)")
    # kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('up', 'down', or 'flat')")
    kpiChangeFormat: Optional[str] = Field(default=None, description="Format string for the change value (e.g., '+0.0%')")
    kpiValueFormat: Optional[str] = Field(default=None, description="Format string for the main value")
    kpiStyles: Optional[kpiStylesClass] = Field(default=None, description="Styling options for the KPI component")

class KPIOutput(BaseModel):
    """
    Output specification for KPI components
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(default="", description="a 5 word description of the chart")
    chartType: Literal["kpi"] = Field(default="kpi", description="Type of chart")
    kpiValue: Union[str, int, float] = Field(description="The main value to display in the KPI")
    kpiSuffix: Optional[str] = Field(default=None, description="Text to append after the value (e.g., %, $, etc.)")
    kpiPrefix: Optional[str] = Field(default=None, description="Text to prepend before the value (e.g., $, €, etc.)")
    kpiLabel: Optional[str] = Field(default=None, description="Main label text displayed below the value")
    kpiSubLabel: Optional[str] = Field(default=None, description="Secondary label text displayed below the main label")
    kpiChange: Optional[float] = Field(default=None, description="Numeric value representing the change (e.g., 5.2 for 5.2% increase)")
    kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('up', 'down', or 'flat')")
    kpiChangeFormat: Optional[str] = Field(default=None, description="Format string for the change value (e.g., '+0.0%')")
    kpiValueFormat: Optional[str] = Field(default=None, description="Format string for the main value")
    kpiStyles: Optional[kpiStylesClass] = Field(default=None, description="Styling options for the KPI component")

# =============================================== Helper functions ===============================================
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



def convert_chart_data_to_chart_config(data_cur: pd.DataFrame, data_cols: list[str], colors: list[str]) -> dict:
    chart_config = {}
    for i, col in enumerate(data_cols):
        chart_config[col] = {
            "color": colors[i % len(colors)],
            "label": col.replace("_", " ").lower()
        }
    return chart_config

def remove_null_pairs(d):
    """
    Recursively removes key-value pairs from a dictionary where the value is None.
    Args:
        d (dict): The dictionary to process
    Returns:
        dict: A new dictionary with None values removed
    """
    if not isinstance(d, dict):
        return d
        
    result = {}
    for key, value in d.items():
        if value is None:
            # Skip None values
            continue
            
        if isinstance(value, dict):
            # Recursively process nested dictionaries
            nested_result = remove_null_pairs(value)
            if nested_result:  # Only add if the nested dict is not empty
                result[key] = nested_result
        elif isinstance(value, list):
            # Process lists that might contain dictionaries
            processed_list = [remove_null_pairs(item) if isinstance(item, dict) else item for item in value]
            # Filter out None values from the list
            processed_list = [item for item in processed_list if item is not None]
            if processed_list:  # Only add if the list is not empty
                result[key] = processed_list
        else:
            # For non-dict, non-list values, keep them as is
            result[key] = value
            
    return result

# =============================================== Tools definitions ===============================================
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
    # chart_data_array = convert_data_to_chart_data(data_cur, data_cols, x_key)
    chart_config = convert_chart_data_to_chart_config(data_cur, data_cols, colors)

    response = BarChartOutput(
        chartType=chartType,    
        title=input.title,
        description=input.description,
        # data=chart_data_array,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chart_config,
        barConfig=input.barConfig,
        yAxisConfig=input.yAxisConfig, 
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chat_id = ctx.deps.chat_id
        await update_chart_specs(chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

# @viz_agent.tool
async def visualize_area(ctx: RunContext[Deps], input: AreaChartInput) -> AreaChartOutput:
    """
    Enhance the area chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize area tool!")
    chartType = "area"
    colors = colorPaletteClass().colors

    data_cur = ctx.deps.data_cur
    data_cols = input.dataColumns
    x_key = input.xColumn
    # Calculate the data field
    # chart_data_array = convert_data_to_chart_data(data_cur, data_cols, x_key)
    chart_config = convert_chart_data_to_chart_config(data_cur, data_cols, colors)

    response = AreaChartOutput(
        chartType=chartType,    
        title=input.title,
        description=input.description,
        # data=chart_data_array,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chart_config,
        lineType=input.lineType,
        strokeWidth=input.strokeWidth,
        dot=input.dot,
        areaConfig=input.areaConfig,
        stacked=input.stacked,
        yAxisConfig=input.yAxisConfig,  
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chat_id = ctx.deps.chat_id
        await update_chart_specs(chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

async def visualize_line(ctx: RunContext[Deps], input: LineChartInput) -> LineChartOutput:
    """
    Enhance the line chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize line tool!")
    chartType = "line"
    colors = colorPaletteClass().colors 

    data_cur = ctx.deps.data_cur
    data_cols = input.dataColumns
    x_key = input.xColumn
    # Calculate the data field
    # chart_data_array = convert_data_to_chart_data(data_cur, data_cols, x_key)
    chart_config = convert_chart_data_to_chart_config(data_cur, data_cols, colors)  

    response = LineChartOutput(
        chartType=chartType,
        title=input.title,
        description=input.description,
        # data=chart_data_array,
        xAxisConfig=input.xAxisConfig,
        yAxisConfig=input.yAxisConfig,
        lineType=input.lineType,
        strokeWidth=input.strokeWidth,
        dot=input.dot,
        chartConfig=chart_config
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chat_id = ctx.deps.chat_id
        await update_chart_specs(chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

async def visualize_kpi(ctx: RunContext[Deps], input: KPIInput) -> KPIOutput:
    """
    Enhance the KPI specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize KPI tool!")
    chartType = "kpi"   

    data_cur = ctx.deps.data_cur
    data_col = input.dataColumn
    change_col = input.changeColumn

    print("change_col: ", change_col)
    if change_col:
        change_value = data_cur.iloc[0][change_col]
        change_direction = "up" if data_cur.iloc[0][change_col] > 0 else "down" if data_cur.iloc[0][change_col] < 0 else "flat"
    else:
        change_direction = None
        change_value = None

    response = KPIOutput(
        chartType=chartType,
        kpiValue=data_cur.iloc[0][data_col],
        kpiSuffix=input.kpiSuffix,
        kpiPrefix=input.kpiPrefix,
        kpiLabel=input.kpiLabel,
        kpiSubLabel=input.kpiSubLabel,
        kpiChange=change_value,
        kpiChangeDirection=change_direction,
        kpiChangeFormat=input.kpiChangeFormat,
        kpiValueFormat=input.kpiValueFormat,
        kpiStyles=input.kpiStyles,
        title=input.title,
        description=input.description
    )

    # Update the chart_specs entry in the given chat_id
    try:
        chat_id = ctx.deps.chat_id
        await update_chart_specs(chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

# =============================================== Agent run ===============================================
# Declare the agent
viz_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    # output_type=Union[BarChartOutput, AreaChartOutput, LineChartOutput, KPIOutput],
    tools=[visualize_bar, visualize_area, visualize_line, visualize_kpi],
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
    You are a data visualization expert. You are given a user prompt and a dataset.
    The dataset has the following columns: {ctx.deps.available_columns}

    Your task is to:
    1. Run one of the following tools with appropriate parameters
        - visualize_bar for bar chart
        - visualize_area for area chart
        - visualize_line for line chart
        - visualize_kpi for KPI
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


async def main(user_prompt, data_cur):

    available_columns = data_cur.columns.tolist()

    viz_deps = Deps(
        available_columns=available_columns,
        data_cur=data_cur
    )

    # Run the agent
    async with viz_agent.run_stream(user_prompt=user_prompt, deps=viz_deps) as response:
        tool_return_part = response.all_messages()[-1].parts[0]
        tool_used = tool_return_part.tool_name
        tool_output = tool_return_part.content

        response = remove_null_pairs(tool_output.model_dump())
        # pprint( response.all_messages())

        print("tool_used: ", tool_used)
        print("tool Output: ", response)

        return response


if __name__ == "__main__":
    user_prompt = "Show me the KPI of the total sales."
    
    data_cur = pd.DataFrame({
        "date": ["2020-01-01", "2020-01-02", "2020-01-03"],
        "sales": [100, 200, 300],
        "region": ["North", "South", "East"]
    })
    

    response = asyncio.run(main(user_prompt, data_cur))
