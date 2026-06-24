from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Lógica para conexão dinâmica
connect_args = {}
if settings.POSTGRES_URL and "sqlite" not in settings.POSTGRES_URL:
    connect_args = {"sslmode": "require"}

engine = create_engine(
    settings.POSTGRES_URL,
    pool_pre_ping=True,
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
