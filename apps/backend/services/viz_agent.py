from typing import Any, Dict, List, Optional, Union, Literal
import json
import time
import re
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent, ModelRetry
import pandas as pd

from apps.backend.utils.chat import append_chat_message, convert_chart_data_to_chart_config, remove_null_pairs, update_widget_specs
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.utils import get_data
from apps.backend.core.models import Deps
import requests
import io

# =============================================== Helper Functions ===============================================

async def fetch_user_default_color_palette(user_id: str, supabase: Any) -> Optional[Dict[str, str]]:
    """
    Fetch the user's default color palette from the database.
    Returns a dict with chart1, chart2, etc. as keys and HSL values.
    """
    try:
        # Query for the user's default color palette
        result = supabase.table("color_palettes").select("*").eq("user_id", user_id).eq("is_default", True).execute()
        
        if result.data and len(result.data) > 0:
            palette = result.data[0]
            # Get the chart_colors JSON field
            chart_colors_json = palette.get("chart_colors", {})
            
            # Convert the palette format from chart-1, chart-2 to chart1, chart2
            chart_colors = {}
            for i in range(1, 11):  # Support up to 10 colors
                key_from = f"chart-{i}"   # Database key name (with hyphen)
                key_to = f"chart{i}"      # Expected format (without hyphen)
                if key_from in chart_colors_json and chart_colors_json[key_from]:
                    chart_colors[key_to] = chart_colors_json[key_from]
            
            logfire.info(f"Fetched default color palette for user {user_id}", 
                        colors_count=len(chart_colors),
                        palette_name=palette.get("name"),
                        chart_colors=chart_colors)
            return chart_colors if chart_colors else None
        else:
            logfire.info(f"No default color palette found for user {user_id}")
            return None
    except Exception as e:
        logfire.error(f"Error fetching user color palette: {e}", user_id=user_id)
        return None

async def get_color_palette(ctx: RunContext[Deps]) -> Dict[str, str]:
    """
    Get the color palette to use for visualization.
    Now returns theme references that will be resolved on the frontend.
    """
    # Always return theme references
    # The actual colors will be resolved on the frontend based on the dashboard theme
    theme_palette = {
        "chart1": "var(--chart-1)",
        "chart2": "var(--chart-2)",
        "chart3": "var(--chart-3)",
        "chart4": "var(--chart-4)",
        "chart5": "var(--chart-5)"
    }
    
    logfire.info("Returning theme color references", palette=theme_palette)
    return theme_palette

async def execute_sql_and_get_data(ctx: RunContext[Deps]) -> list:
    """
    Execute SQL query from widget and return chart data
    """
    try:
        # Get widget SQL
        logfire.info(f"Executing SQL for widget: {ctx.deps.widget_id}")
        widget_result = ctx.deps.supabase.table("widgets").select("sql").eq("id", ctx.deps.widget_id).execute()
        if not widget_result.data or not widget_result.data[0].get("sql"):
            logfire.warn("No SQL found for widget", widget_id=ctx.deps.widget_id)
            return []
        
        sql_query = widget_result.data[0]["sql"]
        
        # Get file and load data into DuckDB
        file_result = ctx.deps.supabase.table("files").select("storage_path").eq("id", ctx.deps.file_id).execute()
        if not file_result.data:
            logfire.warn("No file found", file_id=ctx.deps.file_id)
            return []
        
        storage_path = file_result.data[0]["storage_path"]
        bucket_name, file_key = storage_path.split('/', 1)
        public_url = ctx.deps.supabase.storage.from_(bucket_name).get_public_url(file_key)
        
        # Download and load CSV
        response = requests.get(public_url)
        if response.status_code != 200:
            logfire.error("Failed to download CSV", url=public_url, status=response.status_code)
            return []
        
        df = pd.read_csv(io.StringIO(response.text))
        
        # Log CSV structure for debugging
        logfire.info("CSV data loaded", 
                    columns=df.columns.tolist(),
                    shape=df.shape,
                    sample_data=df.head(2).to_dict('records'))
        
        ctx.deps.duck.register("csv_data", df)
        
        # Execute SQL query
        try:
            result_df = ctx.deps.duck.execute(sql_query).fetchdf()
            chart_data = result_df.to_dict('records') if not result_df.empty else []
            
            logfire.info("SQL executed successfully in viz_agent", 
                        widget_id=ctx.deps.widget_id,
                        rows_returned=len(chart_data),
                        sql_query=sql_query)
        except Exception as sql_error:
            logfire.error("SQL execution failed in viz_agent", 
                         error=str(sql_error),
                         sql_query=sql_query,
                         widget_id=ctx.deps.widget_id)
            chart_data = []
        
        return chart_data
        
    except Exception as e:
        logfire.error("Failed to execute SQL in viz_agent", 
                     error=str(e), 
                     widget_id=ctx.deps.widget_id)
        return []

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
    colors: list[str] = Field(default_factory=lambda: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"], description="The color palette to use for the chart - now uses theme references")
    
    @classmethod
    def from_chart_colors(cls, chart_colors: Optional[Dict[str, str]] = None):
        """Create colorPaletteClass from chart_colors dict - now returns theme references"""
        # Always return theme references regardless of input
        # The actual colors will be resolved on the frontend based on the dashboard theme
        return cls(colors=[
            "var(--chart-1)",
            "var(--chart-2)", 
            "var(--chart-3)",
            "var(--chart-4)",
            "var(--chart-5)"
        ])

def hsl_to_hex(hsl: str) -> str:
    """Convert HSL string format 'h s% l%' to hex color"""
    try:
        # Parse HSL values
        parts = hsl.strip().split()
        if len(parts) != 3:
            return "#000000"
        
        h = float(parts[0]) / 360  # Normalize hue to 0-1
        s = float(parts[1].rstrip('%')) / 100
        l = float(parts[2].rstrip('%')) / 100
        
        # Convert HSL to RGB
        if s == 0:
            r = g = b = l
        else:
            def hue_to_rgb(p, q, t):
                if t < 0: t += 1
                if t > 1: t -= 1
                if t < 1/6: return p + (q - p) * 6 * t
                if t < 1/2: return q
                if t < 2/3: return p + (q - p) * (2/3 - t) * 6
                return p
            
            q = l * (1 + s) if l < 0.5 else l + s - l * s
            p = 2 * l - q
            r = hue_to_rgb(p, q, h + 1/3)
            g = hue_to_rgb(p, q, h)
            b = hue_to_rgb(p, q, h - 1/3)
        
        # Convert to hex
        return "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))
    except Exception as e:
        logfire.warn(f"Failed to convert HSL to hex: {hsl}, error: {e}")
        return "#000000"

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
    kpiCalculateChange: Optional[bool] = Field(default=False, description="Whether to auto-calculate percentage change from period-over-period data")
    kpiChangePeriod: Optional[str] = Field(default="previous", description="Period comparison for auto-calculation: 'previous', 'month', 'quarter', 'year'")
    # kpiChange: Optional[float] = Field(default=None, description="Numeric value representing the change (e.g., 5.2 for 5.2% increase)")
    # kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('increase', 'decrease', or 'flat')")
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
    # kpiChangeDirection: Optional[str] = Field(default=None, description="Direction of change ('increase', 'decrease', or 'flat')")
    kpiChangeFormat: Optional[str] = Field(default=None, description="Format string for the change value (e.g., '+0.0%')")
    kpiValueFormat: Optional[str] = Field(default=None, description="Format string for the main value")
    kpiStyles: Optional[kpiStylesClass] = Field(default=None, description="Styling options for the KPI component")
    dataColumn: str = Field(description="The column to use for the KPI value")
    changeColumn: Optional[str] = Field(default=None, description="The column to use for the change value")
    kpiCalculateChange: Optional[bool] = Field(default=False, description="Whether to auto-calculate percentage change from period-over-period data")
    kpiChangePeriod: Optional[str] = Field(default="previous", description="Period comparison for auto-calculation: 'previous', 'month', 'quarter', 'year'")

# =============================================== Pie chart definitions ===========================================
class pieConfigClass(BaseModel):
    isDonut: Optional[bool] = Field(default=False, description="Whether to display the pie chart as a donut chart")
    showLabels: Optional[bool] = Field(default=False, description="Whether to show labels on pie slices")
    outerRadius: Optional[int] = Field(default=80, description="The outer radius of the pie chart")
    innerRadius: Optional[int] = Field(default=40, description="The inner radius of the pie chart")
    stroke: Optional[str] = Field(default="transparent", description="The stroke color of the pie chart")
    strokeWidth: Optional[int] = Field(default=0, description="The stroke width of the pie chart")

class PieChartInput(BaseModel):
    """
    Input specification for pie charts
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    dataColumn: str = Field(description="The value column to use for the pie chart. Should be one")
    xAxisConfig: xAxisConfigClass = Field(description="The configuration for the x-axis")
    pieConfig: pieConfigClass = Field(description="The configuration for the pie chart")
    hideLegend: Optional[bool] = Field(default=False, description="Whether to hide the legend")

class PieChartOutput(BaseModel):
    """
    Output specification for pie charts
    """
    chartType: Literal["pie"] = Field(default="pie", description="Type of chart")
    title: str = Field(description="The title of the chart")
    description: str = Field(description="a 5 word description of the chart")
    pieConfig: pieConfigClass = Field(description="The configuration for the pie chart")
    # chartConfig: dict = Field(description="The configuration for the chart, including the colors and labels for each column")
    hideLegend: Optional[bool] = Field(default=False, description="Whether to hide the legend")
    xAxisConfig: xAxisConfigClass = Field(description="The configuration for the x-axis")
    dataColumn: str = Field(description="The value column to use for the pie chart. Should be one")
    colors: list[str] = Field(description="The colors to use for the pie chart")

# =============================================== Table definitions ===============================================
# class columnFormatterClass(BaseModel):
#     """
#     Configuration for column formatting. This is used to format the values of the columns in the table. One object per column, in the form of:
#     {
#         "type": "currency"
#     }
#     """
#     type: Literal["currency", "number", "percentage", "text"] = Field(description="The type of formatter to use")
#     # currency: Optional[str] = Field(default="USD", description="The currency to use for currency formatting")
#     # decimals: Optional[int] = Field(default=2, description="The number of decimal places to show")
class ColumnFormatter(BaseModel):
    """
    Configuration for column formatting. This is used to format the values of the columns in the table.
    """
    type: Literal["currency", "number", "percentage", "text"] = Field(description="The type of formatter to use")

class sortConfigClass(BaseModel):
    column: str = Field(description="The column to sort by")
    direction: Literal["asc", "desc"] = Field(default="asc", description="The sort direction")

class paginationClass(BaseModel):
    page: Optional[int] = Field(default=1, description="The current page number")
    pageSize: Optional[int] = Field(default=10, description="The number of rows per page")

class tableConfigClass(BaseModel):
    columnLabels: Optional[dict[str, str]] = Field(default=None, description="Dictionary defining custom labels for columns. Keys are the column names.")
    columnFormatters: Optional[dict[str, ColumnFormatter]] = Field(default=None, description="Dictionary defining the type of each column. Keys are the column names. \
         Types can be 'currency', 'number', 'percentage', 'text'. Example usage: {'column_name1': {'type': 'currency'}, 'column_name2': {'type': 'number'}}")
    cellAlignment: Optional[dict[str, str]] = Field(default=None, description="Alignment for each column's cells")
    headerAlignment: Optional[str] = Field(default="text-left", description="Alignment for header cells")
    striped: Optional[bool] = Field(default=False, description="Whether to show striped rows")
    sortBy: Optional[sortConfigClass] = Field(default=None, description="Sorting configuration")
    pagination: Optional[paginationClass] = Field(default=None, description="Pagination configuration")

class TableInput(BaseModel):
    """
    Input specification for table components
    """
    title: str = Field(description="The title of the chart")
    description: str = Field(default="", description="a 5 word description of the chart")
    columns: list[str] = Field(description="The columns to use for the table")
    tableConfig: tableConfigClass = Field(description="The configuration for the table")
    # columnFormatters: Optional[dict[str, str]] = Field(default=None, description="Dictionary defining the type of each column, e.g. {'column_name1': <column1_type>, 'column_name2': <column2_type>} \
    #      etc., types can be 'currency', 'number', 'percentage', 'text'. Column_names should be the same as the column names in the columns field.")

class TableOutput(BaseModel):
    """
    Output specification for table components
    """
    chartType: Literal["table"] = Field(default="table", description="Type of chart")
    title: str = Field(description="The title of the chart")
    description: str = Field(default="", description="a 5 word description of the chart")
    columns: list[str] = Field(description="The columns to use for the table")
    tableConfig: tableConfigClass = Field(description="The configuration for the table")



# Declare the agent
viz_agent = Agent(
    "openai:gpt-4o-mini",
    deps_type=Deps
)

# Declare the systems prompt
@viz_agent.system_prompt
async def system_prompt(ctx: RunContext[Deps]) -> str:
    
    logfire.info(f"Viz agent context: {ctx.deps}")

    data_cur = get_data(ctx.deps.file_id, ctx.deps.widget_id, ctx.deps.supabase, ctx.deps.duck)
    data_cols = data_cur.columns.tolist()
    
    logfire.info("Data columns", data_cols=data_cols)
    
    widget_type = ctx.deps.widget_type
    
    tool_map = {
        "bar": "visualize_bar",
        "area": "visualize_area",
        "line": "visualize_line",
        "kpi": "visualize_kpi",
        "pie": "visualize_pie",
        "table": "visualize_table"
    }
    
    instruction = ""
    if widget_type and widget_type in tool_map:
        instruction = f"1. The user has pre-selected the chart type. You MUST use the `{tool_map[widget_type]}` tool."
    else:
        instruction = """1. You MUST ALWAYS execute EXACTLY ONE of these tools:
       - visualize_bar for bar charts
       - visualize_area for area charts
       - visualize_line for line charts
       - visualize_kpi for KPIs
       - visualize_pie for pie charts
       - visualize_table for tables"""

    prompt = f"""
    You are a data visualization expert. You are given a user prompt and a dataset.
    The dataset has the following columns: {data_cols}

    CRITICAL INSTRUCTIONS:
    {instruction}
    
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
        "chartType": "bar|area|line|kpi|pie|table",
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

    if not chart_specs["chartConfig"]:
        logfire.warn("No chart config found in chart specs!")
        return chart_specs

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

    await update_widget_specs(ctx.deps.widget_id, chart_specs)

    return chart_specs

@viz_agent.tool
async def visualize_bar(ctx: RunContext[Deps], input: BarChartInput) -> BarChartOutput:
    """
    Enhance the charts specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize bar tool!")
    chartType = "bar"
    # Get color palette with fallback to user's default
    chart_colors = await get_color_palette(ctx)
    colors = colorPaletteClass.from_chart_colors(chart_colors).colors

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
        widget_id = ctx.deps.widget_id
        # Execute SQL and get chart data
        chart_data = await execute_sql_and_get_data(ctx)
        # Update widget with both config and data
        await update_widget_specs(widget_id, response.model_dump(), chart_data)
    except Exception as e:
        print(f"Error in visualize_bar: {str(e)}")

    return response

@viz_agent.tool
async def visualize_area(ctx: RunContext[Deps], input: AreaChartInput) -> AreaChartOutput:
    """
    Enhance the area chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize area tool!")
    chartType = "area"
    # Get color palette with fallback to user's default
    chart_colors = await get_color_palette(ctx)
    colors = colorPaletteClass.from_chart_colors(chart_colors).colors

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
        widget_id = ctx.deps.widget_id
        # Execute SQL and get chart data
        chart_data = await execute_sql_and_get_data(ctx)
        # Update widget with both config and data
        await update_widget_specs(widget_id, response.model_dump(), chart_data)
    except Exception as e:
        print(f"Error in visualize_area: {str(e)}")

    return response

@viz_agent.tool
async def visualize_line(ctx: RunContext[Deps], input: LineChartInput) -> LineChartOutput:
    """
    Enhance the line chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize line tool!")
    chartType = "line"
    # Get color palette with fallback to user's default
    chart_colors = await get_color_palette(ctx)
    colors = colorPaletteClass.from_chart_colors(chart_colors).colors

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
        widget_id = ctx.deps.widget_id
        # Execute SQL and get chart data
        chart_data = await execute_sql_and_get_data(ctx)
        # Update widget with both config and data
        await update_widget_specs(widget_id, response.model_dump(), chart_data)
    except Exception as e:
        print(f"Error in visualize_line: {str(e)}")

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
        changeColumn=input.changeColumn,
        kpiCalculateChange=input.kpiCalculateChange,
        kpiChangePeriod=input.kpiChangePeriod
    )

    try:
        widget_id = ctx.deps.widget_id
        # Execute SQL and get chart data
        chart_data = await execute_sql_and_get_data(ctx)
        # Update widget with both config and data
        await update_widget_specs(widget_id, response.model_dump(), chart_data)
    except Exception as e:
        print(f"Error in visualize_kpi: {str(e)}")

    return response 

@viz_agent.tool
async def visualize_pie(ctx: RunContext[Deps], input: PieChartInput) -> PieChartOutput:
    """
    Enhance the pie chart specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize pie tool!")
    chartType = "pie"
    # Get color palette with fallback to user's default
    chart_colors = await get_color_palette(ctx)
    colors = colorPaletteClass.from_chart_colors(chart_colors).colors
    data_cols = input.dataColumn
    # chart_config = convert_chart_data_to_chart_config(data_cols, colors)

    response = PieChartOutput(
        chartType=chartType,
        title=input.title,
        description=input.description,
        pieConfig=input.pieConfig,
        # chartConfig=chart_config,
        hideLegend=input.hideLegend,
        xAxisConfig=input.xAxisConfig,
        dataColumn=input.dataColumn,
        colors=colors
    )

    try:
        widget_id = ctx.deps.widget_id
        # Execute SQL and get chart data
        chart_data = await execute_sql_and_get_data(ctx)
        # Update widget with both config and data
        await update_widget_specs(widget_id, response.model_dump(), chart_data)
    except Exception as e:
        print(f"Error in visualize_pie: {str(e)}")
        
    return response

@viz_agent.tool
async def visualize_table(ctx: RunContext[Deps], input: TableInput) -> TableOutput:
    """
    Enhance the table specs with additional information in order to later give it to the frontend to visualize.
    """
    print("Called visualize table tool!")
    chartType = "table"

    logfire.info(f"Table columns: {input.columns}")

    # Validate column formatters if provided
    # if input.columnFormatters:
    table_config = input.tableConfig.model_dump()
    
    # if input.tableConfig.columnFormatters:
    #     formatters = {}
    #     for col, formatter in input.tableConfig.columnFormatters.items():
    #         formatters[col] = {"type": formatter}

    #     for col, formatter in formatters.items():
    #         if formatter == "currency" and not formatter.currency:
    #             formatter.currency = "USD"
    #         if formatter in ["number", "percentage"] and formatter.decimals is None:
    #                 formatter.decimals = 2

    #     table_config["columnFormatters"] = formatters

    # logfire.info(f"Column formatters: {formatters}")
    if input.tableConfig.columnFormatters:
        logfire.info(f"Column formatters type: {input.tableConfig.columnFormatters}")

    response = TableOutput(
        chartType=chartType,
        title=input.title,
        description=input.description,
        columns=input.columns,
        tableConfig=table_config
    )

    try:
        widget_id = ctx.deps.widget_id
        # Execute SQL and get chart data
        chart_data = await execute_sql_and_get_data(ctx)
        # Update widget with both config and data
        await update_widget_specs(widget_id, response.model_dump(), chart_data)
    except Exception as e:
        print(f"Error in visualize_table: {str(e)}")

    return response

