from sqlalchemy import select
from sqlalchemy.orm import Session

from app.authentication.jwt import create_access_token, hash_password, verify_password
from app.models.admin import Admin
from app.schemas.auth import LoginRequest, RegisterRequest, ChangePasswordRequest


class AuthService:
    @staticmethod
    def get_admin_by_email(db: Session, email: str) -> Admin | None:
        statement = select(Admin).where(Admin.email == email.lower())
        return db.scalars(statement).first()

    @staticmethod
    def register_admin(db: Session, payload: RegisterRequest) -> tuple[Admin, str]:
        existing_admin = AuthService.get_admin_by_email(db, payload.email)
        if existing_admin:
            raise ValueError("An admin with this email already exists.")

        admin = Admin(
            name=payload.name.strip(),
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        token = create_access_token(subject=str(admin.id))
        return admin, token

    @staticmethod
    def login_admin(db: Session, payload: LoginRequest) -> tuple[Admin, str]:
        admin = AuthService.get_admin_by_email(db, payload.email.lower())
        if not admin or not verify_password(payload.password, admin.password_hash):
            raise ValueError("Invalid email or password.")
        token = create_access_token(subject=str(admin.id))
        return admin, token

    @staticmethod
    def change_password(db: Session, admin_id: int, payload: ChangePasswordRequest) -> None:
        admin = db.get(Admin, admin_id)
        if not admin or not verify_password(payload.current_password, admin.password_hash):
            raise ValueError("Incorrect current password.")
        
        admin.password_hash = hash_password(payload.new_password)
        db.commit()

    @staticmethod
    def delete_account(db: Session, admin_id: int) -> None:
        from app.models.form_platform import Form
        
        # Delete all forms owned by this admin
        forms = db.scalars(select(Form).where(Form.owner_admin_id == admin_id)).all()
        for form in forms:
            db.delete(form)
            
        admin = db.get(Admin, admin_id)
        if admin:
            db.delete(admin)
            
        db.commit()
