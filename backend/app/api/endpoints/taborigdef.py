from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.app.models.taborigdef import TabOrigDef as TabOrigDefModel
from backend.app.schemas.taborigdef import TabOrigDef, TabOrigDefCreate, TabOrigDefUpdate

router = APIRouter()

@router.get("/", response_model=List[TabOrigDef])
def read_taborigdef(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 500
) -> Any:
    results = db.query(TabOrigDefModel).order_by(TabOrigDefModel.codigo).offset(skip).limit(limit).all()
    # Strip trailing spaces from fixed-length character fields
    for r in results:
        if r.descricao:
            r.descricao = r.descricao.strip()
    return results

@router.get("/{id}", response_model=TabOrigDef)
def read_taborigdef_by_id(
    *,
    db: Session = Depends(get_db),
    id: int
) -> Any:
    obj = db.query(TabOrigDefModel).filter(TabOrigDefModel.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    if obj.descricao:
        obj.descricao = obj.descricao.strip()
    return obj

@router.post("/", response_model=TabOrigDef)
def create_taborigdef(
    *,
    db: Session = Depends(get_db),
    obj_in: TabOrigDefCreate
) -> Any:
    db_obj = TabOrigDefModel(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=TabOrigDef)
def update_taborigdef(
    *,
    db: Session = Depends(get_db),
    id: int,
    obj_in: TabOrigDefUpdate
) -> Any:
    db_obj = db.query(TabOrigDefModel).filter(TabOrigDefModel.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    update_data = obj_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{id}", response_model=TabOrigDef)
def delete_taborigdef(
    *,
    db: Session = Depends(get_db),
    id: int
) -> Any:
    db_obj = db.query(TabOrigDefModel).filter(TabOrigDefModel.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    db.delete(db_obj)
    db.commit()
    return db_obj