import pandas as pd
import base64
import io
import plotly.io as pio
import threading

def validate_data(data):
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
        if 'month' in data.columns:
            data['month'] = pd.to_datetime(data['month'], errors='coerce')
        return validation_output

def get_insights(data, ai_service):
        insights_output = []
        print("Going for insights")
        data_text = data.to_string(index=False)
        context = f"The following is the financial data for 2024:\n{data_text}"
        query = "Generate insights about the financial performance of the subsidiaries."
        response = ai_service.process_query(context, query)
        print(response)
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

def visualize(data, ai_service, query=None):
        if not query:
            query = "what is the monthly revenue per region"
        visualization_output = []
        viz_components = {
             "barchart": ["x", "y", "color", "title", "xaxis_title", "yaxis_title"],
             "piechart": ["values", "names", "title"],
                "scatter": ["x", "y", "color", "title", "xaxis_title", "yaxis_title"],
                "line": ["x", "y", "title", "xaxis_title", "yaxis_title"],
                "heatmap": ["z", "x", "y", "title", "xaxis_title", "yaxis_title"],
        }

        init_queries = [
             f"I want you to decide what's the best visualization type to use in order to answer the following question: {query} \
             Could be a barchart, piechart, scatter, line, or heatmap. \
                Print only the name of the visualization type and nothing else. ",

                f"Given the following data: {data.head(10).to_string(index=False)} I want you to give me the following components for a nice visualization \
                    Print only the components and nothing else in the following format: \
                    <component1>: <value1>, <component2>: <value2>, <component3>: <value3>, ...\n " 
    
        ]
        
        data_text = data.to_string(index=False)
        context = f"The following is the financial data for 2024:\n{data_text}"

        # First LLM Pass to get the visualization type
        query_type = ai_service.process_query(context, init_queries[0])

        if query_type not in viz_components.keys(): 
             query_type = "barchart"

        # Second LLM Pass to get the visualization components
        query_components = ai_service.process_query(context, init_queries[1] + "I am looking to creating a " + query_type + ". The components I need: " + str(viz_components[query_type]))
        # Transform the query components into a dictionary
        query_components = query_components.split(",") 
        query_components = [x.strip() for x in query_components]
        query_components = {k: v.split(": ")[1] for k, v in zip(viz_components[query_type], query_components)}

        visualization_output.append(query_components)
        
        return visualization_output