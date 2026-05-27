from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.api import deps
from backend.app.models.dispositivo import Dispositivo
from backend.app.schemas.dispositivo import Dispositivo as DispositivoSchema, DispositivoCreate, DispositivoUpdate
from backend.database import get_db

router = APIRouter()

@router.post("/", response_model=DispositivoSchema)
def solicitar_dispositivo(
    *,
    db: Session = Depends(get_db),
    obj_in: DispositivoCreate,
) -> Any:
    """
    Solicitação de credencial/dispositivo do App Mobile.
    """
    db_obj = db.query(Dispositivo).filter(Dispositivo.android_id == obj_in.android_id).first()
    if db_obj:
        return db_obj
    
    db_obj = Dispositivo(
        android_id=obj_in.android_id,
        id_setor=obj_in.id_setor,
        autorizado=False
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/check/{android_id}", response_model=DispositivoSchema)
def check_dispositivo(android_id: str, db: Session = Depends(get_db)) -> Any:
    """
    Verificação de autorização do dispositivo por Android ID.
    """
    result = db.query(Dispositivo).filter(Dispositivo.android_id == android_id).first()
    if not result:
        return None
    return result

@router.get("/", response_model=List[DispositivoSchema])
def read_dispositivos(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    q: str = None
) -> Any:
    """
    Retrieve dispositivos.
    """
    query = db.query(Dispositivo).options(joinedload(Dispositivo.setor))
    if q:
        query = query.filter(Dispositivo.android_id.ilike(f"%{q}%"))
    
    return query.offset(skip).limit(limit).all()

@router.put("/{id}", response_model=DispositivoSchema)
def update_dispositivo(
    *,
    db: Session = Depends(get_db),
    id: int,
    obj_in: DispositivoUpdate,
) -> Any:
    """
    Update a dispositivo (authorize/deauthorize).
    """
    db_obj = db.query(Dispositivo).filter(Dispositivo.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    
    db_obj.autorizado = obj_in.autorizado
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{id}", response_model=DispositivoSchema)
def delete_dispositivo(
    *,
    db: Session = Depends(get_db),
    id: int,
) -> Any:
    """
    Delete a dispositivo.
    """
    db_obj = db.query(Dispositivo).filter(Dispositivo.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    db.delete(db_obj)
    db.commit()
    return db_obj
