from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class VendedorMeta(Base):
    __tablename__ = "vendedor_meta"

    id = Column(Integer, primary_key=True, index=True)
    id_vendedor = Column(Integer, ForeignKey("vendedor.id"), nullable=False)
    ano = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    valor_meta = Column("vmetafat", Float, default=0.0)
    quantidade_meta = Column("vmetacomb", Float, default=0.0)
    vfatreal = Column(Float, default=0.0)
    vcombreal = Column(Float, default=0.0)
    userlan = Column(String)
    ativo = Column(Boolean, default=True)
    datalan = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    vendedor = relationship("Vendedor", back_populates="metas")
