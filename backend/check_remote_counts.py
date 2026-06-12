from sqlalchemy import create_engine, text

URL = "postgresql://neondb_owner:npg_TBWgl4SM1Ejn@ep-morning-water-acsrbm4u-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

def check_remote():
    engine = create_engine(URL)
    try:
        tables = ["usuario", "vendedor", "cliente", "contato", "ordemservico", "empresa", "apontamento"]
        for table in tables:
            try:
                with engine.connect() as conn:
                    count = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                    print(f"Table '{table}': {count} records")
            except Exception as e:
                print(f"Table '{table}': Error")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    check_remote()
