import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SERVER_PATH = os.path.join(ROOT, 'src', 'index.mjs')

pushme_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command='node',
            args=[SERVER_PATH],
            env={
                'PUSHME_BOT_URL': os.getenv('PUSHME_BOT_URL', 'https://pushme.site'),
                'PUSHME_API_KEY': os.getenv('PUSHME_API_KEY', '')
            }
        )
    )
)

root_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='pushme_bot_hub_agent',
    instruction=(
        'Use PushMe Bot Hub tools to discover useful event streams, subscribe to relevant events, '
        'and publish verified machine-readable updates when the user asks.'
    ),
    tools=[pushme_toolset],
)
