from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
import requests

try:
    from backend.config import settings
except (ModuleNotFoundError, ImportError):
    from config import settings

router = APIRouter()

class GestaoClickProxyRequest(BaseModel):
    recurso: str
    param: Optional[Any] = None
    method: str = "GET"

@router.post("/proxy")
def gestaoclick_proxy(req: GestaoClickProxyRequest):
    """
    Rota de proxy para repassar a chamada para a API do GestãoClick e retornar o resultado,
    contornando o bloqueio de CORS do navegador e ocultando os tokens.
    """
    if not settings.GESTAOCLICK_URL or not settings.GESTAOCLICK_ACCESS_TOKEN or not settings.GESTAOCLICK_SECRET_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="Credenciais da API GestãoClick (GESTAOCLICK_URL, GESTAOCLICK_ACCESS_TOKEN, GESTAOCLICK_SECRET_ACCESS_TOKEN) não configuradas no backend.")

    # Formata a URL final
    base_url = settings.GESTAOCLICK_URL.rstrip('/')
    recurso = req.recurso.lstrip('/')
    final_url = f"{base_url}/{recurso}"

    headers = {
        "access-token": settings.GESTAOCLICK_ACCESS_TOKEN,
        "secret-access-token": settings.GESTAOCLICK_SECRET_ACCESS_TOKEN,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        http_method = req.method.upper()
        kwargs = {"headers": headers, "timeout": 60}
        
        if http_method == "GET" and req.param:
            if isinstance(req.param, list) and len(req.param) > 0:
                kwargs["params"] = req.param[0]
            elif isinstance(req.param, dict):
                kwargs["params"] = req.param
        elif req.param:
            kwargs["json"] = req.param
            
        response = requests.request(
            method=http_method,
            url=final_url,
            **kwargs
        )
        
        response.raise_for_status()
        
        try:
            resp_data = response.json()
        except ValueError:
            resp_data = {"raw_text": response.text}
            
        return {
            "request_info": {
                "url": final_url,
                "method": http_method,
                "headers": headers,
                "body": kwargs.get("json") or kwargs.get("params")
            },
            "response_data": resp_data
        }
        
    except requests.exceptions.RequestException as e:
        if e.response is not None:
            try:
                error_data = e.response.json()
            except ValueError:
                error_data = {"raw_text": e.response.text}
            
            detail = {
                "request_info": {
                    "url": final_url,
                    "method": http_method,
                    "body": kwargs.get("json") or kwargs.get("params")
                },
                "response_data": error_data
            }
            
            try:
                import json
                with open("last_gestaoclick_error.json", "w", encoding="utf-8") as f:
                    json.dump(detail, f, indent=2, ensure_ascii=False)
            except Exception:
                pass
                
            raise HTTPException(status_code=e.response.status_code, detail=detail)
        
        raise HTTPException(status_code=500, detail=f"Erro de comunicação GestãoClick: {str(e)}")
