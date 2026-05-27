from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from .base import Base

class FichaTecnica(Base):
    __tablename__ = "fichatecnica"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String(80), nullable=True)

    # Relacionamento Mestre/Detalhe
    itens = relationship("FichaTecnicaMPrima", back_populates="mestre", cascade="all, delete-orphan")

class FichaTecnicaMPrima(Base):
    __tablename__ = "fichatecnica_mprima"

    id = Column(Integer, primary_key=True, index=True)
    id_fichatecnica = Column(Integer, ForeignKey("fichatecnica.id"), nullable=False)
    id_fichapronto = Column(Integer, nullable=True)
    id_produto = Column(Integer, ForeignKey("produto.id"), nullable=True)
    quant = Column(Numeric(15, 2), nullable=True)
    ordem = Column(Integer, nullable=True)

    # Relacionamentos
    mestre = relationship("FichaTecnica", back_populates="itens")
    produto = relationship("Produto")
