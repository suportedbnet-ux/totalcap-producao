from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.app.models.fichatecnica import FichaTecnica, FichaTecnicaMPrima
from backend.app.models.produto import Produto
from backend.app.schemas.fichatecnica import FichaTecnica as FichaTecnicaSchema, FichaTecnicaCreate, FichaTecnicaUpdate
from backend.database import get_db

router = APIRouter()

@router.get("/", response_model=List[FichaTecnicaSchema])
def read_fichas_tecnicas(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve fichas tecnicas.
    """
    fichas = db.query(FichaTecnica).offset(skip).limit(limit).all()
    
    # Enriquecer com descricao do produto nos itens
    for ficha in fichas:
        for item in ficha.itens:
            if item.id_produto:
                prod = db.query(Produto).filter(Produto.id == item.id_produto).first()
                if prod:
                    item.produto_descricao = prod.descricao
                    
    return fichas

@router.post("/", response_model=FichaTecnicaSchema)
def create_ficha_tecnica(
    *,
    db: Session = Depends(get_db),
    obj_in: FichaTecnicaCreate,
) -> Any:
    """
    Create a new ficha tecnica with its items.
    """
    db_obj = FichaTecnica(descricao=obj_in.descricao)
    db.add(db_obj)
    db.flush() # Para pegar o ID do mestre

    for item_in in obj_in.itens:
        item_db = FichaTecnicaMPrima(
            id_fichatecnica=db_obj.id,
            **item_in.dict()
        )
        db.add(item_db)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/{id}", response_model=FichaTecnicaSchema)
def read_ficha_tecnica(
    *,
    db: Session = Depends(get_db),
    id: int,
) -> Any:
    """
    Get ficha tecnica by ID.
    """
    ficha = db.query(FichaTecnica).filter(FichaTecnica.id == id).first()
    if not ficha:
        raise HTTPException(status_code=404, detail="Ficha Técnica não encontrada")
    
    for item in ficha.itens:
        if item.id_produto:
            prod = db.query(Produto).filter(Produto.id == item.id_produto).first()
            if prod:
                item.produto_descricao = prod.descricao
                
    return ficha

@router.put("/{id}", response_model=FichaTecnicaSchema)
def update_ficha_tecnica(
    *,
    db: Session = Depends(get_db),
    id: int,
    obj_in: FichaTecnicaUpdate,
) -> Any:
    """
    Update a ficha tecnica and its items.
    """
    db_obj = db.query(FichaTecnica).filter(FichaTecnica.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Ficha Técnica não encontrada")
    
    if obj_in.descricao is not None:
        db_obj.descricao = obj_in.descricao
    
    if obj_in.itens is not None:
        # Remover itens antigos e adicionar novos (simplificado)
        db.query(FichaTecnicaMPrima).filter(FichaTecnicaMPrima.id_fichatecnica == id).delete()
        for item_in in obj_in.itens:
            item_db = FichaTecnicaMPrima(
                id_fichatecnica=id,
                **item_in.dict()
            )
            db.add(item_db)
            
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{id}", response_model=FichaTecnicaSchema)
def delete_ficha_tecnica(
    *,
    db: Session = Depends(get_db),
    id: int,
) -> Any:
    """
    Delete a ficha tecnica.
    """
    db_obj = db.query(FichaTecnica).filter(FichaTecnica.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Ficha Técnica não encontrada")
    db.delete(db_obj)
    db.commit()
    return db_obj
