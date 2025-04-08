from crewai import Agent, Crew, Task, Process
from crewai_tools import TXTSearchTool, WebsiteSearchTool
from crewai.knowledge.source.text_file_knowledge_source import TextFileKnowledgeSource
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
import yaml
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging
import urllib3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure SSL warning suppression (only for development)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

class Message(BaseModel):
    role: str
    content: str

class ChatbotService:
    def __init__(self):
        print("\n=== CHATBOT SERVICE INITIALIZATION ===")
        
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            model_name="gpt-4o-mini",
            temperature=0.2,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Load configurations
        self.load_configs()
        
        # Initialize TextFileKnowledgeSource
        self.text_source = TextFileKnowledgeSource(
            file_paths=["../knowledge/knowledge_base.txt"]
        )
        
        # Initialize WebsiteSearchTool with enhanced configuration
        self.website_search_tool = WebsiteSearchTool(
            requests_kwargs={
                "verify": False,  # Disable SSL verification
                "timeout": 30,    # Increase timeout
                "headers": {      # Add user agent
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            }
        )

        # Add error handling for website search
        def website_search_with_retry(self, query: str, max_retries: int = 3) -> str:
            """Search website with retry mechanism"""
            for attempt in range(max_retries):
                try:
                    result = self.website_search_tool.search(query)
                    if result:
                        return result
                    logger.warning(f"Empty result on attempt {attempt + 1}")
                except Exception as e:
                    logger.error(f"Error on attempt {attempt + 1}: {str(e)}")
                    if attempt == max_retries - 1:
                        raise
            return "Unable to fetch data from the website"

        # Initialize TXTSearchTool for local file search capability
        self.knowledge_tool = TXTSearchTool(txt='../knowledge/knowledge_base.txt')

        # Add text_source to the research agent
        self.research_agent_knowledge_sources = [self.text_source]

    def load_configs(self):
        """Load agent and task configurations from YAML files"""
        config_dir = Path(__file__).parent.parent / 'core' / 'config'
        
        # Load agent configurations
        with open(config_dir / 'agents' / 'agents.yaml', 'r') as f:
            self.agent_configs = yaml.safe_load(f)
            
        # Load task configurations
        with open(config_dir / 'tasks' / 'tasks.yaml', 'r') as f:
            self.task_configs = yaml.safe_load(f)

    def create_agent(self, agent_type: str) -> Agent:
        """Create an agent based on YAML configuration"""
        config = self.agent_configs[agent_type]
        knowledge_sources = []
        if agent_type == 'research_agent':
            knowledge_sources = self.research_agent_knowledge_sources
        
        tools = []
        if agent_type == 'research_agent':
            tools.append(self.website_search_tool)
            tools.append(self.knowledge_tool)
        
        return Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            llm=self.llm,
            verbose=True,
            tools=tools,
            knowledge_sources=knowledge_sources
        )

    def create_task(self, task_type: str, agent: Agent, context: Optional[Dict] = None) -> Task:
        """Create a task based on YAML configuration"""
        if task_type not in self.task_configs:
            raise ValueError(f"Task type '{task_type}' not found in configurations")
        
        config = self.task_configs[task_type]
        
        # Format the description with context if provided
        description = config['description']
        if context:
            description += f"\n\nContext:\n{context}"
        
        return Task(
            description=description,
            expected_output=config['expected_output'],
            agent=agent
        )

    async def process_message(self, message: str, conversation_history: Optional[List[Message]] = None, context: Optional[Dict] = None) -> Dict[str, str]:
        """Process the incoming chat message using the CrewAI system"""
        try:
            logger.info("\n" + "=" * 50)
            logger.info("STARTING CHAT PROCESSING")
            logger.info("=" * 50 + "\n")
            
            # Create agents
            research_agent = self.create_agent('research_agent')
            chat_agent = self.create_agent('chatbot_agent')
            manager = self.create_agent('manager_agent')
            
            # Prepare conversation context if not provided
            if context is None:
                context = {
                    "message": message,
                    "conversation_history": [
                        {"role": msg.role, "content": msg.content}
                        for msg in (conversation_history or [])
                    ]
                }
            
            # Create tasks
            research_task = self.create_task('research_task', research_agent, context)
            chat_task = self.create_task('chat_conversation', chat_agent, context)
            manager_task = self.create_task('manager_task', manager, context)
            
            # Set up task dependencies
            chat_task.context = [research_task]
            
            # Create and run the crew
            crew = Crew(
                agents=[research_agent, chat_agent],
                tasks=[research_task, chat_task],
                verbose=True,
                manager_agent=manager,
                process=Process.hierarchical
            )
            
            # Run the crew and get the result
            result = crew.kickoff()
            
            return {"response": str(result)}
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise Exception(f"Error processing message: {str(e)}")

# Create a singleton instance
chatbot_service = ChatbotService()