from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.app.schemas import registro_falha as schemas
from backend.app.services.registro_falha import registro_falha_service

router = APIRouter()

@router.get("/", response_model=List[schemas.RegistroFalha])
def read_falhas(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    id_pneu: int = None
) -> Any:
    return registro_falha_service.get_registros(db, skip=skip, limit=limit, id_pneu=id_pneu)

@router.post("/")
def create_falha(
    *,
    db: Session = Depends(get_db),
    falha_in: schemas.RegistroFalhaCreate
) -> Any:
    import traceback
    try:
        return registro_falha_service.create_registro(db, obj_in=falha_in)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}")
def update_falha(
    *,
    db: Session = Depends(get_db),
    id: int,
    falha_in: schemas.RegistroFalhaUpdate
) -> Any:
    update_data = falha_in.model_dump(exclude_unset=True)
    reg = registro_falha_service.update_registro(db, id=id, obj_in=update_data)
    if not reg:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    return reg

@router.get("/relatorio")
def get_relatorio_falhas(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    id_falha: Optional[int] = None,
    id_setor: Optional[int] = None,
    id_operador: Optional[int] = None,
    db: Session = Depends(get_db)
) -> Any:
    from backend.app.models.registro_falha import RegistroFalha
    from backend.app.models.falha import Falha
    from backend.app.models.setor import Setor
    from backend.app.models.operador import Operador
    from backend.app.models.ordem_servico import OSPneu
    import traceback

    try:
        query = db.query(
            RegistroFalha.id,
            RegistroFalha.id_setor,
            RegistroFalha.id_operador,
            RegistroFalha.id_falha,
            RegistroFalha.id_pneu,
            RegistroFalha.datareg.label("data"),
            RegistroFalha.motivo,
            RegistroFalha.valor,
            RegistroFalha.codbarra,
            Falha.descricao.label("falha_nome"),
            Setor.descricao.label("setor_nome"),
            Operador.nome.label("operador_nome"),
            OSPneu.numserie.label("numserie")
        ).outerjoin(Falha, RegistroFalha.id_falha == Falha.id)\
         .outerjoin(Setor, RegistroFalha.id_setor == Setor.id)\
         .outerjoin(Operador, RegistroFalha.id_operador == Operador.id)\
         .outerjoin(OSPneu, RegistroFalha.id_pneu == OSPneu.id)

        if start_date:
            query = query.filter(RegistroFalha.datareg >= start_date)
        if end_date:
            if " " not in end_date:
                query = query.filter(RegistroFalha.datareg <= end_date + " 23:59:59")
            else:
                query = query.filter(RegistroFalha.datareg <= end_date)
                
        if id_falha:
            query = query.filter(RegistroFalha.id_falha == id_falha)
        if id_setor:
            query = query.filter(RegistroFalha.id_setor == id_setor)
        if id_operador:
            query = query.filter(RegistroFalha.id_operador == id_operador)

        results = query.order_by(RegistroFalha.datareg.desc()).all()

        return [
            {
                "id": r.id,
                "id_setor": r.id_setor,
                "id_operador": r.id_operador,
                "id_falha": r.id_falha,
                "id_pneu": r.id_pneu,
                "data": r.data.isoformat() if r.data and hasattr(r.data, 'isoformat') else str(r.data) if r.data else None,
                "falha_nome": r.falha_nome or "N/A",
                "setor_nome": r.setor_nome or "N/A",
                "operador_nome": r.operador_nome or "N/A",
                "numserie": r.numserie or "N/A",
                "motivo": r.motivo,
                "valor": float(r.valor) if r.valor else 0,
                "codbarra": r.codbarra
            }
            for r in results
        ]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao processar relatório: {str(e)}")

@router.delete("/{id}")
def delete_falha(id: int, db: Session = Depends(get_db)):
    reg = registro_falha_service.delete_registro(db, id=id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    return {"status": "success"}
