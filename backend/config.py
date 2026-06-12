from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Totalcap"
    API_V1_STR: str = "/api/v1"
    
    # URL vindo do Banco de Dados (será preenchida pelas variáveis de ambiente do Railway/Vercel)
    DATABASE_URL: Optional[str] = None
    POSTGRES_URL: Optional[str] = None

    # Configuracoes de seguranca
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7" # Mudar em producao
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 dias

    # Usuario Admin Padrao
    FIRST_SUPERUSER: str = "admin@totalcap.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "gemini" # Default para Gemini se nao especificado no .env/vercel

    OMIE_APPKEY: Optional[str] = None
    OMIE_APPSECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"), 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Lógica para priorizar DATABASE_URL (Railway) ou POSTGRES_URL
final_url = settings.DATABASE_URL or settings.POSTGRES_URL

if final_url:
    # Limpa caracteres invisíveis
    url = final_url.replace("\r", "").replace("\n", "").strip()
    # Corrige prefixo para SQLAlchemy (exige postgresql:// em vez de postgres://)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    # Garantir que caminhos SQLite sejam absolutos relativos à pasta backend
    if url.startswith("sqlite:///./"):
        db_file = url.replace("sqlite:///./", "")
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        abs_db_path = os.path.join(backend_dir, db_file)
        url = f"sqlite:///{abs_db_path}"
        
    settings.POSTGRES_URL = url
else:
    print("AVISO: Nenhuma URL de banco de dados configurada!")

