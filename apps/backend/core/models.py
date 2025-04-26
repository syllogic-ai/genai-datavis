from typing import Dict, List, Optional, Union, Any, Literal
from pydantic import BaseModel, ConfigDict
from enum import Enum


class DatasetProfile(BaseModel):
    """
    Represents a profile of a dataset, containing column information and sample data.
    Used for analyzing and understanding the structure of datasets.
    """
    columns: Dict[str, str]
    sample_rows: List[Dict[str, Any]]
    model_config = ConfigDict(extra="forbid")


class GradientStops(BaseModel):
    """
    Defines gradient configuration for area charts.
    Controls how color gradients are rendered from top to bottom.
    """
    topOffset: Optional[str] = None
    bottomOffset: Optional[str] = None
    topOpacity: Optional[float] = None
    bottomOpacity: Optional[float] = None
    model_config = ConfigDict(extra="forbid")


class FontSize(BaseModel):
    """
    Configures font sizes for different elements of a KPI display.
    Allows specifying sizes for value, label, and change indicator.
    """
    value: Optional[Union[str, float]] = None
    label: Optional[Union[str, float]] = None
    change: Optional[Union[str, float]] = None
    model_config = ConfigDict(extra="forbid")


class ChartConfigItem(BaseModel):
    """
    Configuration for a single data series in a chart.
    Defines display label and color for the series.
    """
    label: str
    color: str
    model_config = ConfigDict(extra="forbid")


class ChangeDirection(str, Enum):
    """
    Enumeration for KPI change direction indicators.
    Used to visually represent trends (increase, decrease, or flat).
    """
    INCREASE = "increase"
    DECREASE = "decrease"
    FLAT = "flat"


class LineType(str, Enum):
    """
    Enumeration for different types of line rendering in charts.
    Controls the visual appearance and interpolation of lines.
    """
    MONOTONE = "monotone"
    STEP = "step"
    BUMP = "bump"
    LINEAR = "linear"
    NATURAL = "natural"


class XAxisCfg(BaseModel):
    """
    Configuration for the X-axis of a chart.
    Controls appearance, data binding, and formatting of the X-axis.
    """
    field: str  # Corresponds to dataKey in TS
    label: Optional[str] = None
    dateFormat: Optional[str] = None
    hide: Optional[bool] = None
    tickLine: Optional[bool] = None
    axisLine: Optional[bool] = None
    tickMargin: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class YAxisCfg(BaseModel):
    """
    Configuration for the Y-axis of a chart.
    Controls appearance, data binding, and formatting of the Y-axis.
    """
    field: str
    label: Optional[str] = None
    hide: Optional[bool] = None
    tickLine: Optional[bool] = None
    axisLine: Optional[bool] = None
    tickMargin: Optional[int] = None
    tickCount: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class AreaCfg(BaseModel):
    """
    Configuration specific to area charts.
    Defines data mapping and visual styling for area charts.
    """
    x: str
    y: str
    useGradient: Optional[bool] = None
    fillOpacity: Optional[float] = None
    accessibilityLayer: Optional[bool] = None
    gradientStops: Optional[GradientStops] = None
    model_config = ConfigDict(extra="forbid")


class BarCfg(BaseModel):
    """
    Configuration specific to bar charts.
    Defines data mapping and visual styling for bar charts.
    """
    x: str
    y: str
    radius: Optional[float] = None
    truncateLabels: Optional[bool] = None
    maxLabelLength: Optional[int] = None
    accessibilityLayer: Optional[bool] = None
    fillOpacity: Optional[float] = None
    barSize: Optional[int] = None
    barGap: Optional[int] = None
    barCategoryGap: Optional[int] = None
    isHorizontal: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")


class KPIStyles(BaseModel):
    """
    Styling configuration for KPI (Key Performance Indicator) displays.
    Controls colors, sizes, and other visual attributes of KPI components.
    """
    value_field: str
    label: Optional[str] = None
    valueColor: Optional[str] = None
    labelColor: Optional[str] = None
    subLabelColor: Optional[str] = None
    changePositiveColor: Optional[str] = None
    changeNegativeColor: Optional[str] = None
    changeFlatColor: Optional[str] = None
    backgroundColor: Optional[str] = None
    padding: Optional[Union[str, int]] = None
    borderRadius: Optional[Union[str, int]] = None
    fontSize: Optional[FontSize] = None
    model_config = ConfigDict(extra="forbid")


class ChartSpec(BaseModel):
    """
    Complete specification for a chart in the system.
    Contains all configuration options for different chart types
    and controls visualization, data binding, and styling.
    """
    chart_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[List[Dict[str, Union[str, float]]]] = None
    x_axis: Optional[XAxisCfg] = None
    y_axis: Optional[YAxisCfg] = None
    area_config: Optional[AreaCfg] = None
    bar_config: Optional[BarCfg] = None
    kpi_config: Optional[KPIStyles] = None
    dateFormatTooltip: Optional[str] = None
    lineType: Optional[LineType] = None
    hideLegend: Optional[bool] = None
    strokeWidth: Optional[float] = None
    dot: Optional[bool] = None
    stacked: Optional[bool] = None
    chartConfig: Optional[Dict[str, ChartConfigItem]] = None
    kpiValue: Optional[Union[str, float]] = None
    kpiSuffix: Optional[str] = None
    kpiPrefix: Optional[str] = None
    kpiLabel: Optional[str] = None
    kpiSubLabel: Optional[str] = None
    kpiChange: Optional[float] = None
    kpiChangeDirection: Optional[ChangeDirection] = None
    kpiChangeFormat: Optional[str] = None
    kpiValueFormat: Optional[str] = None
    kpiStyles: Optional[KPIStyles] = None
    model_config = ConfigDict(extra="forbid")


class ChatMessage(BaseModel):
    """
    Represents a single message in a chat conversation.
    Contains the role of the sender (user, assistant, system) and content.
    """
    role: str
    content: str
    model_config = ConfigDict(extra="forbid")


class UserRow(BaseModel):
    """
    Represents a user in the database.
    Maps to the 'users' table in the database schema.
    """
    id: str
    email: str
    created_at: str
    model_config = ConfigDict(extra="forbid")


class FileRow(BaseModel):
    """
    Represents a file in the database.
    Maps to the 'files' table and contains metadata about uploaded files.
    """
    id: str
    user_id: str
    file_type: str  # 'original' | 'cleaned' | 'meta'
    original_filename: Optional[str] = None
    storage_path: str
    status: str = "ready"  # 'processing' | 'ready' | 'failed'
    filename: str  # Keeping for backward compatibility
    created_at: str
    model_config = ConfigDict(extra="forbid")


class ConversationItem(BaseModel):
    """
    Represents an individual message in the conversation array.
    Part of the ChatRow conversation field.
    """
    role: str
    message: str
    timestamp: str
    model_config = ConfigDict(extra="forbid")


class ChatRow(BaseModel):
    """
    Represents a chat session in the database.
    Maps to the 'chats' table and contains the conversation history.
    """
    id: str
    user_id: Optional[str] = None
    file_id: str
    title: str = "New Chat"
    conversation: List[ConversationItem]
    message: ChatMessage  # Keeping for backward compatibility
    created_at: str
    updated_at: str
    model_config = ConfigDict(extra="forbid")


class ChartRow(BaseModel):
    """
    Represents a chart in the database.
    Maps to the 'charts' table and contains chart specification and metadata.
    """
    id: str
    chat_id: str
    file_id: Optional[str] = None  # Keeping for backward compatibility
    chart_type: str
    spec: ChartSpec  # Using spec for backward compatibility, equivalent to chartSpecs
    created_at: str
    model_config = ConfigDict(extra="forbid")


class LLMUsageRow(BaseModel):
    """
    Represents LLM usage metrics in the database.
    Maps to the 'llm_usage' table and tracks API usage, tokens, and costs.
    """
    id: str
    request_id: str
    chat_id: Optional[str] = None
    file_id: Optional[str] = None  # Keeping for backward compatibility
    model: str
    provider: str
    api_request: str
    input_tokens: int  # tokens_in for backward compatibility
    output_tokens: int  # tokens_out for backward compatibility
    compute_time: float
    total_cost: float  # cost for backward compatibility
    tokens_in: int  # Keeping for backward compatibility
    tokens_out: int  # Keeping for backward compatibility
    cost: float  # Keeping for backward compatibility
    created_at: str
    model_config = ConfigDict(extra="forbid") 