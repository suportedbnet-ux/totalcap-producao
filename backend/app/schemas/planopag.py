from pydantic import BaseModel, ConfigDict
from typing import Optional, Union
from decimal import Decimal

class PlanoPagBase(BaseModel):
    codigo: Optional[int] = None
    formapag: Optional[str] = None
    numparc: Optional[int] = 1
    intervalo: Optional[int] = 30  # Intervalo em dias entre parcelas (padrão 30 dias)
    ativo: Optional[bool] = True
    id_forma_erp: Optional[Union[str, int]] = None

class PlanoPagResponse(PlanoPagBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
