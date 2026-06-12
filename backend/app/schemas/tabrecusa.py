from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TabRecusaBase(BaseModel):
    codigo: int
    descricao: Optional[str] = None
    ativo: Optional[bool] = True
    id_usuario: Optional[int] = None

class TabRecusaCreate(TabRecusaBase):
    pass

class TabRecusaUpdate(BaseModel):
    codigo: Optional[int] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    id_usuario: Optional[int] = None

class TabRecusa(TabRecusaBase):
    id: int
    datalan: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)