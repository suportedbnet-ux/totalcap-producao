from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api import deps
from backend.app.models.vendedor_meta import VendedorMeta
from backend.app.models.vendedor import Vendedor
from backend.app.schemas import vendedor_meta as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.VendedorMeta])
def read_metas(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    id_vendedor: int = None
) -> Any:
    """
    Lista as metas. Pode filtrar por id_vendedor.
    """
    query = db.query(VendedorMeta)
    if id_vendedor:
        query = query.filter(VendedorMeta.id_vendedor == id_vendedor)
    return query.order_by(VendedorMeta.id_vendedor, VendedorMeta.ano, VendedorMeta.mes).offset(skip).limit(limit).all()

@router.get("/relatorio")
def get_relatorio_metas(
    db: Session = Depends(deps.get_db),
    start_date: str = None,
    end_date: str = None,
    id_vendedor: int = None
) -> Any:
    """
    Relatório de metas com filtros de período e vendedor.
    """
    query = db.query(
        VendedorMeta,
        Vendedor.nome.label("vendedor_nome")
    ).join(Vendedor, VendedorMeta.id_vendedor == Vendedor.id)

    if id_vendedor:
        query = query.filter(VendedorMeta.id_vendedor == id_vendedor)

    if start_date:
        # Extrai ano e mês da data de início (YYYY-MM-DD)
        sy, sm = map(int, start_date.split('-')[:2])
        query = query.filter(
            (VendedorMeta.ano > sy) | 
            ((VendedorMeta.ano == sy) & (VendedorMeta.mes >= sm))
        )

    if end_date:
        # Extrai ano e mês da data de fim (YYYY-MM-DD)
        ey, em = map(int, end_date.split('-')[:2])
        query = query.filter(
            (VendedorMeta.ano < ey) | 
            ((VendedorMeta.ano == ey) & (VendedorMeta.mes <= em))
        )

    results = query.order_by(VendedorMeta.ano.desc(), VendedorMeta.mes.desc()).all()
    
    # Formata o resultado para incluir o nome do vendedor
    report_data = []
    for meta, v_nome in results:
        data_dict = {
            "id": meta.id,
            "id_vendedor": meta.id_vendedor,
            "vendedor_nome": v_nome,
            "ano": meta.ano,
            "mes": meta.mes,
            "valor_meta": meta.valor_meta,
            "quantidade_meta": meta.quantidade_meta,
            "vfatreal": meta.vfatreal,
            "vcombreal": meta.vcombreal,
            "ativo": meta.ativo,
            "datalan": meta.datalan
        }
        report_data.append(data_dict)
        
    return report_data

@router.post("/", response_model=schemas.VendedorMeta)
def create_meta(
    *,
    db: Session = Depends(deps.get_db),
    meta_in: schemas.VendedorMetaCreate
) -> Any:
    """
    Cria uma nova meta para um vendedor.
    """
    # Verifica se já existe meta para este ano/mês/vendedor
    existing = db.query(VendedorMeta).filter(
        VendedorMeta.id_vendedor == meta_in.id_vendedor,
        VendedorMeta.ano == meta_in.ano,
        VendedorMeta.mes == meta_in.mes
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe uma meta cadastrada para este vendedor neste mês/ano."
        )

    db_obj = VendedorMeta(**meta_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=schemas.VendedorMeta)
def update_meta(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    meta_in: schemas.VendedorMetaUpdate
) -> Any:
    """
    Atualiza uma meta existente.
    """
    db_obj = db.query(VendedorMeta).filter(VendedorMeta.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    update_data = meta_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{id}", response_model=schemas.VendedorMeta)
def delete_meta(
    *,
    db: Session = Depends(deps.get_db),
    id: int
) -> Any:
    """
    Remove uma meta.
    """
    db_obj = db.query(VendedorMeta).filter(VendedorMeta.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(db_obj)
    db.commit()
    return db_obj
