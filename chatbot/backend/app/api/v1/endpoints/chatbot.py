from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Dict, List, Optional
from app.services.chatbot_service import chatbot_service, Message

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    url: Optional[str] = None
    conversation_history: Optional[List[Message]] = []

class UrlRequest(BaseModel):
    url: HttpUrl

class ChatResponse(BaseModel):
    response: str

class UrlResponse(BaseModel):
    success: bool
    message: str

class SuggestedQuestionsResponse(BaseModel):
    questions: List[str]

@router.post("/submit-url", response_model=UrlResponse)
async def submit_url(request: UrlRequest) -> Dict[str, str]:
    try:
        # Here you can add any URL validation or processing logic
        return {
            "success": True,
            "message": f"URL successfully submitted: {request.url}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest) -> Dict[str, str]:
    try:
        # Create context with URL if provided
        context = {
            "message": request.message,
            "conversation_history": request.conversation_history or []
        }
        if request.url:
            context["url"] = request.url
            
        result = await chatbot_service.process_message(
            message=request.message,
            conversation_history=request.conversation_history,
            context=context
        )
        return {"response": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggested-questions", response_model=SuggestedQuestionsResponse)
async def get_suggested_questions() -> Dict[str, List[str]]:
    """Get the list of suggested questions"""
    try:
        # Generate questions if not already generated
        if not chatbot_service.suggested_questions:
            await chatbot_service.initialize_suggested_questions()
        return {"questions": chatbot_service.suggested_questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))