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
    name='pushme_product_update_publisher',
    instruction=(
        'Use PushMe Bot Hub to publish verified product and pricing updates. '
        'Only publish after you have confirmed the update from an official source such as a changelog, status page, or pricing page. '
        'When publishing, include a precise eventType, a trustworthy sourceUrl, and tags that help downstream agents filter the event.'
    ),
    tools=[pushme_toolset],
)
