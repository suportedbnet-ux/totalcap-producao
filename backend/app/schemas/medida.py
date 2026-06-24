from typing import Optional
from pydantic import BaseModel

class MedidaBase(BaseModel):
    codigo: Optional[str] = None
    descricao: str
    ativo: Optional[bool] = True
    id_piso: Optional[int] = None
    tipo: Optional[str] = None

class MedidaCreate(MedidaBase):
    pass

class MedidaUpdate(BaseModel):
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    id_piso: Optional[int] = None
    tipo: Optional[str] = None

class Medida(MedidaBase):
    id: int

    class Config:
        from_attributes = True
