from sqlalchemy import create_engine, inspect
from config import settings

engine = create_engine(settings.POSTGRES_URL)
inspector = inspect(engine)

for table_name in ["coleta", "coleta_pneu"]:
    print(f"\nTable: {table_name}")
    columns = inspector.get_columns(table_name)
    for column in columns:
        print(f" - {column['name']} ({column['type']})")
