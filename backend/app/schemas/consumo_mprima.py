from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class ConsumoMPrimaBase(BaseModel):
    id_pneu: Optional[int] = None
    id_produto: int
    id_empresa: Optional[int] = None
    quant: Decimal = 0.000
    valor: Decimal = 0.00
    vtotal: Decimal = 0.00
    obs: Optional[str] = None
    userlan: Optional[str] = None
    datareg: Optional[datetime] = None

class ConsumoMPrimaCreate(ConsumoMPrimaBase):
    pass

class ConsumoMPrimaUpdate(ConsumoMPrimaBase):
    id_produto: Optional[int] = None

class ConsumoMPrimaInDBBase(ConsumoMPrimaBase):
    id: int
    datalan: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConsumoMPrima(ConsumoMPrimaInDBBase):
    produto_nome: Optional[str] = None
    unidade: Optional[str] = None
