from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base

class ConsumoMPrima(Base):
    __tablename__ = "consumo_mprima"

    id = Column(Integer, primary_key=True, index=True)
    id_pneu = Column(Integer, ForeignKey("pneu.id"), nullable=True)
    id_produto = Column(Integer, ForeignKey("produto.id"), nullable=False)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=True)
    
    quant = Column(Numeric(10, 3), default=Decimal('0.000'))
    valor = Column(Numeric(10, 2), default=Decimal('0.00'))
    vtotal = Column(Numeric(10, 2), default=Decimal('0.00'))
    obs = Column(Text, nullable=True)
    
    userlan = Column(String(50), nullable=True)
    datalan = Column(DateTime(timezone=True), server_default=func.now())
    datareg = Column(DateTime, server_default=func.now())
    
    # Relacionamentos
    produto = relationship("Produto")
    pneu = relationship("OSPneu")
    empresa = relationship("Empresa")
