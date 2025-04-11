from crewai import Agent, Crew, Task, Process, Knowledge
from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
import yaml
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Define product knowledge base
PRODUCT_KNOWLEDGE = """Product Name: Lumora SmartMug™
Tagline: Sip Smart, Live Bright.
Product Description:
The Lumora SmartMug™ is a next-generation self-heating mug designed for modern lifestyles. With advanced temperature control, smartphone integration, and ambient LED lighting, it keeps your drink at the perfect temperature while elevating your desk aesthetics.

Key Features:
Smart Temperature Control (Keep drinks between 120°F–145°F)

Bluetooth App Integration (iOS & Android)

Wireless Charging Base

Touch-Sensitive Controls

Color-Changing Ambient LED Ring

Battery Life: Up to 8 hours on a full charge

Materials:
Double-walled ceramic with stainless steel core

BPA-free plastic base

Matte finish with anti-slip grip

Available Colors:
Midnight Black

Arctic White

Ocean Teal

Rose Gold

Price: $79.99
Target Audience:
Remote workers

Tech enthusiasts

Coffee and tea lovers

Home office setups

Manufacturer: Lumora Tech Inc., San Francisco, CA"""

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
        
        # Initialize knowledge base with string source
        string_source = StringKnowledgeSource(content=PRODUCT_KNOWLEDGE)
        self.knowledge = Knowledge(
            collection_name="product_knowledge",
            sources=[string_source]
        )

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
        
        return Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            llm=self.llm,
            verbose=True,
            knowledge=self.knowledge
        )

    def create_task(self, task_type: str, agent: Agent, context: Optional[Dict] = None) -> Task:
        """Create a task based on YAML configuration"""
        if task_type not in self.task_configs:
            raise ValueError(f"Task type '{task_type}' not found in configurations")
        
        config = self.task_configs[task_type]
        
        # Format the description with context if provided
        description = config['description']
        if context:
            description = description.format(**context)
        
        return Task(
            description=description,
            expected_output=config['expected_output'],
            agent=agent
        )

    async def process_message(self, message: str, conversation_history: Optional[List[Message]] = None, context: Optional[Dict] = None) -> str:
        """Process the incoming chat message using the CrewAI system"""
        try:
            logger.info("\n" + "=" * 50)
            logger.info("STARTING CHAT PROCESSING")
            logger.info("=" * 50 + "\n")
            
            # Create product expert agent
            product_expert = self.create_agent('product_expert_agent')
            
            # Prepare conversation context
            if context is None:
                context = {
                    "message": message,
                    "conversation_history": [
                        {"role": msg.role, "content": msg.content}
                        for msg in (conversation_history or [])
                    ]
                }
            
            # Create and execute task
            task = self.create_task('product_expert_task', product_expert, context)
            crew = Crew(
                agents=[product_expert],
                tasks=[task],
                verbose=True
            )
            
            result = crew.kickoff()
            
            return str(result)
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise

# Create a singleton instance
chatbot_service = ChatbotService()