import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
import sys
import os
import asyncio
from pprint import pprint
from io import StringIO

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, project_root)

from apps.backend.tools.chartSpec import (
    BarChartInput, BarChartOutput,
    LineChartInput, LineChartOutput,
    AreaChartInput, AreaChartOutput,
    KPIInput, KPIOutput,
    xAxisConfigClass, yAxisConfigClass,
    barConfigClass, areaConfigClass,
    gradientStopsClass, fontSizeClass,
    kpiStylesClass, Deps, viz_agent, remove_null_pairs
)

# Test Data Fixtures
# @pytest.fixture
def sales_data():
    """Monthly sales data for different products"""
    return pd.DataFrame({
        'date': pd.date_range(start='2024-01-01', periods=12, freq='M'),
        'product_a': [100, 120, 150, 130, 160, 180, 200, 190, 210, 230, 250, 270],
        'product_b': [80, 90, 100, 95, 110, 120, 130, 125, 140, 150, 160, 170],
        'product_c': [60, 70, 80, 75, 85, 95, 105, 100, 110, 120, 130, 140]
    })

# @pytest.fixture
def website_metrics():
    """Daily website metrics with multiple KPIs"""
    dates = pd.date_range(start='2024-01-01', periods=30, freq='D')
    return pd.DataFrame({
        'date': dates,
        'visitors': np.random.randint(1000, 5000, 30),
        'pageviews': np.random.randint(5000, 15000, 30),
        'bounce_rate': np.random.uniform(20, 40, 30),
        'avg_session_duration': np.random.uniform(2, 5, 30),
        'conversion_rate': np.random.uniform(1, 5, 30)
    })

# @pytest.fixture
def financial_data():
    """Quarterly financial data with multiple metrics"""
    return pd.DataFrame({
        'quarter': ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
        'revenue': [1000000, 1200000, 1150000, 1300000],
        'expenses': [800000, 850000, 900000, 950000],
        'profit': [200000, 350000, 250000, 350000],
        'roi': [25, 41.2, 27.8, 36.8]
    })

# @pytest.fixture
def employee_data():
    """Department-wise employee data"""
    return pd.DataFrame({
        'department': ['Sales', 'Marketing', 'Engineering', 'Product', 'HR', 'Finance'],
        'headcount': [45, 30, 80, 25, 15, 20],
        'avg_salary': [65000, 70000, 95000, 85000, 60000, 75000],
        'attrition_rate': [15.2, 12.5, 8.7, 10.3, 5.2, 7.8]
    })

# @pytest.fixture
def time_series_data():
    """Hourly time series data with seasonality"""
    hours = pd.date_range(start='2024-01-01', periods=24, freq='H')
    base = np.sin(np.linspace(0, 4*np.pi, 24)) * 100
    noise = np.random.normal(0, 10, 24)
    return pd.DataFrame({
        'timestamp': hours,
        'value': base + noise,
        'upper_bound': base + noise + 20,
        'lower_bound': base + noise - 20
    })

# Example User Prompts
# @pytest.fixture
def bar_chart_prompts():
    return {
        "basic": "Show me a bar chart of monthly sales for each product",
        "horizontal": "Create a horizontal bar chart showing department headcount",
        "stacked": "Display a stacked bar chart of revenue and expenses by quarter",
        "multiple_metrics": "Compare average salary and attrition rate across departments using a bar chart",
        "with_labels": "Show product sales with truncated labels for better readability"
    }

# @pytest.fixture
def line_chart_prompts():
    return {
        "basic": "Plot the daily visitor count trend over the last month",
        "multiple_series": "Show the trend of pageviews and bounce rate over time",
        "with_dots": "Display the conversion rate trend with data points marked",
        "custom_line": "Plot the average session duration using a step line chart",
        "with_bounds": "Show the hourly value with upper and lower bounds"
    }

# @pytest.fixture
def area_chart_prompts():
    return {
        "basic": "Show the cumulative sales area for all products",
        "stacked": "Display stacked area chart of revenue and expenses",
        "with_gradient": "Create an area chart of website traffic with gradient fill",
        "multiple_metrics": "Show the distribution of visitors and pageviews over time",
        "with_bounds": "Plot the value with confidence bounds as an area chart"
    }

# @pytest.fixture
def kpi_prompts():
    return {
        "basic": "Show me the total revenue for Q4 2024",
        "with_change": "Display the current conversion rate with change from last period",
        "multiple_metrics": "Show the average salary with department comparison",
        "with_formatting": "Display the ROI with percentage formatting",
        "with_styling": "Show the visitor count with custom styling and formatting"
    }

# Test Cases for Different Scenarios
class TestBarChartScenarios:
    @pytest.mark.asyncio
    async def test_basic_bar_chart(self, data=[sales_data(), website_metrics(), financial_data(), employee_data(), time_series_data()], 
    bar_chart_prompts=bar_chart_prompts()):
        for idx, key in enumerate(bar_chart_prompts):
            print(f"Testing {key} prompt: {bar_chart_prompts[key]}")  
            response = await get_viz_agent_response(bar_chart_prompts[key], data[idx])
            # Test implementation...

    def test_horizontal_bar_chart(self, employee_data, bar_chart_prompts):
        input_data = BarChartInput(
            title="Department Headcount",
            description="Current headcount by department",
            dataColumns=["headcount"],
            xColumn="department",
            barConfig=barConfigClass(
                isHorizontal=True,
                radius=4
            ),
            yAxisConfig=yAxisConfigClass()
        )
        # Test implementation...

    def test_stacked_bar_chart(self, financial_data, bar_chart_prompts):
        input_data = BarChartInput(
            title="Quarterly Financial Overview",
            description="Revenue and expenses by quarter",
            dataColumns=["revenue", "expenses"],
            xColumn="quarter",
            barConfig=barConfigClass(
                radius=4,
                fillOpacity=0.8
            ),
            yAxisConfig=yAxisConfigClass()
        )
        # Test implementation...

class TestLineChartScenarios:
    def test_basic_line_chart(self, website_metrics, line_chart_prompts):
        input_data = LineChartInput(
            title="Daily Visitor Count",
            description="Visitor trend over time",
            dataColumns=["visitors"],
            xColumn="date",
            xAxisConfig=xAxisConfigClass(
                dataKey="date",
                dateFormat="YYYY-MM-DD"
            ),
            yAxisConfig=yAxisConfigClass(),
            lineType="monotone",
            strokeWidth=2,
            dot=True
        )
        # Test implementation...

    def test_multiple_series_line_chart(self, website_metrics, line_chart_prompts):
        input_data = LineChartInput(
            title="Website Metrics",
            description="Multiple metrics over time",
            dataColumns=["pageviews", "bounce_rate"],
            xColumn="date",
            xAxisConfig=xAxisConfigClass(dataKey="date"),
            yAxisConfig=yAxisConfigClass(),
            lineType="monotone",
            strokeWidth=2
        )
        # Test implementation...

class TestAreaChartScenarios:
    def test_basic_area_chart(self, sales_data, area_chart_prompts):
        input_data = AreaChartInput(
            title="Cumulative Product Sales",
            description="Sales area over time",
            dataColumns=["product_a", "product_b", "product_c"],
            xColumn="date",
            xAxisConfig=xAxisConfigClass(dataKey="date"),
            yAxisConfig=yAxisConfigClass(),
            areaConfig=areaConfigClass(
                useGradient=True,
                fillOpacity=0.4
            )
        )
        # Test implementation...

    def test_stacked_area_chart(self, financial_data, area_chart_prompts):
        input_data = AreaChartInput(
            title="Financial Overview",
            description="Revenue and expenses over time",
            dataColumns=["revenue", "expenses"],
            xColumn="quarter",
            xAxisConfig=xAxisConfigClass(dataKey="quarter"),
            yAxisConfig=yAxisConfigClass(),
            stacked=True,
            areaConfig=areaConfigClass(
                useGradient=True,
                fillOpacity=0.4
            )
        )
        # Test implementation...

class TestKPIScenarios:
    def test_basic_kpi(self, financial_data, kpi_prompts):
        input_data = KPIInput(
            title="Q4 Revenue",
            description="Total revenue for Q4 2024",
            dataColumn="revenue",
            kpiPrefix="$",
            kpiLabel="Total Revenue",
            kpiValueFormat=",.0f"
        )
        # Test implementation...

    def test_kpi_with_change(self, website_metrics, kpi_prompts):
        input_data = KPIInput(
            title="Conversion Rate",
            description="Current conversion rate with change",
            dataColumn="conversion_rate",
            kpiSuffix="%",
            kpiLabel="Conversion Rate",
            changeColumn="conversion_rate",
            kpiChangeFormat="+.1f%",
            kpiStyles=kpiStylesClass(
                valueColor="#000000",
                labelColor="#666666"
            )
        )
        # Test implementation...

def transform_value(value: Any) -> Any:
    """Transform values to appropriate string format"""
    if isinstance(value, pd.Timestamp):
        return value.strftime('%Y-%m-%d %H:%M:%S')
    elif isinstance(value, bool):
        return str(value).lower()
    elif isinstance(value, dict):
        return {k: transform_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [transform_value(item) for item in value]
    return value

async def get_viz_agent_response(user_prompt, data_cur):
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
        response = transform_value(response)
        
        # Convert response to formatted string
        output = StringIO()
        pprint(response, stream=output, width=120, sort_dicts=False)
        response_str = output.getvalue()
        
        # Replace string booleans with actual boolean values
        response_str = response_str.replace("'true'", "true").replace("'false'", "false")
        
        print("tool_used: ", tool_used)
        print("tool Output: ", response_str)

        return response_str

if __name__ == "__main__":
    # Create event loop and run the async test
    loop = asyncio.get_event_loop()
    loop.run_until_complete(TestBarChartScenarios().test_basic_bar_chart())
