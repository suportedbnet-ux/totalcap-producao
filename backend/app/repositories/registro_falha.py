from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.registro_falha import RegistroFalha
from backend.app.models.setor import Setor
from backend.app.models.operador import Operador
from backend.app.models.falha import Falha
from backend.app.models.ordem_servico import OSPneu
from backend.app.schemas.registro_falha import RegistroFalhaCreate

class RegistroFalhaRepository:
    def get_multi_with_names(self, db: Session, skip: int = 0, limit: int = 100, id_pneu: int = None):
        query = db.query(
            RegistroFalha,
            Setor.descricao.label("setor_nome"),
            Operador.nome.label("operador_nome"),
            Falha.descricao.label("falha_nome"),
            OSPneu.numserie.label("numserie")
        ).outerjoin(Setor, RegistroFalha.id_setor == Setor.id)\
         .outerjoin(Operador, RegistroFalha.id_operador == Operador.id)\
         .outerjoin(Falha, RegistroFalha.id_falha == Falha.id)\
         .outerjoin(OSPneu, RegistroFalha.id_pneu == OSPneu.id)
        
        if id_pneu:
            query = query.filter(RegistroFalha.id_pneu == id_pneu)
            
        query = query.order_by(desc(RegistroFalha.datareg))
         
        results = query.offset(skip).limit(limit).all()
        
        final_results = []
        for reg, setor_nome, op_nome, falha_nome, numserie in results:
            reg_dict = {
                "id": reg.id,
                "id_setor": reg.id_setor,
                "id_operador": reg.id_operador,
                "id_falha": reg.id_falha,
                "id_pneu": reg.id_pneu,
                "datareg": reg.datareg,
                "motivo": reg.motivo,
                "valor": reg.valor,
                "codbarra": reg.codbarra,
                "setor_nome": setor_nome,
                "operador_nome": op_nome,
                "falha_nome": falha_nome,
                "numserie": numserie
            }
            final_results.append(reg_dict)
            
        return final_results

    def get_with_names(self, db: Session, id: int):
        query = db.query(
            RegistroFalha,
            Setor.descricao.label("setor_nome"),
            Operador.nome.label("operador_nome"),
            Falha.descricao.label("falha_nome"),
            OSPneu.numserie.label("numserie")
        ).outerjoin(Setor, RegistroFalha.id_setor == Setor.id)\
         .outerjoin(Operador, RegistroFalha.id_operador == Operador.id)\
         .outerjoin(Falha, RegistroFalha.id_falha == Falha.id)\
         .outerjoin(OSPneu, RegistroFalha.id_pneu == OSPneu.id)\
         .filter(RegistroFalha.id == id)
        
        result = query.first()
        if not result:
            return None
            
        reg, setor_nome, op_nome, falha_nome, numserie = result
        return {
            "id": reg.id,
            "id_setor": reg.id_setor,
            "id_operador": reg.id_operador,
            "id_falha": reg.id_falha,
            "id_pneu": reg.id_pneu,
            "datareg": reg.datareg,
            "motivo": reg.motivo,
            "valor": reg.valor,
            "codbarra": reg.codbarra,
            "setor_nome": setor_nome,
            "operador_nome": op_nome,
            "falha_nome": falha_nome,
            "numserie": numserie
        }

    def create(self, db: Session, obj_in: RegistroFalhaCreate):
        import traceback
        try:
            db_obj = RegistroFalha(**obj_in.model_dump())
            db.add(db_obj)
            db.commit()
            return self.get_with_names(db, db_obj.id)
        except Exception:
            db.rollback()
            traceback.print_exc()
            raise

    def update(self, db: Session, db_obj: RegistroFalha, obj_in: dict):
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        db.add(db_obj)
        db.commit()
        return self.get_with_names(db, db_obj.id)

    def get(self, db: Session, id: int) -> RegistroFalha | None:
        return db.query(RegistroFalha).filter(RegistroFalha.id == id).first()

    def remove(self, db: Session, id: int) -> RegistroFalha | None:
        obj = self.get(db, id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj

registro_falha_repo = RegistroFalhaRepository()
