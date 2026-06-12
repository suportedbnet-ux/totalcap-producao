from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VendedorMetaBase(BaseModel):
    ano: int
    mes: int
    valor_meta: float = 0.0
    quantidade_meta: int = 0
    ativo: bool = True

class VendedorMetaCreate(VendedorMetaBase):
    id_vendedor: int

class VendedorMetaUpdate(BaseModel):
    ano: Optional[int] = None
    mes: Optional[int] = None
    valor_meta: Optional[float] = None
    quantidade_meta: Optional[int] = None
    ativo: Optional[bool] = None

class VendedorMetaInDBBase(VendedorMetaBase):
    id: int
    id_vendedor: int
    datalan: datetime

    class Config:
        from_attributes = True

class VendedorMeta(VendedorMetaInDBBase):
    pass
