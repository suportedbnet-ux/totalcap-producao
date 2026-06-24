from typing import List, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.api import deps
from backend.app.models.coleta import Coleta, ColetaPneu
from backend.app.schemas.coleta import (
    Coleta as ColetaSchema,
    ColetaCreate,
    ColetaUpdate,
    ColetaPneu as ColetaPneuSchema,
    ColetaPneuCreate,
)
from backend.app.models.ordem_servico import OrdemServico, OSPneu
from backend.app.schemas.ordem_servico import OrdemServicoResponse
from backend.database import get_db

router = APIRouter()


def _read_coletas(db: Session, skip: int = 0, limit: int = 100) -> List[Coleta]:
    return db.query(Coleta).options(
        joinedload(Coleta.pneus),
        joinedload(Coleta.contato),
        joinedload(Coleta.vendedor),
    ).order_by(Coleta.id.desc()).offset(skip).limit(limit).all()


@router.get("/", response_model=List[ColetaSchema])
def read_coleta(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return _read_coletas(db, skip=skip, limit=limit)


@router.get("/all", response_model=List[ColetaSchema])
def read_coletas_alias(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return _read_coletas(db, skip=skip, limit=limit)


@router.get("/{id}/pneus", response_model=list[ColetaPneuSchema])
def read_coleta_pneus(
    id: int,
    db: Session = Depends(get_db),
) -> Any:
    """Retorna os pneus associados a uma coleta específica."""
    return db.query(ColetaPneu).filter(ColetaPneu.id_coleta == id).all()


@router.post("/{id}/pneus", response_model=ColetaPneuSchema, status_code=status.HTTP_201_CREATED)
def create_coleta_pneu(
    id: int,
    *,
    db: Session = Depends(get_db),
    pneu_in: ColetaPneuCreate,
) -> Any:
    pneu_db = ColetaPneu(
        id_coleta=id,
        id_medida=pneu_in.id_medida if pneu_in.id_medida else None,
        id_marca=pneu_in.id_marca if pneu_in.id_marca else None,
        id_desenho=pneu_in.id_desenho if pneu_in.id_desenho else None,
        id_recap=pneu_in.id_recap if pneu_in.id_recap else None,
        valor=pneu_in.valor,
        piso=pneu_in.piso,
        numserie=pneu_in.numserie,
        numfogo=pneu_in.numfogo,
        dot=pneu_in.dot,
        doriginal=pneu_in.doriginal,
        qreforma=pneu_in.qreforma,
        uso=pneu_in.uso,
        garantia=pneu_in.garantia,
        obs=pneu_in.obs,
        medidanova=pneu_in.medidanova,
        marcanova=pneu_in.marcanova,
        desenhonovo=pneu_in.desenhonovo,
    )
    db.add(pneu_db)
    db.commit()
    db.refresh(pneu_db)
    return pneu_db


@router.put("/{id}/pneus/{pneu_id}", response_model=ColetaPneuSchema)
def update_coleta_pneu(
    id: int,
    pneu_id: int,
    *,
    db: Session = Depends(get_db),
    pneu_in: ColetaPneuCreate,
) -> Any:
    pneu_db = db.query(ColetaPneu).filter(ColetaPneu.id == pneu_id, ColetaPneu.id_coleta == id).first()
    if not pneu_db:
        raise HTTPException(status_code=404, detail="Pneu da coleta não encontrado")
    update_data = pneu_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(pneu_db, k, v)
    db.commit()
    db.refresh(pneu_db)
    return pneu_db


@router.delete("/{id}/pneus/{pneu_id}", response_model=ColetaPneuSchema)
def delete_coleta_pneu(
    id: int,
    pneu_id: int,
    db: Session = Depends(get_db),
) -> Any:
    pneu_db = db.query(ColetaPneu).filter(ColetaPneu.id == pneu_id, ColetaPneu.id_coleta == id).first()
    if not pneu_db:
        raise HTTPException(status_code=404, detail="Pneu da coleta não encontrado")
    db.delete(pneu_db)
    db.commit()
    return pneu_db


@router.post("/", response_model=ColetaSchema, status_code=status.HTTP_201_CREATED)
def create_coleta(
    *, db: Session = Depends(get_db), obj_in: ColetaCreate
) -> Any:
    # CALCULA TOTAIS
    total_valor = sum(p.valor for p in obj_in.pneus)
    qtd_pneu = len(obj_in.pneus)

    if obj_in.numos:
        existing = db.query(Coleta).filter(Coleta.numos == obj_in.numos).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registro Já Existe")

    db_obj = Coleta(
        id_contato=obj_in.id_contato if obj_in.id_contato and obj_in.id_contato > 0 else None,
        qpneu=qtd_pneu,
        vtotal=total_valor,
        msgmob=obj_in.msgmob,
        id_vendedor=obj_in.id_vendedor,
        numos=obj_in.numos,
        cpfcnpj=obj_in.cpfcnpj,
        nome=obj_in.nome,
        endereco=obj_in.endereco,
        cidade=obj_in.cidade,
        uf=obj_in.uf,
        fone=obj_in.fone,
        veiculo=obj_in.veiculo,
        formapagto=obj_in.formapagto,
        vendedor_ocr=obj_in.vendedor_ocr,
        servicocomgarantia=obj_in.servicocomgarantia,
        tipoveiculo=obj_in.tipoveiculo,
        somentesepar=obj_in.somentesepar,
        podealterardesenho=obj_in.podealterardesenho,
        status=obj_in.status,
    )
    db.add(db_obj)
    db.flush()  # Gera ID

    for pneu_in in obj_in.pneus:
        db_pneu = ColetaPneu(
            id_coleta=db_obj.id,
            id_medida=pneu_in.id_medida if pneu_in.id_medida else None,
            id_marca=pneu_in.id_marca if pneu_in.id_marca else None,
            id_desenho=pneu_in.id_desenho if pneu_in.id_desenho else None,
            id_recap=pneu_in.id_recap if pneu_in.id_recap else None,
            valor=pneu_in.valor,
            piso=pneu_in.piso,
            numserie=pneu_in.numserie,
            numfogo=pneu_in.numfogo,
            dot=pneu_in.dot,
            doriginal=pneu_in.doriginal,
            qreforma=pneu_in.qreforma,
            uso=pneu_in.uso,
            garantia=pneu_in.garantia,
            obs=pneu_in.obs,
            medidanova=pneu_in.medidanova,
            marcanova=pneu_in.marcanova,
            desenhonovo=pneu_in.desenhonovo,
        )
        db.add(db_pneu)

    db.commit()
    db.refresh(db_obj)

    return db.query(Coleta).options(
        joinedload(Coleta.pneus),
        joinedload(Coleta.contato),
        joinedload(Coleta.vendedor),
    ).filter(Coleta.id == db_obj.id).first()


@router.get("/{id}", response_model=ColetaSchema)
def read_coleta_by_id(
    id: int,
    db: Session = Depends(get_db),
) -> Any:
    coleta = db.query(Coleta).options(
        joinedload(Coleta.pneus),
        joinedload(Coleta.contato),
        joinedload(Coleta.vendedor),
    ).filter(Coleta.id == id).first()
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    return coleta


@router.put("/{id}", response_model=ColetaSchema)
def update_coleta(
    *, db: Session = Depends(get_db), id: int, obj_in: ColetaUpdate
) -> Any:
    db_obj = db.query(Coleta).options(joinedload(Coleta.pneus)).filter(Coleta.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")

    total_valor = sum(p.valor for p in obj_in.pneus)
    qtd_pneu = len(obj_in.pneus)

    db_obj.id_contato = obj_in.id_contato if obj_in.id_contato and obj_in.id_contato > 0 else None
    db_obj.msgmob = obj_in.msgmob
    db_obj.id_vendedor = obj_in.id_vendedor
    db_obj.qpneu = qtd_pneu
    db_obj.vtotal = total_valor
    db_obj.cpfcnpj = obj_in.cpfcnpj
    db_obj.nome = obj_in.nome
    db_obj.endereco = obj_in.endereco
    db_obj.cidade = obj_in.cidade
    db_obj.uf = obj_in.uf
    db_obj.fone = obj_in.fone
    db_obj.veiculo = obj_in.veiculo
    db_obj.formapagto = obj_in.formapagto
    db_obj.vendedor_ocr = obj_in.vendedor_ocr
    db_obj.servicocomgarantia = obj_in.servicocomgarantia
    db_obj.tipoveiculo = obj_in.tipoveiculo
    db_obj.somentesepar = obj_in.somentesepar
    db_obj.podealterardesenho = obj_in.podealterardesenho
    db_obj.status = obj_in.status

    existing_pneus = {p.id: p for p in db_obj.pneus}
    updated_pneu_ids = set()

    for pneu_in in obj_in.pneus:
        if pneu_in.id and pneu_in.id in existing_pneus:
            pneu_obj = existing_pneus[pneu_in.id]
            pneu_update = pneu_in.model_dump(exclude_unset=True, exclude={'id'})
            for f, v in pneu_update.items():
                setattr(pneu_obj, f, v)
            # pneu_obj.id_contato = db_obj.id_contato # Removed as it's not in ColetaPneu model
            # pneu_obj.id_vendedor = db_obj.id_vendedor or 1 # Removed as it's not in ColetaPneu model
            updated_pneu_ids.add(pneu_in.id)
        else:
            new_pneu = ColetaPneu(
                id_coleta=db_obj.id,
                id_medida=pneu_in.id_medida if pneu_in.id_medida else None,
                id_marca=pneu_in.id_marca if pneu_in.id_marca else None,
                id_desenho=pneu_in.id_desenho if pneu_in.id_desenho else None,
                id_recap=pneu_in.id_recap if pneu_in.id_recap else None,
                valor=pneu_in.valor,
                piso=pneu_in.piso,
                numserie=pneu_in.numserie,
                numfogo=pneu_in.numfogo,
                dot=pneu_in.dot,
                doriginal=pneu_in.doriginal,
                qreforma=pneu_in.qreforma,
                uso=pneu_in.uso,
                garantia=pneu_in.garantia,
                obs=pneu_in.obs,
                medidanova=pneu_in.medidanova,
                marcanova=pneu_in.marcanova,
                desenhonovo=pneu_in.desenhonovo,
            )
            db.add(new_pneu)

    for pid, pobj in list(existing_pneus.items()):
        if pid not in updated_pneu_ids:
            db.delete(pobj)

    db.commit()
    db.refresh(db_obj)
    return db.query(Coleta).options(joinedload(Coleta.pneus), joinedload(Coleta.contato), joinedload(Coleta.vendedor)).filter(Coleta.id == id).first()


@router.delete("/{id}", response_model=ColetaSchema)
def delete_coleta(
    *, db: Session = Depends(get_db), id: int
) -> Any:
    obj = db.query(Coleta).filter(Coleta.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    db.delete(obj)
    db.commit()
    return obj


@router.post("/{id}/gerar-os", response_model=OrdemServicoResponse)
def gerar_os_from_coleta(
    id: int,
    db: Session = Depends(get_db),
) -> Any:
    try:
        coleta = db.query(Coleta).options(joinedload(Coleta.pneus)).filter(Coleta.id == id).first()
        if not coleta:
            raise HTTPException(status_code=404, detail="Coleta não encontrada")

        if not coleta.numos:
            raise HTTPException(status_code=400, detail="Esta coleta não possui um Número de OS preenchido. Edite a coleta e informe o número antes de gerar.")

        if coleta.status == 'GOS':
            raise HTTPException(status_code=400, detail="Esta coleta já foi exportada para uma OS anteriormente.")

        if coleta.status != 'Ok':
            raise HTTPException(status_code=400, detail=f"Esta coleta está com status '{coleta.status or 'Pendente'}'. É necessário validar todos os campos e deixar o status como 'Ok' antes de gerar.")

        existing_os = db.query(OrdemServico).filter(OrdemServico.numos == str(coleta.numos)).first()
        if existing_os:
            raise HTTPException(status_code=400, detail="Registro Já Existe")

        new_os = OrdemServico(
            numos=str(coleta.numos),
            id_contato=coleta.id_contato,
            id_vendedor=coleta.id_vendedor,
            id_empresa=1,
            id_coleta=coleta.id,
            status="ABERTA",
        )
        db.add(new_os)
        db.flush()

        for pneu in coleta.pneus:
            new_pneu = OSPneu(
                id_ordem=new_os.id,
                id_medida=pneu.id_medida,
                id_marca=pneu.id_marca,
                id_desenho=pneu.id_desenho,
                id_recap=pneu.id_recap,
                id_empresa=1,
                numserie=pneu.numserie,
                dot=pneu.dot,
                valor=pneu.valor,
                statuspro="AGUARDANDO",
                obs=pneu.obs,
                # Fields below were in the old OSPneu schema but might not be in the current one
                id_contato=coleta.id_contato,
                id_vendedor=coleta.id_vendedor or 1,
                vrtotal=pneu.valor,
                vrtabela=pneu.valor,
                quant=1,
                qreforma=0,
                vrservico=pneu.valor,
                valornfe=pneu.valor
            )
            db.add(new_pneu)

        coleta.status = 'GOS'
        db.commit()
        db.refresh(new_os)
        return db.query(OrdemServico).options(joinedload(OrdemServico.pneus)).filter(OrdemServico.id == new_os.id).first()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao gerar OS: {str(e)}")
