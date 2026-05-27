from sqlalchemy import create_engine, text

URL = "postgresql://neondb_owner:npg_TBWgl4SM1Ejn@ep-morning-water-acsrbm4u-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

def check_users():
    engine = create_engine(URL)
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT id, email, nome FROM usuario"))
            for row in res:
                print(f"ID: {row[0]} | Email: {row[1]} | Nome: {row[2]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
