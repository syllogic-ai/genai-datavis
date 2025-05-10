# Logfire Integration Guide for GenAI DataVis

This guide explains how to use Logfire to monitor the multi-agent system in GenAI DataVis.

## Overview

We've integrated [Logfire](https://logfire.pydantic.dev/docs/) for comprehensive observability across our application, with a focus on monitoring our AI agent executions. Logfire provides insights into:

- Agent invocations and performance
- SQL generation and execution
- Business insights generation
- HTTP request handling
- Error tracking and monitoring
- Database operations

## Setup for Development

To set up Logfire in your development environment:

1. Install the Logfire CLI:

```bash
pip install logfire
```

2. Authenticate with Logfire:

```bash
logfire auth
```

3. Set up your project:

```bash
logfire projects use <your-project-name>
```

## Setting up for Production

For production environments, you need to create a write token:

1. Generate a token in the Logfire web interface:
   - Go to Project → Settings → Write Tokens
   - Follow the prompts to create a new token

2. Set the token in your environment:

```bash
export LOGFIRE_TOKEN=<your-write-token>
```

Or add it to your `.env.local` file:

```
LOGFIRE_TOKEN=<your-write-token>
```

## Monitoring Agent Invocations

We've added Logfire tracing to all agent functions in our multi-agent system. Each agent invocation is now automatically logged with:

- Execution time
- Input parameters (user prompt, chart ID, etc.)
- Output results
- Any errors encountered

### Key Metrics to Monitor

1. **Agent Performance**
   - Execution time of each agent function
   - Success/failure rates
   - Error types and frequencies

2. **SQL Generation and Execution**
   - SQL query complexity
   - SQL execution time
   - Result size

3. **Business Insights**
   - Generation time
   - Quality metrics (based on validation)

## Using the Logfire Web UI

The Logfire Web UI provides several views to help you monitor your application:

1. **Live View**: Real-time monitoring of agent invocations and errors
2. **Dashboards**: Create custom dashboards to track key metrics
3. **Alerts**: Set up alerts based on thresholds (e.g., high error rates, slow responses)
4. **SQL Explorer**: Run custom queries against your Logfire data

## Adding Custom Logging

You can add additional logging in your code:

```python
import logfire

# Log info events
logfire.info("User request processed", 
             user_id="123", 
             processing_time=1.5)

# Log warnings
logfire.warn("Unusual pattern detected", 
             details="Anomaly in data")

# Log errors
logfire.error("Operation failed", 
              error="Database connection timed out")
```

## Tracing Spans for Performance Analysis

For more detailed performance analysis, use spans to track function execution:

```python
from logfire import span

@span(name="my_function")
def my_function():
    # Function logic here
    pass

# Or use context manager
with logfire.span(name="complex_operation"):
    # Complex operations here
    pass
```

## Health Monitoring

The application includes a `/health` endpoint that reports the health status of all services. This is automatically logged to Logfire for monitoring.

## Troubleshooting

If you encounter issues with Logfire:

1. Check that Logfire is properly authenticated:
   ```bash
   logfire auth status
   ```

2. Verify the environment variables:
   ```bash
   echo $LOGFIRE_TOKEN  # For production
   ```

3. Check the Logfire documentation for more advanced troubleshooting:
   https://logfire.pydantic.dev/docs/ 