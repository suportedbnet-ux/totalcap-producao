# Backend Totalcap - Reload triggered for Schema Optional Datalan update
import os
import sys
from contextlib import asynccontextmanager

# Ajuste de PATH para garantir que os arquivos locais sejam encontrados
#
# Quando o servidor é iniciado de formas diferentes (ex: `cd backend && uvicorn main:app`
# vs `uvicorn backend.main:app`), o `sys.path` muda e imports como `from backend.database`
# podem falhar. Incluímos tanto a pasta `backend/` quanto a raiz do projeto.
current_dir = os.path.dirname(os.path.abspath(__file__))  # .../backend
project_root = os.path.dirname(current_dir)               # .../ (raiz do monorepo)

for p in (project_root, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Importações inteligentes sem usar importação relativa (.)
try:
    # Estrutura Monorepo (Local)
    from database import SessionLocal, engine, Base, get_db
    from config import settings
    from app.api.api import api_router
except (ModuleNotFoundError, ImportError):
    # Estrutura Flat (Railway/Deploy)
    try:
        from database import SessionLocal, engine, Base, get_db
        from config import settings
        from app.api.api import api_router
    except (ModuleNotFoundError, ImportError):
        # Fallback via importação direta de módulo
        import database
        import config
        # Tenta importar o roteador da subpasta app
        try:
            from app.api.api import api_router
        except:
            # Caso extremo
            sys.path.append(os.path.join(current_dir, "app"))
            from api.api import api_router
            
        SessionLocal = database.SessionLocal
        engine = database.engine
        Base = database.Base
        get_db = database.get_db
        settings = config.settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Backend Totalcap iniciado com sucesso.")
    yield
    print("Encerrando lifespan.")

app = FastAPI(
    title="Totalcap API",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    # Starlette disallows `allow_credentials=True` with `allow_origins=["*"]`.
    # When misconfigured, browsers can abort the request and Axios surfaces it as a generic "Network Error".
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "source": "main_app_root"}

@app.get("/")
def read_root():
    return {"message": "Bem-vindo ao Backend do Totalcap!"}


@app.get("/api/v1/ping")
def ping():
    return {"status": "ok", "message": "Backend respondendo corretamente!"}
