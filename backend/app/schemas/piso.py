from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PisoBase(BaseModel):
    codigo: Optional[str] = None
    ativo: Optional[bool] = True

class PisoCreate(PisoBase):
    pass

class PisoUpdate(PisoBase):
    pass

class Piso(PisoBase):
    id: int
    datalan: Optional[datetime] = None
    id_usuario: Optional[int] = None
    criado_em: Optional[datetime] = None
    userlan: Optional[str] = None

    class Config:
        orm_mode = True
