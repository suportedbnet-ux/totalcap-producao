from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from backend.app.schemas.contato import ContatoBase
from backend.app.schemas.vendedor import VendedorBase

class ColetaPneuBase(BaseModel):
    id_medida: Optional[int] = None
    id_marca: Optional[int] = None
    id_desenho: Optional[int] = None
    id_recap: Optional[int] = None
    valor: Optional[float] = 0.0
    piso: Optional[str] = None
    numserie: Optional[str] = None
    numfogo: Optional[str] = None
    dot: Optional[str] = None
    doriginal: Optional[str] = None
    qreforma: Optional[int] = 0
    uso: Optional[str] = None
    garantia: Optional[str] = None
    obs: Optional[str] = None
    medidanova: Optional[str] = None
    marcanova: Optional[str] = None
    desenhonovo: Optional[str] = None

class ColetaPneuCreate(ColetaPneuBase):
    pass

class ColetaPneuUpdate(ColetaPneuBase):
    id: Optional[int] = None

class ColetaPneu(ColetaPneuBase):
    id: int
    id_coleta: int
    datalan: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ColetaBase(BaseModel):
    id_contato: Optional[int] = None
    qpneu: Optional[int] = 0
    vtotal: Optional[float] = 0.0
    msgmob: Optional[str] = None
    id_vendedor: int
    
    # Novos campos do cabeçalho
    numos: Optional[int] = None
    cpfcnpj: Optional[str] = None
    nome: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    fone: Optional[str] = None
    veiculo: Optional[str] = None
    formapagto: Optional[str] = None
    vendedor_ocr: Optional[str] = None
    servicocomgarantia: Optional[str] = None
    tipoveiculo: Optional[str] = None
    somentesepar: Optional[str] = None
    podealterardesenho: Optional[str] = None
    status: Optional[str] = ""

class ColetaCreate(ColetaBase):
    pneus: List[ColetaPneuCreate] = []

class ColetaUpdate(ColetaBase):
    pneus: List[ColetaPneuUpdate] = []

class Coleta(ColetaBase):
    id: int
    dataos: Optional[datetime] = None
    datalan: Optional[datetime] = None
    status: Optional[str] = ""
    pneus: List[ColetaPneu] = []
    contato: Optional[ContatoBase] = None
    vendedor: Optional[VendedorBase] = None
    
    class Config:
        from_attributes = True
