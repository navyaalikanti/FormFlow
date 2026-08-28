from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_admin
from app.database.session import get_db
from app.models.admin import Admin
from app.schemas.auth import AdminResponse, LoginRequest, MessageResponse, RegisterRequest, TokenResponse, ChangePasswordRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        admin, token = AuthService.register_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return TokenResponse(access_token=token, admin=AdminResponse.model_validate(admin))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        admin, token = AuthService.login_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return TokenResponse(access_token=token, admin=AdminResponse.model_validate(admin))


@router.get("/me", response_model=AdminResponse)
def me(current_admin: Admin = Depends(get_current_admin)) -> AdminResponse:
    return AdminResponse.model_validate(current_admin)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
) -> MessageResponse:
    try:
        AuthService.change_password(db, current_admin.id, payload)
        return MessageResponse(message="Password updated successfully.")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/me", response_model=MessageResponse)
def delete_account(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
) -> MessageResponse:
    AuthService.delete_account(db, current_admin.id)
    return MessageResponse(message="Account deleted successfully.")
