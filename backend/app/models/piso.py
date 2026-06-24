from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from .base import Base

class Piso(Base):
    __tablename__ = "piso"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(255), index=True, nullable=True)
    ativo = Column(Boolean, default=True)
    datalan = Column(DateTime, nullable=True)
    id_usuario = Column(Integer, nullable=True)
    criado_em = Column(DateTime, default=func.now(), nullable=True)
    userlan = Column(String(50), nullable=True)
