import pandas as pd
import base64
import io
import plotly.io as pio
import threading
import sqlite3
import numpy as np

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

def visualize(data, query, context, ai_service):
        if not query:
            query = "Given the data, provide me a valuable visualization"
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
        # context = f"The following is the financial data for 2024:\n{data_text}"

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
    response_dict[tools_responses[str(counter-1)][0]] = tools_responses[str(counter-1)][1]

    for key, value in response_dict.items():
        if isinstance(value, np.ndarray):
            response_dict[key] = value.tolist()  # Convert numpy array to list
        elif isinstance(value, (np.int64, np.float64)):
            response_dict[key] = value.item()  # Convert numpy scalar to Python scalar

    return response_dict
