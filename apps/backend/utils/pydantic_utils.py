import asyncio
from dataclasses import dataclass
from datetime import date

from pydantic_ai import Agent
from pydantic_ai.messages import (
    FinalResultEvent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartStartEvent,
    TextPartDelta,
    ToolCallPartDelta,
)
from pydantic_ai.tools import RunContext

async def run_async_log_agent(
    agent: Agent, 
    user_prompt: str, 
    deps: list[BaseTool],
    response_token_limits: int = None,
    request_token_limits: int = None,
    request_limit: int = None,
    model_settings: dict = None,
    ):
    # Begin a node-by-node, streaming iteration
    try:
        async with agent.iter(
            user_prompt, 
            deps=deps,
            usage_limits=UsageLimits(
                response_tokens_limit=response_token_limits, 
                request_tokens_limit=request_token_limits,
                request_limit=request_limit),
            model_settings=model_settings,
            ) as run:
            async for node in run:
                if Agent.is_user_prompt_node(node):
                    # A user prompt node => The user has provided input
                    output_messages.append(f'=== UserPromptNode: {node.user_prompt} ===')
                elif Agent.is_model_request_node(node):
                    # A model request node => We can stream tokens from the model's request
                    output_messages.append(
                        '=== ModelRequestNode: streaming partial request tokens ==='
                    )
                    async with node.stream(run.ctx) as request_stream:
                        async for event in request_stream:
                            if isinstance(event, PartStartEvent):
                                output_messages.append(
                                    f'[Request] Starting part {event.index}: {event.part!r}'
                                )
                            elif isinstance(event, PartDeltaEvent):
                                if isinstance(event.delta, TextPartDelta):
                                    output_messages.append(
                                        f'[Request] Part {event.index} text delta: {event.delta.content_delta!r}'
                                    )
                                elif isinstance(event.delta, ToolCallPartDelta):
                                    output_messages.append(
                                        f'[Request] Part {event.index} args_delta={event.delta.args_delta}'
                                    )
                            elif isinstance(event, FinalResultEvent):
                                output_messages.append(
                                    f'[Result] The model produced a final output (tool_name={event.tool_name})'
                                )
                elif Agent.is_call_tools_node(node):
                    # A handle-response node => The model returned some data, potentially calls a tool
                    output_messages.append(
                        '=== CallToolsNode: streaming partial response & tool usage ==='
                    )
                    async with node.stream(run.ctx) as handle_stream:
                        async for event in handle_stream:
                            if isinstance(event, FunctionToolCallEvent):
                                output_messages.append(
                                    f'[Tools] The LLM calls tool={event.part.tool_name!r} with args={event.part.args} (tool_call_id={event.part.tool_call_id!r})'
                                )
                            elif isinstance(event, FunctionToolResultEvent):
                                output_messages.append(
                                    f'[Tools] Tool call {event.tool_call_id!r} returned => {event.result.content}'
                                )
                elif Agent.is_end_node(node):
                    assert run.result.output == node.data.output
                    # Once an End node is reached, the agent run is complete
                    output_messages.append(
                        f'=== Final Agent Output: {run.result.output} ==='
                    )
            return {"output": run.result.output, "usage": agent.usage()}
    
    except UsageLimitExceeded as e:
        print(e)

    except UnexpectedModelBehavior as e:
        print('An error occurred:', e)
        #> An error occurred: Tool exceeded max retries count of 1
        print('cause:', repr(e.__cause__))
        #> cause: ModelRetry('Please try again.')
        print('messages:', messages)
