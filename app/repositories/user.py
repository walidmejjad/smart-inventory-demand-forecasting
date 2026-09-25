from sqlalchemy import func, select

from app.models import User
from app.repositories._base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(func.lower(User.email) == email.lower())
        return self.db.scalar(statement)
