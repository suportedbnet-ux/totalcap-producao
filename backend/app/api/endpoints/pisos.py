from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.app.models.piso import Piso as PisoModel
from backend.app.schemas.piso import Piso, PisoCreate, PisoUpdate

router = APIRouter()

@router.get("/", response_model=list[Piso])
def read_pisos(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    return db.query(PisoModel).offset(skip).limit(limit).all()

@router.post("/", response_model=Piso)
def create_piso(
    *,
    db: Session = Depends(get_db),
    piso_in: PisoCreate
) -> Any:
    db_obj = PisoModel(**piso_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=Piso)
def update_piso(
    *,
    db: Session = Depends(get_db),
    id: int,
    piso_in: PisoUpdate
) -> Any:
    db_obj = db.query(PisoModel).filter(PisoModel.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Piso não encontrado")
    
    update_data = piso_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{id}", response_model=Piso)
def delete_piso(
    *,
    db: Session = Depends(get_db),
    id: int
) -> Any:
    db_obj = db.query(PisoModel).filter(PisoModel.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Piso não encontrado")
    db.delete(db_obj)
    db.commit()
    return db_obj
