from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base

class RegistroFalha(Base):
    __tablename__ = "registro_falha"

    id = Column(Integer, primary_key=True, index=True)
    id_pneu = Column(Integer, ForeignKey("pneu.id"), nullable=True)
    id_setor = Column(Integer, ForeignKey("setor.id"), nullable=False)
    id_operador = Column(Integer, ForeignKey("operador.id"), nullable=False)
    id_falha = Column(Integer, ForeignKey("falha.id"), nullable=False)
    
    motivo = Column(String(500), nullable=True)
    datareg = Column(DateTime(timezone=True), server_default=func.now())
    valor = Column(Numeric(10, 2), default=0.00)
    codbarra = Column(String(100), nullable=True)
    
    userlan = Column(String(50), nullable=True)
    datalan = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    setor = relationship("Setor")
    operador = relationship("Operador")
    falha = relationship("Falha")
    pneu = relationship("OSPneu")
