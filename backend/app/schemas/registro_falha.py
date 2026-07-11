from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class RegistroFalhaBase(BaseModel):
    id_pneu: Optional[int] = None
    id_setor: int
    id_operador: int
    id_falha: int
    motivo: Optional[str] = None
    datareg: Optional[datetime] = None
    valor: Decimal = 0.00
    codbarra: Optional[str] = None
    userlan: Optional[str] = None

class RegistroFalhaCreate(RegistroFalhaBase):
    pass

class RegistroFalhaUpdate(RegistroFalhaBase):
    id_setor: Optional[int] = None
    id_operador: Optional[int] = None
    id_falha: Optional[int] = None

class RegistroFalhaInDBBase(RegistroFalhaBase):
    id: int
    datalan: Optional[datetime] = None

    class Config:
        from_attributes = True

class RegistroFalha(RegistroFalhaInDBBase):
    setor_nome: Optional[str] = None
    operador_nome: Optional[str] = None
    falha_nome: Optional[str] = None
    numserie: Optional[str] = None
