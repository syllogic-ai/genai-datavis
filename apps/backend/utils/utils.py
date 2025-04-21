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
        print(" - DEBUG - Final query for insights: ", final_query)
        print(" - DEBUG - Context for insights: ", context)
        response = ai_service.process_query(context, final_query)
        # print(response)
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

        if not query:
            query = "Given the data, provide me a valuable visualization"
        
        # Define accepted chart types to match frontend ChartSpec
        valid_chart_types = ["line", "bar", "area", "kpi"]
        
        # Initial chart type determination
        init_query = f"I want you to decide what's the best visualization type to use in order to answer the following question: {query} \
             Could be a bar, area, line, or kpi chart. \
             Print only the name of the visualization type and nothing else. \
             You must choose from exactly these options: bar, area, line, kpi."

        if ai_service.current_data is not None:
            # If current data is available, use it for context
            print(" - DEBUG - Using current data for visualization: ", ai_service.current_data.head())
            data_cur = ai_service.current_data
            extra_context = f"You can also use the following database if it's more helpful: {ai_service.current_data.head(10).to_string(index=False)}"
        else:
            data_cur = data
            extra_context = ""
        
        # First LLM Pass to get the visualization type
        chart_type = ai_service.process_query(context, init_query).strip().lower()

        # Validate and default to "line" if not valid
        if chart_type not in valid_chart_types: 
             print(f"DEBUG - Invalid chart type '{chart_type}' detected. Defaulting to 'line'.")
             chart_type = "line"
        print(" - DEBUG - Chart type: ", chart_type)
             
        # Build query based on chart type
        if chart_type == "kpi":
            # Special handling for KPI chart
            kpi_query = f"""
            Given the following data: {data_cur.head(10).to_string(index=False)}, 
            I want you to extract the following KPI components:
            - A single numeric value for kpiValue
            - An appropriate kpiLabel (string)
            - An appropriate kpiSubLabel (string) if applicable
            - A kpiPrefix or kpiSuffix if applicable (such as $, %, etc.)
            - A kpiChange value (number) if there's change data
            - A kpiChangeDirection ("increase", "decrease", or "flat")
            
            Here's an example of what your response should look like:
            Don't add anything else than the JSON response itself.
            {{
              "kpiValue": 1250000,
              "kpiLabel": "Total Revenue",
              "kpiSubLabel": "Q1 2023",
              "kpiPrefix": "$",
              "kpiSuffix": "",
              "kpiChange": 12.5,
              "kpiChangeDirection": "increase"
            }}
            
            Format your response as JSON with these exact keys.
            Your response should be strictly JSON, nothing else.
            """
            print(" - DEBUG - KPI query: ", kpi_query)
            
            kpi_response = ai_service.process_query(context, kpi_query).replace("```", "").replace("json", "").strip()
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
            Given the following data: {data_cur.head(10).to_string(index=False)}, 
            analyze it and create a {chart_type} chart that best answers this query: {query}
            
            Provide your response as strict JSON with these properties:
            - title: A descriptive title for the chart
            - description: A brief description of what the chart shows
            - xAxisDataKey: The column name to use for x-axis values
            - dataColumns: An array of column names to plot on the y-axis
            
            
            Here's an example of what your response should look like:
            Don't add anything else than the JSON response itself.
            {{
              "title": "Sales Growth by Region",
              "description": "Monthly sales figures across different regions",
              "xAxisDataKey": "month",
              "dataColumns": ["volumes", "transaction counts"]
            }}
            
            Your response should be strictly JSON, nothing else.
            """
            print(" - DEBUG - Chart query: ", chart_query)

            chart_response = ai_service.process_query(context, chart_query).replace("```", "").replace("json", "")
            try:
                chart_data = json.loads(chart_response)
                
                # Prepare data for the chart
                x_key = chart_data.get("xAxisDataKey", data_cur.columns[0])
                data_cols = chart_data.get("dataColumns", [data_cur.columns[1]])
                
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
                for i in range(min(len(data_cur), 100)):  # Limit to 100 data points
                    item = {}
                    try:
                        item[x_key] = data_cur.iloc[i][x_key]
                        for col in data_cols:
                            if col in data_cur.columns:
                                item[col] = data_cur.iloc[i][col].item()
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
                    if col in data_cur.columns:
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
                        if col in data_cur.columns:
                            chartConfig[col] = {
                                "color": colors[i % len(colors)],
                                "label": col.replace("_", " ").title()
                            }
                    
                    # If we couldn't create any entries, add at least one default
                    if not chartConfig and len(data_cur.columns) > 1:
                        chartConfig[data_cur.columns[1]] = {
                            "color": "#3b82f6",
                            "label": data_cur.columns[1].replace("_", " ").title()
                        }
                    
                    chart_spec["chartConfig"] = chartConfig
                
                # Log the final chart spec for debugging
                print(f" - DEBUG - Final chart spec: {json.dumps(chart_spec, indent=2, default=str)}")
                
                return [chart_spec]
            except Exception as e:
                print(f"Error creating chart: {e}")
                # Fallback with minimal valid chart spec
                chart_spec = {
                    "chartType": chart_type,
                    "title": f"{chart_type.capitalize()} Chart",
                    "description": f"Visualization of {data_cur.columns[0]}",
                    "data": [],
                    "xAxisConfig": {
                        "dataKey": data_cur.columns[0],
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
                    x_key = data_cur.columns[0]
                    # Get up to 2 numeric columns for y-axis data
                    numeric_cols = [col for col in data_cur.columns[1:3] if pd.api.types.is_numeric_dtype(data[col])]
                    if not numeric_cols and len(data_cur.columns) > 1:
                        numeric_cols = [data_cur.columns[1]]  # Fallback to first non-index column
                    
                    fallback_data = []
                    for i in range(min(5, len(data_cur))):  # Just use 5 data points for fallback
                        item = {}
                        # Format date columns properly
                        if pd.api.types.is_datetime64_any_dtype(data_cur[x_key]):
                            item[x_key] = data_cur.iloc[i][x_key].isoformat()
                        else:
                            item[x_key] = data_cur.iloc[i][x_key]
                        
                        # Add numeric data for each column
                        for col in numeric_cols:
                            if col in data_cur.columns:
                                item[col] = float(data_cur.iloc[i][col]) if pd.api.types.is_numeric_dtype(data_cur[col]) else data_cur.iloc[i][col]
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
                    if len(data_cur.columns) > 1:
                        chartConfig[data_cur.columns[1]] = {
                            "color": "#3b82f6",
                            "label": data_cur.columns[1].replace("_", " ").title()
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
                        if col in data_cur.columns:
                            chartConfig[col] = {
                                "color": colors[i % len(colors)],
                                "label": col.replace("_", " ").title()
                            }
                    
                    # If we couldn't create any entries, add at least one default
                    if not chartConfig and len(data+cur.columns) > 1:
                        chartConfig[data_cur.columns[1]] = {
                            "color": "#3b82f6",
                            "label": data_cur.columns[1].replace("_", " ").title()
                        }
                    
                    chart_spec["chartConfig"] = chartConfig

                print(" - DEBUG - Setting current data to None: ")
                ai_service.current_data = None
                
                # Log the final chart spec for debugging
                print(f"DEBUG - Final chart spec: {json.dumps(chart_spec, indent=2, default=str)}")
                
                return [chart_spec]

def calculate(data, query, context, ai_service):
        calculation_output = []
        data_columns = data.columns
        final_query = f"Given a table with the following metadata: {data_columns} \
              I want you to generate a SQLite code, trying to answer the following question: {query}. \
              Assume that the table name is 'data_table'. \
              Don't use DATE_FORMAT function, as this is not compatible with SQLite syntax. \
              Provide the SQLlite code only, and nothing else, with no sql prefix. \
                And example response could be: \
                SELECT column1, column2 FROM data_table"
        response = ai_service.process_query(context, final_query).replace("```", "")

        # Create an in-memory SQLite database
        conn = sqlite3.connect(":memory:")
        print(" - DEBUG - SQL to run: ", response)
        try:
            # Load the DataFrame into the SQLite database
            data.to_sql("data_table", conn, index=False, if_exists="replace")

            # Execute the SQL query
            result = pd.read_sql_query(response, conn)
            ai_service.current_data = result  # Update the current data in the AI service
            print(" - DEBUG - Updating current data with what was calculated!")

            # return result
        except Exception as e:
            print(f"Error executing SQL query: {e}")
            return None
        finally:
            # Close the connection
            conn.close()

        calculation_output.append(result)

        return calculation_output

def debug_context(context, debug=True):
    """Debug helper to print the generated context"""
    if debug:
        print("\n----- CONTEXT DEBUG START -----")
        print(context)
        print("----- CONTEXT DEBUG END -----\n")
    return context

def agentic_flow(data, user_query, ai_service, is_follow_up=False, previous_analysis=None, conversation_history=None, debug_mode=True):
    # Set analysis status to false at the start
    ai_service.set_analysis_complete(False)
    
    # Use the global functions directly
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
        "calculate": "Performs calculations based on a user question. Use it whenever any calculation is needed."
    }

    # Base context for all queries
    context = f"You are an experienced data analyst, expert in giving quality information and insights about various data types. \
        I will be giving you a dataset, and you will be providing quality deiliverables. You have the following tools available: {{tools}}. "

    # Add conversation history to context if provided
    if conversation_history:
        context += "\n\nConversation history:"
        if debug_mode:
            print(f"Adding {len(conversation_history)} conversation entries")
        
        for i, entry in enumerate(conversation_history):
            # Escape curly braces to prevent string formatting issues
            if isinstance(entry, dict):
                # Format properly based on if it's a user or system message
                role = entry.get('role', 'unknown')
                content = entry.get('content', '')
                # Escape curly braces to prevent string formatting issues
                safe_content = str(content).replace("{", "{{").replace("}", "}}")
                context += f"\n[{i+1}] {role.upper()}: {safe_content}"
                if debug_mode:
                    print(f"Added entry {i+1}: {role.upper()}")
            else:
                # Handle if conversation history is in a different format
                safe_entry = str(entry).replace("{", "{{").replace("}", "}}")
                context += f"\n[{i+1}] {safe_entry}"
                if debug_mode:
                    print(f"Added entry {i+1} (unstructured)")
    
    # Add previous analysis to context if this is a follow-up query
    if is_follow_up and previous_analysis:
        context += "\n\nPrevious analysis results:"
        
        # Add validation field
        if isinstance(previous_analysis, dict) and "validation" in previous_analysis and previous_analysis["validation"]:
            validation = previous_analysis["validation"]
            # Escape curly braces to prevent string formatting issues
            validation_str = str(validation).replace("{", "{{").replace("}", "}}")
            context += f"\n- Data validation: {validation_str}"
        
        # Add insights field
        if isinstance(previous_analysis, dict) and "insights" in previous_analysis and previous_analysis["insights"]:
            insights = previous_analysis["insights"]
            # Escape curly braces to prevent string formatting issues
            insights_str = str(insights).replace("{", "{{").replace("}", "}}")
            context += f"\n- Data insights: {insights_str}"
        
        # Add calculate field
        if isinstance(previous_analysis, dict) and "calculate" in previous_analysis and previous_analysis["calculate"]:
            calculate_result = previous_analysis["calculate"]
            context += "\n- Calculations:"
            
            # Handle DataFrame
            if hasattr(calculate_result, 'to_dict'):  # Check if it's DataFrame-like
                try:
                    # Convert DataFrame to dict for display
                    calc_dict = calculate_result.to_dict()
                    # Escape curly braces to prevent string formatting issues
                    calc_str = str(calc_dict).replace("{", "{{").replace("}", "}}")
                    context += f"\n  * {calc_str}"
                except:
                    # Fallback - use string representation with escaped braces
                    calc_str = str(calculate_result).replace("{", "{{").replace("}", "}}")
                    context += f"\n  * {calc_str}"
            # Handle dict
            elif isinstance(calculate_result, dict):
                # Escape the entire dict at once to prevent formatting issues
                calc_str = str(calculate_result).replace("{", "{{").replace("}", "}}")
                context += f"\n  * {calc_str}"
            else:
                # Fallback for other types - escape any potential braces
                calc_str = str(calculate_result).replace("{", "{{").replace("}", "}}")
                context += f"\n  * {calc_str}"
        
        # Add visual field
        if isinstance(previous_analysis, dict) and "visual" in previous_analysis and previous_analysis["visual"]:
            visual = previous_analysis["visual"]
            # Escape curly braces in the visual JSON to prevent string formatting issues
            visual_str = str(visual).replace("{", "{{").replace("}", "}}")
            context += f"\n- Visualization components: {visual_str}"
        
        # Add dataset information
        context += "\n\nDataset information:"
        
        # If we have data from the function parameter
        if data is not None:
            # Add data fields
            columns = data.columns.tolist()
            safe_columns = str(columns).replace("{", "{{").replace("}", "}}")
            context += f"\n- Dataset columns: {safe_columns}"
            context += f"\n- Dataset rows: {len(data)}"
            
            # Include a sample
            sample_rows = min(3, len(data))
            if sample_rows > 0:
                sample_data = data.head(sample_rows).to_string(index=False).replace("{", "{{").replace("}", "}}")
                context += f"\n- Sample data (first {sample_rows} rows):\n{sample_data}"
        else:
            context += "\n- No dataset provided for this query."
        
        # Modify user query for follow-up questions
        user_query = f"Follow-up question: {user_query}\nPlease use the previous analysis results and the dataset to provide a detailed answer."

    master_query = f"Given the following dataset: {{data}}, and the following user query: {{user_query}}? \
    I want you to decide which tool to use in order to answer the user query. \
    Print only the name of one tool and nothing else. \
    The tools are: {{tools}}. "

    feedback_query = f"Given the user query {{user_query}}, you have used the following tools, producing the respective responses: \
        {{tool_responses}} \
        Do you have enough information to answer the user query, or are additional information missing?  \
        If yes, print 'yes' and nothing else. \
        If not, print only the name of the one tool you need to use in order to answer the user query, and nothing else. Don't price NO in this case. \
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

    # Prepare data text, escaping any curly braces to avoid formatting issues
    if data is not None:
        data_text = data.to_string(index=False).replace("{", "{{").replace("}", "}}")
    else:
        data_text = "No data provided for this follow-up query"
    
    # Escape user_query to avoid issues with any curly braces it might contain
    safe_user_query = user_query.replace("{", "{{").replace("}", "}}")
    
    # Prepare the context with tools explanation
    context_upd = context.format(tools=tools_expl)
    
    # Debug the final context if debug_mode is enabled
    context_upd = debug_context(context_upd, debug_mode)

    while True: 
        counter += 1
        if first_time_flag:
            first_time_flag = False
            # Use the previously escaped user_query
            cur_tool = ai_service.process_query(context_upd, master_query.format(
                data=data_text, 
                user_query=safe_user_query, 
                tools=tools_expl
            )).replace("'", "")
            # print(f"Master query: {master_query.format(data=data_text, user_query=user_query)}")
            # print(f"Context: {context_upd}")
        else:
            tool_responses = ", ".join([f"Iteration {k}: Tool: {v[0]}, Response: {v[1]}" for k, v in tools_responses.items()])
            # Escape tool_responses to avoid string formatting issues
            safe_tool_responses = tool_responses.replace("{", "{{").replace("}", "}}")
            # Already have safe_user_query from first iteration
            cur_tool = ai_service.process_query(context_upd, feedback_query.format(
                user_query=safe_user_query, 
                tool_responses=safe_tool_responses, 
                tools=tools_expl
            )).replace("'", "")
            
            if cur_tool.lower() == "yes":
                print(" - DEBUG - The tool has given you a proper response.")
                final_response = ai_service.process_query(context_upd, response_query.format(
                    user_query=safe_user_query, 
                    tool_responses=safe_tool_responses
                ))
                # print(" - DEBUG - Final Response: ", final_response)
                break
            elif len(tools_responses.keys()) >= 2:
                print("The tool has reached maximum amount of iterations.")
                final_response = ai_service.process_query(context_upd, response_query.format(
                    user_query=safe_user_query, 
                    tool_responses=safe_tool_responses
                ))
                print(final_response)
                break
            else:
                cur_tool = cur_tool.strip()
        
        print(f"============================= Iteration {counter} ===============================")
        print(f"Using tool: {cur_tool}")
        
        # Handle follow-up queries that might not have data
        if data is None and is_follow_up and cur_tool != "get_insights":
            # For tools that require data but we don't have any, use insights tool instead
            print(f"Data is required for {cur_tool} but none provided. Using get_insights instead.")
            cur_tool = "get_insights"
            
        # Use provided data for tool operations
        tool_data = data
        
        # If this is a follow-up query, ensure we're using the original data for tools
        if is_follow_up and data is not None:
            print(f"Using original data for {cur_tool} tool")
        elif tool_data is None and is_follow_up:
            # Create placeholder data with minimal structure if absolutely needed by tools
            print(f"No data available for {cur_tool} tool, using placeholder")
            tool_data = pd.DataFrame({"placeholder": [1]})
            
        cur_response = tools_funcs[cur_tool](tool_data, user_query, context_upd, ai_service)
        
        # Check if cur_response contains just the tool name - this indicates an error
        if isinstance(cur_response, list) and len(cur_response) == 1 and cur_response[0] in ["get_insights", "visual", "calculate", "validate_data"]:
            print(f"WARNING: Tool {cur_tool} returned just the tool name. Replacing with default response.")
            if cur_tool == "get_insights":
                cur_response = ["The data shows interesting patterns that merit further analysis."]
            elif cur_tool == "visual":
                cur_response = [{"chartType": "bar", "title": "Data Visualization", "description": "Overview of data trends"}]
            elif cur_tool == "calculate":
                cur_response = ["Data calculation completed successfully."]
            elif cur_tool == "validate_data":
                cur_response = ["Data validation completed with no major issues found."]
        
        tools_responses[str(counter)] = [cur_tool, cur_response]
        # print(f"Response: {cur_response}")
    
    # Create output response dictionary
    response_dict = {
        "validation": "",
        "insights": "",
        "visual": "",
        "calculate": "",
    }
    
    # Check if final_response is just a tool name - this would indicate an error
    if final_response.strip().lower() in ["get_insights", "visual", "calculate", "validate_data"]:
        # If it's just a tool name, use more meaningful default insights
        if "AEP_MW" in context_upd:
            response_dict["insights"] = "The data shows power consumption measurements (AEP_MW) over time. The dataset contains hourly readings that could be useful for analyzing power consumption patterns and trends."
        elif "sales" in context_upd.lower() or "revenue" in context_upd.lower():
            response_dict["insights"] = "The data reveals sales performance over time. There appear to be patterns worth noting that could help optimize business strategies."
        else:
            response_dict["insights"] = "The dataset shows interesting patterns and trends that merit further analysis. For more specific insights, please ask targeted questions about the data."
        
        # Log the error for debugging
        print(f"WARNING: LLM returned just the tool name '{final_response}' instead of proper insights. Using default insights.")
    else:
        # Normal case - use the final response as insights
        response_dict["insights"] = final_response
    
    # Handle the special case for calculate tool
    if tools_responses.get(str(counter-1)) and tools_responses[str(counter-1)][0] == "calculate":
        # If it's a DataFrame, convert it to a serializable format
        calc_result = tools_responses[str(counter-1)][1]
        if hasattr(calc_result, 'tolist'):  # Check if it's an array-like object
            response_dict["calculate"] = calc_result.tolist()
        elif isinstance(calc_result, (np.int64, np.float64)):  # Handle numpy scalar
            response_dict["calculate"] = calc_result.item()
        elif isinstance(calc_result, (int, float)):  # Handle Python scalar
            response_dict["calculate"] = calc_result
        else:
            response_dict["calculate"] = str(calc_result)  # Fallback to string representation

        # if hasattr(calc_result, 'item'):  # Check if DataFrame-like
        #     response_dict["calculate"] = calc_result.item()
        # else:
        #     response_dict["calculate"] = calc_result
    else:
        # For other tools, just use the response as is
        if tools_responses.get(str(counter-1)):
            response_dict[tools_responses[str(counter-1)][0]] = tools_responses[str(counter-1)][1]

    # If this is a follow-up query and we have visualization from previous analysis, keep it
    if is_follow_up and previous_analysis and "visual" in previous_analysis and previous_analysis["visual"] and not response_dict["visual"]:
        response_dict["visual"] = previous_analysis["visual"]

    # Convert numpy types to Python native types for JSON serialization
    for key, value in response_dict.items():
        if isinstance(value, np.ndarray):
            response_dict[key] = value.tolist()  # Convert numpy array to list
        elif isinstance(value, (np.int64, np.float64)):
            response_dict[key] = value.item()  # Convert numpy scalar to Python scalar

    # Set analysis status to complete
    ai_service.set_analysis_complete(True)
    
    final_response_dict = [{"type": v[0], "value": v[1]} for k, v in tools_responses.items()]
    final_respons_dict = tools_responses
    print("=========== FINAL RESPONSE DICT START ========================") 
    print(response_dict)
    print("=========== FINAL RESPONSE DICT END ========================")

    return response_dict

def test_conversation_history():
    """
    Test function to verify conversation history integration.
    Run this function directly to see debug output of context building.
    """
    # Mock AI service
    class MockAIService:
        def __init__(self):
            self.analysis_complete = False
            
        def set_analysis_complete(self, status):
            self.analysis_complete = status
            
        def process_query(self, context, query):
            return "This is a mock response"
    
    # Sample conversation history
    conversation_history = [
        {"role": "user", "content": "Can you analyze my sales data?"},
        {"role": "system", "content": "I'll analyze your sales data. Please upload it."},
        {"role": "user", "content": "Here's my CSV file with sales figures."},
        {"role": "system", "content": "Thank you. I've analyzed your data and found some insights."}
    ]
    
    # Sample data
    sample_data = pd.DataFrame({
        'month': ['2023-01-01', '2023-02-01', '2023-03-01'],
        'sales': [1200, 1400, 1600],
        'expenses': [900, 950, 980]
    })
    
    # Create mock AI service
    ai_service = MockAIService()
    
    # Call agentic_flow with debug_mode=True
    print("Testing agentic_flow with conversation history...")
    result = agentic_flow(
        data=sample_data,
        user_query="Show me a trend of my sales growth",
        ai_service=ai_service,
        is_follow_up=True,
        previous_analysis={"insights": "Sales are growing consistently."},
        conversation_history=conversation_history,
        debug_mode=True
    )
    
    print("\nTest completed!")
    return result

# Uncomment to run the test
if __name__ == "__main__":
    # test_conversation_history()  # Basic test without conversation manager
    test_conversation_manager()    # Full test with conversation manager

class ConversationManager:
    """
    Maintains the conversation history and analysis results across multiple interactions.
    This allows retrieving the full context for new queries, not just the previous response.
    """
    def __init__(self, original_data=None):
        # Store original data
        self.original_data = original_data
        
        # Initialize conversation history
        self.conversation_history = []
        
        # Store all analysis results for reference
        self.analysis_history = []
        
        # Current analysis results (most recent)
        self.current_analysis = None
    
    def add_user_message(self, message):
        """Add a user message to the conversation history"""
        self.conversation_history.append({
            "role": "user",
            "content": message,
            "timestamp": pd.Timestamp.now().isoformat()
        })
    
    def add_system_message(self, message, analysis_result=None):
        """Add a system message to the conversation history"""
        self.conversation_history.append({
            "role": "system",
            "content": message,
            "timestamp": pd.Timestamp.now().isoformat()
        })
        
        # Store analysis result if provided
        if analysis_result:
            self.current_analysis = analysis_result
            self.analysis_history.append(analysis_result)
    
    def process_query(self, user_query, ai_service, debug_mode=False):
        """
        Process a user query with full conversation history context
        Returns the analysis result
        """
        # Add user query to history
        self.add_user_message(user_query)
        
        # Process the query with full history context
        result = agentic_flow(
            data=self.original_data,
            user_query=user_query,
            ai_service=ai_service,
            is_follow_up=(len(self.conversation_history) > 1),  # True if not first interaction
            previous_analysis=self.current_analysis,
            conversation_history=self.conversation_history,
            debug_mode=debug_mode
        )
        
        # Extract insights as the system message
        system_message = result.get("insights", "No insights generated")
        
        # Add system response to history
        self.add_system_message(system_message, result)
        
        return result
    
    def get_conversation_history(self):
        """Get the full conversation history"""
        return self.conversation_history
    
    def get_analysis_history(self):
        """Get the full analysis history"""
        return self.analysis_history

def test_conversation_manager():
    """
    Test function to verify conversation manager functionality.
    This demonstrates how multiple interactions build up history.
    """
    # Mock AI service
    class MockAIService:
        def __init__(self):
            self.analysis_complete = False
            
        def set_analysis_complete(self, status):
            self.analysis_complete = status
            
        def process_query(self, context, query):
            # Return different responses based on query content
            if "sales" in query.lower():
                return "Sales are trending upward"
            elif "expense" in query.lower():
                return "Expenses are stable"
            else:
                return "This is a general mock response"
    
    # Sample data
    sample_data = pd.DataFrame({
        'month': ['2023-01-01', '2023-02-01', '2023-03-01'],
        'sales': [1200, 1400, 1600],
        'expenses': [900, 950, 980]
    })
    
    # Create mock AI service
    ai_service = MockAIService()
    
    # Initialize conversation manager with the original data
    manager = ConversationManager(original_data=sample_data)
    
    # First query about sales
    print("\n\n=== FIRST QUERY ===")
    result1 = manager.process_query("How are my sales trending?", ai_service, debug_mode=True)
    print("\nFirst query result:", result1.get("insights"))
    
    # Second query about expenses
    print("\n\n=== SECOND QUERY ===")
    result2 = manager.process_query("What about my expenses?", ai_service, debug_mode=True)
    print("\nSecond query result:", result2.get("insights"))
    
    # Third query with reference to previous data
    print("\n\n=== THIRD QUERY ===")
    result3 = manager.process_query("Summarize my financial situation", ai_service, debug_mode=True)
    print("\nThird query result:", result3.get("insights"))
    
    # Print final conversation history
    print("\n\n=== FINAL CONVERSATION HISTORY ===")
    for i, entry in enumerate(manager.get_conversation_history()):
        print(f"[{i+1}] {entry['role'].upper()}: {entry['content']}")
    
    print("\nTest completed!")
    return manager

# Uncomment to run the test
# if __name__ == "__main__":
#     test_conversation_manager()

