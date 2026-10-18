
from sqlalchemy import text
from app.database import engine

with engine.connect() as connection:
    result = connection.execute(text("SELECT version()"))
    print("PostgreSQL connection successful!")
    print(result.scalar())
