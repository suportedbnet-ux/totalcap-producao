from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric
from .base import Base

class PlanoPag(Base):
    __tablename__ = "planopag"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(Integer, nullable=True)
    formapag = Column(String, nullable=True)
    numparc = Column(Integer, default=1)
    intervalo = Column(Integer, default=30)  # Intervalo em dias entre parcelas (padrão 30 dias)
    acrescimo = Column(Numeric(10, 2), default=0.00)
    desconto = Column(Numeric(10, 2), default=0.00)
    ativo = Column(Boolean, default=True)
    userlan = Column(String, nullable=True)
    datalan = Column(DateTime, nullable=True)
    id_forma_erp = Column(Integer, nullable=True)
