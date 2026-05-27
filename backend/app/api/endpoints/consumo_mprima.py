from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.app.models.consumo_mprima import ConsumoMPrima
from backend.app.models.produto import Produto
from backend.app.schemas import consumo_mprima as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.ConsumoMPrima])
def read_consumos(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    id_pneu: int = None
) -> Any:
    query = db.query(
        ConsumoMPrima,
        Produto.descricao.label("produto_nome"),
        Produto.unidade.label("unidade")
    ).join(Produto, ConsumoMPrima.id_produto == Produto.id)
    
    if id_pneu:
        query = query.filter(ConsumoMPrima.id_pneu == id_pneu)
    
    results = query.offset(skip).limit(limit).all()
    
    output = []
    for reg, nome, und in results:
        d = schemas.ConsumoMPrima.model_validate(reg)
        d.produto_nome = nome
        d.unidade = und
        output.append(d)
        
    return output

@router.post("/", response_model=schemas.ConsumoMPrima)
def create_consumo(
    *,
    db: Session = Depends(get_db),
    consumo_in: schemas.ConsumoMPrimaCreate
) -> Any:
    db_obj = ConsumoMPrima(**consumo_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=schemas.ConsumoMPrima)
def update_consumo(
    *,
    db: Session = Depends(get_db),
    id: int,
    consumo_in: schemas.ConsumoMPrimaUpdate
) -> Any:
    db_obj = db.query(ConsumoMPrima).filter(ConsumoMPrima.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    
    update_data = consumo_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/relatorio")
def get_relatorio_consumo(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    id_produto: Optional[int] = None,
    solo: bool = False,
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(
        ConsumoMPrima.id,
        ConsumoMPrima.id_produto,
        ConsumoMPrima.id_pneu,
        ConsumoMPrima.id_empresa,
        ConsumoMPrima.datalan.label("data"),
        ConsumoMPrima.datareg,
        ConsumoMPrima.quant,
        ConsumoMPrima.valor,
        ConsumoMPrima.vtotal,
        ConsumoMPrima.obs,
        Produto.descricao.label("produto_nome"),
        Produto.unidade.label("unidade")
    ).join(Produto, ConsumoMPrima.id_produto == Produto.id)

    if solo:
        query = query.filter(ConsumoMPrima.id_pneu == None)

    if start_date:
        query = query.filter(ConsumoMPrima.datalan >= start_date)
    if end_date:
        query = query.filter(ConsumoMPrima.datalan <= end_date + " 23:59:59")
    if id_produto:
        query = query.filter(ConsumoMPrima.id_produto == id_produto)

    results = query.order_by(ConsumoMPrima.datalan.desc()).all()

    return [
        {
            "id": r.id,
            "id_produto": r.id_produto,
            "id_pneu": r.id_pneu,
            "id_empresa": r.id_empresa,
            "data": r.data.isoformat() if r.data else None,
            "datareg": r.datareg.isoformat() if r.datareg else None,
            "produto_nome": r.produto_nome,
            "unidade": r.unidade,
            "quant": float(r.quant) if r.quant else 0,
            "valor": float(r.valor) if r.valor else 0,
            "vtotal": float(r.vtotal) if r.vtotal else 0,
            "obs": r.obs
        }
        for r in results
    ]

@router.delete("/{id}")
def delete_consumo(id: int, db: Session = Depends(get_db)):
    reg = db.query(ConsumoMPrima).filter(ConsumoMPrima.id == id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    
    db.delete(reg)
    db.commit()
    return {"status": "success"}
