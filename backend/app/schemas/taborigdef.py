from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TabOrigDefBase(BaseModel):
    codigo: int
    descricao: Optional[str] = None
    ativo: Optional[bool] = True
    id_usuario: Optional[int] = None

class TabOrigDefCreate(TabOrigDefBase):
    pass

class TabOrigDefUpdate(BaseModel):
    codigo: Optional[int] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    id_usuario: Optional[int] = None

class TabOrigDef(TabOrigDefBase):
    id: int
    datalan: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)