from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import google.generativeai as genai
from openai import OpenAI
from backend.config import settings
from backend.database import get_db
from backend.app.services.ai_service import TotalcapAgent

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    historico: Optional[list[dict]] = []

class ChatResponse(BaseModel):
    reply: str
    provedor: str

def _chat_with_gemini(message: str, historico: list[dict]) -> str:
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY não configurada.")
    genai.configure(api_key=settings.GOOGLE_API_KEY, transport='rest')
    model = genai.GenerativeModel(
        model_name='gemini-2.0-flash',
        system_instruction=(
            "Você é um assistente especializado do sistema Totalcap, "
            "um software de gestão para reformadoras de pneus. "
            "Ajude o usuário com dúvidas sobre o sistema, processos de recapagem, "
            "ordens de serviço, faturamento, produção, etc. "
            "Seja objetivo e técnico. Responda em português do Brasil."
        )
    )
    chat = model.start_chat(history=historico)
    response = chat.send_message(message)
    return response.text

def _chat_with_openai(message: str, historico: list[dict]) -> str:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY não configurada.")
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    messages = [
        {
            "role": "system",
            "content": (
                "Você é um assistente especializado do sistema Totalcap, "
                "um software de gestão para reformadoras de pneus. "
                "Ajude o usuário com dúvidas sobre o sistema, processos de recapagem, "
                "ordens de serviço, faturamento, produção, etc. "
                "Seja objetivo e técnico. Responda em português do Brasil."
            )
        }
    ]
    for msg in historico:
        messages.append(msg)
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=1024,
    )
    return response.choices[0].message.content

@router.post("/chat", response_model=ChatResponse)
def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint de chat com IA que usa o TotalcapAgent para responder com
    ferramentas de consulta ao banco de dados (status de pneu, OS, serviços, etc.)
    """
    try:
        if settings.AI_PROVIDER == "gemini":
            # Gemini não tem suporte a function calling como OpenAI,
            # então usa o chat simples sem ferramentas de banco
            reply = _chat_with_gemini(request.message, request.historico)
            return ChatResponse(reply=reply, provedor=settings.AI_PROVIDER)

        # OpenAI com TotalcapAgent (suporte a function calling)
        if not settings.OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY não configurada para uso com TotalcapAgent.")

        agent = TotalcapAgent(db=db, user_type="interno", platform="web")
        reply = agent.ask(request.message)
        return ChatResponse(reply=reply, provedor=settings.AI_PROVIDER)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar mensagem: {str(e)}")