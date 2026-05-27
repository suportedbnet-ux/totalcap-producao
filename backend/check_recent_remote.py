from sqlalchemy import create_engine, text

URL = "postgresql://neondb_owner:npg_TBWgl4SM1Ejn@ep-morning-water-acsrbm4u-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

def check_recent_data():
    engine = create_engine(URL)
    try:
        with engine.connect() as conn:
            print("Recent Contatos:")
            res = conn.execute(text("SELECT id, nome FROM contato ORDER BY id DESC LIMIT 5"))
            for row in res:
                print(f"  ID: {row[0]} | Nome: {row[1]}")
                
            print("\nRecent Vendedores:")
            res = conn.execute(text("SELECT id, nome FROM vendedor ORDER BY id DESC LIMIT 5"))
            for row in res:
                print(f"  ID: {row[0]} | Nome: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_recent_data()
