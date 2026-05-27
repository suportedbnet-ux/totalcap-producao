from database import SessionLocal
from app.models.dispositivo import Dispositivo

db = SessionLocal()
try:
    dispositivos = db.query(Dispositivo).all()
    print(f"Total de dispositivos: {len(dispositivos)}")
    for d in dispositivos:
        print(f"ID: {d.id} | Android_ID: {d.android_id} | Setor: {d.id_setor} | Autorizado: {d.autorizado}")
finally:
    db.close()
