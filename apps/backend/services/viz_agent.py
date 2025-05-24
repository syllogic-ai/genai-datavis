from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import re
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry
import pandas as pd

from apps.backend.utils.chat import append_chat_message, convert_chart_data_to_chart_config, get_last_chart_id_from_chat_id, remove_null_pairs, update_chart_specs
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.utils import get_data
from apps.backend.core.models import Deps

# =============================================== Chart Configuration Classes ===============================================

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
    # data: list[dict] = Field(description="The data to display in the chart")
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
    # data: list[dict] = Field(description="The data to display in the chart")
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
    # kpiValue: Union[str, int, float] = Field(description="The main value to display in the KPI")
    kpiSuffix: Optional[str] = Field(default=None, description="Text to append after the value (e.g., %, $, etc.)")
    kpiPrefix: Optional[str] = Field(default=None, description="Text to prepend before the value (e.g., $, €, etc.)")
    kpiLabel: Optional[str] = Field(default=None, description="Main label text displayed below the value")
    kpiSubLabel: Optional[str] = Field(default=None, description="Secondary label text displayed below the main label")
    # kpiChange: Optional[float] = Field(default=None, description="Numeric value representing the change (e.g., 5.2 for 5.2% increase)")
    # kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('up', 'down', or 'flat')")
    kpiChangeFormat: Optional[str] = Field(default=None, description="Format string for the change value (e.g., '+0.0%')")
    kpiValueFormat: Optional[str] = Field(default=None, description="Format string for the main value")
    kpiStyles: Optional[kpiStylesClass] = Field(default=None, description="Styling options for the KPI component")
    dataColumn: str = Field(description="The column to use for the KPI value")
    changeColumn: Optional[str] = Field(default=None, description="The column to use for the change value")

# Declare the agent
viz_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps,
    allow_tool_output=True
)

# Declare the systems prompt
@viz_agent.system_prompt
async def system_prompt(ctx: RunContext[Deps]) -> str:
    
    data_cur = get_data(ctx.deps.file_id, ctx.deps.last_chart_id, ctx.deps.supabase, ctx.deps.duck)
    data_cols = data_cur.columns.tolist()
    
    logfire.info("Data columns", data_cols=data_cols)
    
    prompt = f"""
    You are a data visualization expert. You are given a user prompt and a dataset.
    The dataset has the following columns: {data_cols}

    CRITICAL INSTRUCTIONS:
    1. You MUST ALWAYS execute EXACTLY ONE of these tools:
       - visualize_bar for bar charts
       - visualize_area for area charts
       - visualize_line for line charts
       - visualize_kpi for KPIs
    
    2. You CANNOT respond with free-form text or explanations
    3. You CANNOT skip tool execution
    4. You CANNOT use any other tools for visualization
    5. If the user's request is unclear, default to a bar chart using visualize_bar
    6. During the agent execution, make sure that you keep all the previous parameters that the user has set in previous executions.
    
    TOOL SELECTION RULES:
    - For comparing values across categories: Use visualize_bar
    - For showing trends over time: Use visualize_line
    - For showing cumulative values: Use visualize_area
    - For showing a single important metric: Use visualize_kpi
    
    COLOR UPDATE RULES:
    - If the user requests a color change, first execute the visualization tool
    - Then use update_color tool with the appropriate parameters. 
    - Only use the update_color tool if the user has explicitly requested a color change.
    
    The final output MUST be the direct result of a tool execution in this format:
    {{
        "chartType": "bar|area|line|kpi",
        "title": "<title>",
        "description": "<description>",
        "xAxisConfig": <MANDATORY FIELD>,
        "chartConfig": <MANDATORY FIELD>,
        "yAxisConfig": <MANDATORY FIELD>
    }}

    DO NOT:
    - Write explanations or justifications
    - Skip tool execution
    - Return free-form text
    - Modify the tool output
    
    DO:
    - Execute exactly one visualization tool
    - Return the exact tool output
    - Use update_color if color changes are requested
    """
    return prompt

@viz_agent.tool
async def update_color(ctx: RunContext[Deps], chart_specs: dict, update_col: str, update_color: str):
    """
    Update the color of a specific field, based on specific user requests.  
    Args:
        chart_specs (dict): A dictionary with the current chart specs. The chart specs should be the direct output from one of the visualize tools
        update_col (str): The column name that should get its color updated.
        update_color (str): The color to update the update_col, should be in hexcode format, f.i. "#3b82f6", "#ef4444"
    """
    logfire.info(f"Prompted to update column {update_col} color to {update_color}!")


    # Check if the update column is in the chart spec columns
    if not update_col in chart_specs["chartConfig"].keys():
        logfire.warn(f"Error during updating Column {update_col} color. Column not in chart columns")
        return chart_specs
    # Check if the color is hex
    hex_pattern = r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    if not bool(re.match(hex_pattern, update_color)):
        logfire.warn(f"{update_color} is not a valid HEX color code!")
        return chart_specs

    # Update the color
    chart_specs["chartConfig"][update_col]["color"] = update_color

    await update_chart_specs(ctx.deps.last_chart_id, chart_specs)

    return chart_specs

@viz_agent.tool
async def visualize_bar(ctx: RunContext[Deps], input: BarChartInput) -> BarChartOutput:
    """
    Enhance the charts specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize bar tool!")
    chartType = "bar"
    colors = colorPaletteClass().colors

    data_cols = input.dataColumns
    x_key = input.xColumn
    logfire.info(f"Data columns: {data_cols}, X key: {x_key}")
    chart_config = convert_chart_data_to_chart_config(data_cols, colors)
    logfire.info(f"Chart config: {chart_config}")

    response = BarChartOutput(
        chartType=chartType,    
        title=input.title,
        description=input.description,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chart_config,
        barConfig=input.barConfig,
        yAxisConfig=input.yAxisConfig, 
    )

    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

@viz_agent.tool
async def visualize_area(ctx: RunContext[Deps], input: AreaChartInput) -> AreaChartOutput:
    """
    Enhance the area chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize area tool!")
    chartType = "area"
    colors = colorPaletteClass().colors

    data_cols = input.dataColumns
    x_key = input.xColumn
    chart_config = convert_chart_data_to_chart_config(data_cols, colors)

    response = AreaChartOutput(
        chartType=chartType,    
        title=input.title,
        description=input.description,
        xAxisConfig=xAxisConfigClass(dataKey=input.xColumn),
        chartConfig=chart_config,
        lineType=input.lineType,
        strokeWidth=input.strokeWidth,
        dot=input.dot,
        areaConfig=input.areaConfig,
        stacked=input.stacked,
        yAxisConfig=input.yAxisConfig,  
    )

    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

@viz_agent.tool
async def visualize_line(ctx: RunContext[Deps], input: LineChartInput) -> LineChartOutput:
    """
    Enhance the line chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize line tool!")
    chartType = "line"
    colors = colorPaletteClass().colors

    data_cols = input.dataColumns
    x_key = input.xColumn
    chart_config = convert_chart_data_to_chart_config(data_cols, colors)

    response = LineChartOutput(
        chartType=chartType,
        title=input.title,
        description=input.description,
        xAxisConfig=input.xAxisConfig,
        yAxisConfig=input.yAxisConfig,
        lineType=input.lineType,
        strokeWidth=input.strokeWidth,
        dot=input.dot,
        chartConfig=chart_config
    )

    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response

@viz_agent.tool
async def visualize_kpi(ctx: RunContext[Deps], input: KPIInput) -> KPIOutput:
    """
    Enhance the KPI specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize KPI tool!")
    chartType = "kpi"   

    response = KPIOutput(
        chartType=chartType,
        kpiSuffix=input.kpiSuffix,
        kpiPrefix=input.kpiPrefix,
        kpiLabel=input.kpiLabel,
        kpiSubLabel=input.kpiSubLabel,
        kpiChangeFormat=input.kpiChangeFormat,
        kpiValueFormat=input.kpiValueFormat,
        kpiStyles=input.kpiStyles,
        title=input.title,
        description=input.description,
        dataColumn=input.dataColumn,
        changeColumn=input.changeColumn
    )

    try:
        chart_id = ctx.deps.last_chart_id
        await update_chart_specs(chart_id, response.model_dump())
        await append_chat_message(ctx.deps.chat_id, response.model_dump())
    except:
        print(f"No chat ID in context! Supabase entry not updated.")

    return response 