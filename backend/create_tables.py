
from app.database import Base, engine
from app.models import User, Movie, Show, Seat, Booking

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
print("Registered models: User, Movie, Show, Seat, Booking")
