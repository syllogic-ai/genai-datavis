import pandas as pd
import base64
import io
import plotly.io as pio
import threading
import sqlite3
import numpy as np
import ast
import json

def validate_data(data, query=None, context=None, ai_service=None):
        validation_output = []
        # validation_output.append("Validating your data...")

        # Check for missing values
        if data.isnull().sum().sum() > 0:
            validation_output.append("The following columns have empty values:")
            validation_output.append(data.isnull().sum().to_dict())
        else:
            validation_output.append("No empty values found!")

        # Check for duplicates
        if data.duplicated().sum() > 0:
            dup_num = data.duplicated().sum()
            validation_output.append(f"{dup_num} duplicate entries found.")
        else:
            validation_output.append("No duplicate entries found.")

        # Validate data types
        # validation_output.append("Validating the data types...")
        data['month'] = pd.to_datetime(data['month'], errors='coerce')
        return validation_output

def get_insights(data, query, context, ai_service):
        insights_output = []
        # print("Going for insights")
        data_text = data.to_string(index=False)
        # context = f"The following is the financial data for 2024:\n{data_text}"
        final_query = f"Generate valuable business insights about the given data: {data_text}, trying to best answer the following  query: {query}. \
        Be specific and provide actionable insights. "
        response = ai_service.process_query(context, final_query)
        # print(response)
        insights_output.append(response)

        return insights_output

class TimeoutException(Exception):
    pass

def exec_with_timeout(code, local_vars, timeout=5):
    def target():
        try:
            exec(code, {}, local_vars)
        except Exception as e:
            local_vars["error"] = e

    thread = threading.Thread(target=target)
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        raise TimeoutException("Execution timed out")
    if "error" in local_vars:
        raise local_vars["error"]

def  visualize(data, query, context, ai_service):
        """
        Generate visualization configuration based on data and query.
        
        Returns a list containing a single ChartSpec object that strictly conforms to the frontend ChartSpec interface.
        
        Example of returned ChartSpec for different chart types:
        
        1. Line Chart:
        {
            "chartType": "line",
            "title": "Revenue Trends",
            "description": "Monthly revenue trends by department",
            "data": [
                {"month": "Jan", "marketing": 1200, "sales": 900},
                {"month": "Feb", "marketing": 1400, "sales": 1000},
                {"month": "Mar", "marketing": 1300, "sales": 1200}
            ],
            "xAxisConfig": {
                "dataKey": "month"
            },
            "lineType": "monotone",
            "dot": true
        }
        
        2. Bar Chart:
        {
            "chartType": "bar",
            "title": "Department Performance",
            "description": "Annual performance by department",
            "data": [
                {"department": "Sales", "revenue": 12500, "target": 10000},
                {"department": "Marketing", "revenue": 8500, "target": 9000},
                {"department": "Support", "revenue": 4500, "target": 5000}
            ],
            "xAxisConfig": {
                "dataKey": "department"
            },
            "barConfig": {
                "radius": 4,
                "fillOpacity": 0.8
            }
        }
        
        3. Area Chart:
        {
            "chartType": "area",
            "title": "Traffic Sources",
            "description": "Website traffic sources over time",
            "data": [
                {"date": "2023-01", "direct": 4000, "search": 2400, "social": 1800},
                {"date": "2023-02", "direct": 4200, "search": 2800, "social": 2200},
                {"date": "2023-03", "direct": 5000, "search": 3000, "social": 2600}
            ],
            "xAxisConfig": {
                "dataKey": "date",
                "dateFormat": "MMM YY"
            },
            "stacked": true,
            "areaConfig": {
                "useGradient": true,
                "fillOpacity": 0.6
            }
        }
        
        4. KPI Chart:
        {
            "chartType": "kpi",
            "title": "Total Revenue",
            "description": "Q1 2023 Performance",
            "kpiValue": 1250000,
            "kpiLabel": "Total Revenue",
            "kpiSubLabel": "Q1 2023",
            "kpiPrefix": "$",
            "kpiSuffix": "",
            "kpiChange": 12.5,
            "kpiChangeDirection": "increase"
        }
        """
        # Load the data glossary 
        file_path = 'utils/visual_glossary.txt'
        # file_path = "apps/backend/utils/visual_glossary.txt"
        # file_path = 'apps\backend\utils\visual_glossary.txt'
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                glossary_content = file.read()
        except FileNotFoundError:
            print(f"Error: The file at {file_path} was not found.")
            return ""
        except Exception as e:
            print(f"An error occurred: {e}")
            return ""

        if not query:
            query = "Given the data, provide me a valuable visualization"
        
        # Define accepted chart types to match frontend ChartSpec
        valid_chart_types = ["line", "bar", "area", "kpi"]
        
        # Initial chart type determination
        init_query = f"I want you to decide what's the best visualization type to use in order to answer the following question: {query} \
             Could be a bar, area, line, or kpi chart. \
             Print only the name of the visualization type and nothing else. \
             You must choose from exactly these options: bar, area, line, kpi."

        data_text = data.to_string(index=False)
        
        # First LLM Pass to get the visualization type
        chart_type = ai_service.process_query(context, init_query).strip().lower()

        # Validate and default to "line" if not valid
        if chart_type not in valid_chart_types: 
             chart_type = "line"
             
        # Build query based on chart type
        if chart_type == "kpi":
            # Special handling for KPI chart
            kpi_query = f"""
            Given the following data: {data.head(10).to_string(index=False)}, 
            I want you to extract the following KPI components:
            - A single numeric value for kpiValue
            - An appropriate kpiLabel (string)
            - An appropriate kpiSubLabel (string) if applicable
            - A kpiPrefix or kpiSuffix if applicable (such as $, %, etc.)
            - A kpiChange value (number) if there's change data
            - A kpiChangeDirection ("increase", "decrease", or "flat")
            
            Here's an example of what your response should look like:
            ```
            {{
              "kpiValue": 1250000,
              "kpiLabel": "Total Revenue",
              "kpiSubLabel": "Q1 2023",
              "kpiPrefix": "$",
              "kpiSuffix": "",
              "kpiChange": 12.5,
              "kpiChangeDirection": "increase"
            }}
            ```
            
            Format your response as JSON with these exact keys.
            Your response should be strictly JSON, nothing else.
            """
            
            kpi_response = ai_service.process_query(context, kpi_query)
            try:
                kpi_data = json.loads(kpi_response)
                
                # Ensure the response conforms to ChartSpec interface
                chart_spec = {
                    "chartType": "kpi",
                    "title": kpi_data.get("kpiLabel", "Key Performance Indicator"),
                    "description": kpi_data.get("kpiSubLabel", "KPI Metric"),
                    "kpiValue": kpi_data.get("kpiValue", 0),
                    "kpiLabel": kpi_data.get("kpiLabel", "Metric"),
                    "kpiSubLabel": kpi_data.get("kpiSubLabel", "Performance Indicator"),
                    "kpiPrefix": kpi_data.get("kpiPrefix", ""),
                    "kpiSuffix": kpi_data.get("kpiSuffix", ""),
                    "kpiChange": kpi_data.get("kpiChange", 0),
                    "kpiChangeDirection": kpi_data.get("kpiChangeDirection", "flat"),
                    "kpiValueFormat": kpi_data.get("kpiValueFormat", ""),
                    "kpiChangeFormat": kpi_data.get("kpiChangeFormat", "+0.0%"),
                    "kpiStyles": {
                        "valueColor": "#3b82f6",  # blue
                        "labelColor": "#374151",  # gray-700
                        "subLabelColor": "#6b7280",  # gray-500
                        "changePositiveColor": "#10b981",  # green
                        "changeNegativeColor": "#ef4444",  # red
                        "changeFlatColor": "#6b7280",  # gray-500
                        "backgroundColor": "#ffffff",
                        "padding": "1.5rem",
                        "borderRadius": "0.5rem",
                        "fontSize": {
                            "value": "2.5rem",
                            "label": "1.125rem",
                            "change": "1rem"
                        }
                    },
                    "chartConfig": {}  # Add empty chartConfig even for KPI charts
                }
                
                # Log the final chart spec for debugging
                print(f"DEBUG - Final KPI chart spec: {json.dumps(chart_spec, indent=2, default=str)}")
                
                return [chart_spec]
            except:
                # Fallback in case JSON parsing fails
                chart_spec = {
                    "chartType": "kpi",
                    "title": "Key Performance Indicator",
                    "description": "KPI Metric",
                    "kpiValue": 0,
                    "kpiLabel": "Value",
                    "kpiSubLabel": "Performance Indicator",
                    "kpiPrefix": "",
                    "kpiSuffix": "",
                    "kpiChange": 0,
                    "kpiChangeDirection": "flat",
                    "kpiValueFormat": "",
                    "kpiChangeFormat": "+0.0%",
                    "kpiStyles": {
                        "valueColor": "#3b82f6",
                        "labelColor": "#374151",
                        "subLabelColor": "#6b7280",
                        "changePositiveColor": "#10b981",
                        "changeNegativeColor": "#ef4444",
                        "changeFlatColor": "#6b7280",
                        "backgroundColor": "#ffffff",
                        "padding": "1.5rem",
                        "borderRadius": "0.5rem",
                        "fontSize": {
                            "value": "2.5rem",
                            "label": "1.125rem",
                            "change": "1rem"
                        }
                    },
                    "chartConfig": {}  # Add empty chartConfig even for KPI fallback
                }
                
                # Log the final chart spec for debugging
                print(f"DEBUG - Final KPI fallback chart spec: {json.dumps(chart_spec, indent=2, default=str)}")
                
                return [chart_spec]
        else:
            # For line, bar, and area charts
            chart_query = f"""
            Given the following data: {data.head(10).to_string(index=False)}, 
            analyze it and create a {chart_type} chart that best answers this query: {query}
            
            Provide your response as strict JSON with these properties:
            - title: A descriptive title for the chart
            - description: A brief description of what the chart shows
            - xAxisDataKey: The column name to use for x-axis values
            - dataColumns: An array of column names to plot on the y-axis
            
            Here's an example of what your response should look like:
            ```
            {{
              "title": "Sales Growth by Region",
              "description": "Monthly sales figures across different regions",
              "xAxisDataKey": "month",
              "dataColumns": ["north_sales", "south_sales", "east_sales", "west_sales"]
            }}
            ```
            
            Your response should be strictly JSON, nothing else.
            """
            
            chart_response = ai_service.process_query(context, chart_query)
            try:
                chart_data = json.loads(chart_response)
                
                # Prepare data for the chart
                x_key = chart_data.get("xAxisDataKey", data.columns[0])
                data_cols = chart_data.get("dataColumns", [data.columns[1]])
                
                # If data_cols is provided as string, convert to list
                if isinstance(data_cols, str):
                    try:
                        data_cols = ast.literal_eval(data_cols)
                    except:
                        data_cols = [data_cols]
                
                # Ensure it's a list
                if not isinstance(data_cols, list):
                    data_cols = [data_cols]
                
                # Create the data array in the correct format
                chart_data_array = []
                for i in range(min(len(data), 100)):  # Limit to 100 data points
                    item = {}
                    try:
                        item[x_key] = data.iloc[i][x_key]
                        for col in data_cols:
                            if col in data.columns:
                                item[col] = data.iloc[i][col]
                        chart_data_array.append(item)
                    except:
                        continue
                
                # Create chart spec that strictly conforms to the ChartSpec interface
                chart_spec = {
                    "chartType": chart_type,
                    "title": chart_data.get("title", f"{chart_type.capitalize()} Chart"),
                    "description": chart_data.get("description", ""),
                    "data": chart_data_array,
                    "xAxisConfig": {
                        "dataKey": x_key
                    },
                    "chartConfig": {}  # Initialize empty chartConfig that will be populated later
                }
                
                # Add optional properties based on chart type
                if chart_type == "line":
                    chart_spec["lineType"] = "monotone"
                    chart_spec["dot"] = True
                    chart_spec["dateFormatTooltip"] = "MMM DD, YYYY"
                elif chart_type == "area":
                    chart_spec["stacked"] = True
                    chart_spec["lineType"] = "natural"
                    chart_spec["dateFormatTooltip"] = "MMM DD, YYYY"
                    chart_spec["dot"] = False
                    chart_spec["areaConfig"] = {
                        "useGradient": True,
                        "fillOpacity": 0.4,
                        "accessibilityLayer": True,
                        "gradientStops": {
                            "topOffset": "5%",
                            "bottomOffset": "95%",
                            "topOpacity": 0.8,
                            "bottomOpacity": 0.1
                        }
                    }
                    # Add yAxisConfig for area charts
                    chart_spec["yAxisConfig"] = {
                        "tickLine": False,
                        "axisLine": False,
                        "tickCount": 5
                    }
                elif chart_type == "bar":
                    chart_spec["barConfig"] = {
                        "radius": 4,
                        "fillOpacity": 0.8,
                        "accessibilityLayer": True
                    }
                    # Add yAxisConfig for bar charts
                    chart_spec["yAxisConfig"] = {
                        "tickLine": False,
                        "axisLine": False
                    }
                
                # Create a chartConfig for the data columns
                chartConfig = {}
                colors = [
                    "#3b82f6",  # blue
                    "#ef4444",  # red
                    "#10b981",  # green
                    "#f59e0b",  # amber
                    "#8b5cf6",  # purple
                    "#ec4899",  # pink
                    "#06b6d4",  # cyan
                    "#14b8a6",  # teal
                    "#f97316",  # orange
                    "#6366f1"   # indigo
                ]
                
                # Add color configuration for each data column
                for i, col in enumerate(data_cols):
                    if col in data.columns:
                        chartConfig[col] = {
                            "color": colors[i % len(colors)],
                            "label": col.replace("_", " ").title()
                        }
                
                # Add the chartConfig to the spec
                chart_spec["chartConfig"] = chartConfig
                
                # Ensure chartConfig is always present
                if "chartConfig" not in chart_spec or not chart_spec["chartConfig"]:
                    # Create a basic fallback chartConfig
                    chartConfig = {}
                    colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
                    
                    # Add color configuration for each data column
                    for i, col in enumerate(data_cols):
                        if col in data.columns:
                            chartConfig[col] = {
                                "color": colors[i % len(colors)],
                                "label": col.replace("_", " ").title()
                            }
                    
                    # If we couldn't create any entries, add at least one default
                    if not chartConfig and len(data.columns) > 1:
                        chartConfig[data.columns[1]] = {
                            "color": "#3b82f6",
                            "label": data.columns[1].replace("_", " ").title()
                        }
                    
                    chart_spec["chartConfig"] = chartConfig
                
                # Log the final chart spec for debugging
                print(f"DEBUG - Final chart spec: {json.dumps(chart_spec, indent=2, default=str)}")
                
                return [chart_spec]
            except Exception as e:
                print(f"Error creating chart: {e}")
                # Fallback with minimal valid chart spec
                chart_spec = {
                    "chartType": chart_type,
                    "title": f"{chart_type.capitalize()} Chart",
                    "description": f"Visualization of {data.columns[0]}",
                    "data": [],
                    "xAxisConfig": {
                        "dataKey": data.columns[0],
                        "tickLine": False,
                        "axisLine": False
                    },
                    "yAxisConfig": {
                        "tickLine": False,
                        "axisLine": False,
                        "tickCount": 5
                    }
                }
                
                # Create some fallback data
                try:
                    x_key = data.columns[0]
                    # Get up to 2 numeric columns for y-axis data
                    numeric_cols = [col for col in data.columns[1:3] if pd.api.types.is_numeric_dtype(data[col])]
                    if not numeric_cols and len(data.columns) > 1:
                        numeric_cols = [data.columns[1]]  # Fallback to first non-index column
                    
                    fallback_data = []
                    for i in range(min(5, len(data))):  # Just use 5 data points for fallback
                        item = {}
                        # Format date columns properly
                        if pd.api.types.is_datetime64_any_dtype(data[x_key]):
                            item[x_key] = data.iloc[i][x_key].isoformat()
                        else:
                            item[x_key] = data.iloc[i][x_key]
                        
                        # Add numeric data for each column
                        for col in numeric_cols:
                            if col in data.columns:
                                item[col] = float(data.iloc[i][col]) if pd.api.types.is_numeric_dtype(data[col]) else data.iloc[i][col]
                        fallback_data.append(item)
                    
                    if fallback_data:
                        chart_spec["data"] = fallback_data
                except Exception as e:
                    print(f"DEBUG - Error creating fallback data: {e}")
                
                # Create a basic chartConfig for the fallback
                chartConfig = {}
                colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
                
                try:
                    for i, col in enumerate(numeric_cols):
                        chartConfig[col] = {
                            "color": colors[i % len(colors)],
                            "label": col.replace("_", " ").title()
                        }
                except:
                    # If there's any error, create at least one chart config entry
                    if len(data.columns) > 1:
                        chartConfig[data.columns[1]] = {
                            "color": "#3b82f6",
                            "label": data.columns[1].replace("_", " ").title()
                        }
                
                chart_spec["chartConfig"] = chartConfig
                
                # Add type-specific properties based on chart type
                if chart_type == "line":
                    chart_spec["lineType"] = "monotone"
                    chart_spec["dot"] = True
                    chart_spec["dateFormatTooltip"] = "MMM DD, YYYY"
                elif chart_type == "area":
                    chart_spec["stacked"] = True
                    chart_spec["lineType"] = "natural"
                    chart_spec["dateFormatTooltip"] = "MMM DD, YYYY"
                    chart_spec["dot"] = False
                    chart_spec["areaConfig"] = {
                        "useGradient": True,
                        "fillOpacity": 0.4,
                        "accessibilityLayer": True,
                        "gradientStops": {
                            "topOffset": "5%",
                            "bottomOffset": "95%",
                            "topOpacity": 0.8,
                            "bottomOpacity": 0.1
                        }
                    }
                elif chart_type == "bar":
                    chart_spec["barConfig"] = {
                        "radius": 4,
                        "fillOpacity": 0.8,
                        "accessibilityLayer": True,
                        "truncateLabels": True,
                        "maxLabelLength": 15
                    }
                
                # Ensure chartConfig is always present
                if "chartConfig" not in chart_spec or not chart_spec["chartConfig"]:
                    # Create a basic fallback chartConfig
                    chartConfig = {}
                    colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]
                    
                    # Add color configuration for each data column
                    for i, col in enumerate(data_cols):
                        if col in data.columns:
                            chartConfig[col] = {
                                "color": colors[i % len(colors)],
                                "label": col.replace("_", " ").title()
                            }
                    
                    # If we couldn't create any entries, add at least one default
                    if not chartConfig and len(data.columns) > 1:
                        chartConfig[data.columns[1]] = {
                            "color": "#3b82f6",
                            "label": data.columns[1].replace("_", " ").title()
                        }
                    
                    chart_spec["chartConfig"] = chartConfig
                
                # Log the final chart spec for debugging
                print(f"DEBUG - Final chart spec: {json.dumps(chart_spec, indent=2, default=str)}")
                
                return [chart_spec]

def calculate(data, query, context, ai_service):
        calculation_output = []
        data_columns = data.columns
        final_query = f"Given a table with the following metadata: {data_columns} \
              I want you to generate a SQL code, trying to answer the following question: {query}. \
              Assume that the table name is 'data_table'. \
              Provide the SQL code only, and nothing else."
        response = ai_service.process_query(context, final_query)

        # Create an in-memory SQLite database
        conn = sqlite3.connect(":memory:")
        print(f"Calculate response: {response}")
        try:
            # Load the DataFrame into the SQLite database
            data.to_sql("data_table", conn, index=False, if_exists="replace")

            # Execute the SQL query
            result = pd.read_sql_query(response, conn)

            return result
        except Exception as e:
            print(f"Error executing SQL query: {e}")
            return None
        finally:
            # Close the connection
            conn.close()

        calculation_output.append(result)

        return calculation_output


def agentic_flow(data, user_query, ai_service):
    # Set analysis status to false at the start
    ai_service.set_analysis_complete(False)
    
    tools_funcs = {
    "validate_data": validate_data,
    "get_insights": get_insights,
    "visual": visualize,
    "calculate": calculate,
    }
    
    tools_explanation = {
        "validate_data": "Check for missing values, duplicates, and data types.",
        "get_insights": "Generate valuable business insights about the given data.",
        "visual": "Generate a visualization of the data.",
        "calculate": "Performs calculations based on a user question."
    }

    context = f"You are an experienced data analyst, expert in giving quality information and insights about various data types. \
        I will be giving you a dataset, and you will be providing quality deiliverables. You have the following tools available: {{tools}}. " \

    master_query = f"Given the following dataset: {{data}}, and the following user query: {{user_query}}? \
    I want you to decide which tool to use in order to answer the user query. " \
    "Print only the name of the tool and nothing else. " \
    "The tools are: {{tools}}. " \

    feedback_query = f"Given the user query {{user_query}}, you have used the following tools, producing the respective responses: \
        {{tool_responses}} \
        Do you have enough information to answer the user query, or are additional information missing?  \
        If yes, print 'yes' and nothing else. \
        If not, print only the name of the tool you need to use in order to answer the user query, and nothing else. Don't price NO in this case. \
        Available tools are {{tools}}. " 

    response_query = f"Given the user query {{user_query}}, you have used the following tools, producing the respective responses: \
        {{tool_responses}} \
        Using the above, please provide the user with a proper response. \
        Be as precise as possible, and only answer exactlt what is asked in the user query. \
        Don't mention any information about the tools you have used."  

    first_time_flag = True
    cur_response = None
    counter = 0

    tools_expl = ", ".join([f"{k}: {v}" for k, v in tools_explanation.items()])
    tools_responses = {}

    data_text = data.to_string(index=False)
    context_upd = context.format(tools=tools_expl)

    

    while True: 
        counter += 1
        if first_time_flag:
            first_time_flag = False
            cur_tool = ai_service.process_query(context_upd, master_query.format(data=data_text, user_query=user_query, tools=tools_expl)).replace("'", "")
            # print(f"Master query: {master_query.format(data=data_text, user_query=user_query)}")
            # print(f"Context: {context_upd}")
        else:
            tool_responses = ", ".join([f"Iteration {k}: Tool: {v[0]}, Response: {v[1]}" for k, v in tools_responses.items()])
            cur_tool = ai_service.process_query(context_upd, feedback_query.format(user_query=user_query, tool_responses=tool_responses, tools=tools_expl)).replace("'", "")
            
            if cur_tool == "yes":
                print("The tool has given you a proper response.")
                final_response = ai_service.process_query(context_upd, response_query.format(user_query=user_query, tool_responses=tool_responses))
                print(final_response)
                break
            elif len(tools_responses.keys()) >= 2:
                print("The tool has reached maximum amount of iterations.")
                final_response = ai_service.process_query(context_upd, response_query.format(user_query=user_query, tool_responses=tool_responses))
                print(final_response)
                break
            else:
                cur_tool = cur_tool.strip()
        
        print(f"Iteration {counter}")
        print(f"Using tool: {cur_tool}")
        cur_response = tools_funcs[cur_tool](data, user_query, context_upd, ai_service)
        tools_responses[str(counter)] = [cur_tool, cur_response]
        # print(f"Response: {cur_response}")
        
    
    response_dict = {
        "validation": "",
        "insights": "",
        "visual": "",
        "calculate": "",
    }
    response_dict["insights"] = final_response
    
    # Handle the special case for calculate tool
    if tools_responses.get(str(counter-1)) and tools_responses[str(counter-1)][0] == "calculate":
        # If it's a DataFrame, convert it to a serializable format
        calc_result = tools_responses[str(counter-1)][1]
        if hasattr(calc_result, 'to_dict'):  # Check if DataFrame-like
            response_dict["calculate"] = calc_result.to_dict()
        else:
            response_dict["calculate"] = calc_result
    else:
        # For other tools, just use the response as is
        if tools_responses.get(str(counter-1)):
            response_dict[tools_responses[str(counter-1)][0]] = tools_responses[str(counter-1)][1]

    for key, value in response_dict.items():
        if isinstance(value, np.ndarray):
            response_dict[key] = value.tolist()  # Convert numpy array to list
        elif isinstance(value, (np.int64, np.float64)):
            response_dict[key] = value.item()  # Convert numpy scalar to Python scalar

    # Set analysis status to complete
    ai_service.set_analysis_complete(True)

    return response_dict

