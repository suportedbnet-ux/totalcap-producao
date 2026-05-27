from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

# Item (Detalhe)
class FichaTecnicaItemBase(BaseModel):
    id_fichapronto: Optional[int] = None
    id_produto: Optional[int] = None
    quant: Optional[Decimal] = None
    ordem: Optional[int] = None

class FichaTecnicaItemCreate(FichaTecnicaItemBase):
    pass

class FichaTecnicaItem(FichaTecnicaItemBase):
    id: int
    id_fichatecnica: int
    
    # Podemos incluir o nome do produto aqui depois
    produto_descricao: Optional[str] = None

    class Config:
        from_attributes = True

# Ficha Técnica (Mestre)
class FichaTecnicaBase(BaseModel):
    descricao: Optional[str] = None

class FichaTecnicaCreate(FichaTecnicaBase):
    itens: List[FichaTecnicaItemCreate] = []

class FichaTecnicaUpdate(FichaTecnicaBase):
    itens: Optional[List[FichaTecnicaItemCreate]] = None

class FichaTecnica(FichaTecnicaBase):
    id: int
    itens: List[FichaTecnicaItem] = []

    class Config:
        from_attributes = True
