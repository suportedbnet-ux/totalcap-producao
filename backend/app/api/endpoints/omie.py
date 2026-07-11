# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import requests

try:
    from backend.config import settings
except (ModuleNotFoundError, ImportError):
    from config import settings

router = APIRouter()

class OmieProxyRequest(BaseModel):
    endpoint_url: str
    call: str
    param: List[Dict[str, Any]]

@router.post("/proxy")
def omie_proxy(req: OmieProxyRequest):
    """
    Rota de proxy para repassar a chamada para a API da Omie e retornar o resultado,
    contornando o bloqueio de CORS do navegador.
    """
    if not settings.OMIE_APPKEY or not settings.OMIE_APPSECRET:
        raise HTTPException(status_code=500, detail="Credenciais da API Omie (OMIE_APPKEY, OMIE_APPSECRET) não configuradas no backend.")

    payload = {
        "call": req.call,
        "app_key": settings.OMIE_APPKEY,
        "app_secret": settings.OMIE_APPSECRET,
        "param": req.param
    }
    
    try:
        response = requests.post(
            req.endpoint_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        response.raise_for_status()
        retorno = response.json()
        
        # Omie reporta os erros de negocio dentro de um JSON HTTP 200/500 com faultstring
        if "faultstring" in retorno:
            raise HTTPException(status_code=400, detail=retorno.get("faultstring"))
            
        return retorno
        
    except requests.exceptions.RequestException as e:
        # Tentar extrair json de erro se houver
        if e.response is not None:
            try:
                error_data = e.response.json()
                if "faultstring" in error_data:
                    raise HTTPException(status_code=400, detail=error_data.get("faultstring"))
            except ValueError:
                pass
        
        raise HTTPException(status_code=500, detail=f"Erro de comunicação Omie: {str(e)}")
