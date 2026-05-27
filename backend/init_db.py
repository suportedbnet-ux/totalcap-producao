import os
import sys

# Ajuste de PATH
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import engine, Base, SessionLocal
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.setor import Setor
from app.models.operador import Operador
from app.models.contato import Contato
from app.models.ordem_servico import OrdemServico, OSPneu
from app.models.apontamento import Apontamento
from app.models.mobos import MobOS, MobPneu
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init():
    print("Iniciando criação das tabelas no novo banco...")
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas com sucesso!")

    db = SessionLocal()
    try:
        # Verifica se já existe admin
        admin = db.query(Usuario).filter(Usuario.email == "admin@totalcap.com").first()
        if not admin:
            print("Criando usuário admin padrão...")
            new_admin = Usuario(
                nome="Administrador",
                email="admin@totalcap.com",
                hashed_password=pwd_context.hash("admin123"),
                is_active=True,
                is_superuser=True
            )
            db.add(new_admin)
            
            # Criar uma empresa padrão para evitar erros de FK
            empresa = Empresa(id=1, nome="Minha Empresa", ativo=True)
            db.add(empresa)
            
            db.commit()
            print("Usuário admin e Empresa 01 criados!")
        else:
            print("Usuário admin já existe.")
    except Exception as e:
        print(f"Erro ao popular banco: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init()
