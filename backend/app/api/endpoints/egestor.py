from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import time

try:
    from backend.config import settings
except (ModuleNotFoundError, ImportError):
    from config import settings

router = APIRouter()

class EgestorProxyRequest(BaseModel):
    recurso: str
    param: Optional[Any] = None
    method: str = "GET"

@router.post("/proxy")
def egestor_proxy(req: EgestorProxyRequest):
    """
    Rota de proxy para repassar a chamada para a API do eGestor e retornar o resultado,
    contornando o bloqueio de CORS do navegador e ocultando o token.
    """
    if not settings.EGESTOR_URL or not settings.EGESTOR_APIKEY:
        raise HTTPException(status_code=500, detail="Credenciais da API eGestor (EGESTOR_URL, EGESTOR_APIKEY) não configuradas no backend.")

    # Formata a URL final
    base_url = settings.EGESTOR_URL.rstrip('/')
    recurso = req.recurso.lstrip('/')
    final_url = f"{base_url}/{recurso}"

    headers = {
        "Authorization": f"Bearer {settings.EGESTOR_APIKEY}",
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
        
        # Levanta erro caso o status HTTP não seja de sucesso (2xx)
        response.raise_for_status()
        
        return response.json()
        
    except requests.exceptions.RequestException as e:
        if e.response is not None:
            try:
                error_data = e.response.json()
                # Se houver um formato especifico de erro do eGestor
                if "error" in error_data:
                    raise HTTPException(status_code=e.response.status_code, detail=str(error_data.get("error")))
                raise HTTPException(status_code=e.response.status_code, detail=error_data)
            except ValueError:
                raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        
        raise HTTPException(status_code=500, detail=f"Erro de comunicação eGestor: {str(e)}")
