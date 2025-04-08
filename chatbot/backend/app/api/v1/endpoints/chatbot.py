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
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))