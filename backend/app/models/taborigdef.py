from sqlalchemy import Column, Integer, String, Boolean, DateTime, TIMESTAMP
from sqlalchemy.sql import func
from .base import Base

class TabOrigDef(Base):
    __tablename__ = "taborigdef"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(Integer, nullable=False)
    descricao = Column(String(200), nullable=True)
    ativo = Column(Boolean, default=True)
    datalan = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    id_usuario = Column(Integer, nullable=True)