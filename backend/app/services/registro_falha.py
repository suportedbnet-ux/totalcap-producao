from sqlalchemy.orm import Session
from backend.app.repositories.registro_falha import registro_falha_repo
from backend.app.schemas.registro_falha import RegistroFalhaCreate

class RegistroFalhaService:
    def get_registros(self, db: Session, skip: int = 0, limit: int = 100, id_pneu: int = None):
        return registro_falha_repo.get_multi_with_names(db, skip=skip, limit=limit, id_pneu=id_pneu)

    def get_registro(self, db: Session, id: int):
        return registro_falha_repo.get(db, id=id)

    def create_registro(self, db: Session, obj_in: RegistroFalhaCreate):
        return registro_falha_repo.create(db, obj_in=obj_in)

    def update_registro(self, db: Session, id: int, obj_in: dict):
        db_obj = registro_falha_repo.get(db, id=id)
        if db_obj:
            return registro_falha_repo.update(db, db_obj=db_obj, obj_in=obj_in)
        return None

    def delete_registro(self, db: Session, id: int):
        return registro_falha_repo.remove(db, id=id)

registro_falha_service = RegistroFalhaService()
