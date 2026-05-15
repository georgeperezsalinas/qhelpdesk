from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "QHELP DESK ERP"
    VERSION: str = "1.0.0"

    # JWT
    SECRET_KEY: str = "change_me_access_secret_key"
    REFRESH_SECRET_KEY: str = "change_me_refresh_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480      # 8 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7          # 7 días

    # Base de datos
    DATABASE_URL: str = "postgresql://helpdesk:helpdesk@localhost:5432/helpdesk_db"
    REDIS_URL: str = "redis://localhost:6379"

    # LDAP / Active Directory
    LDAP_SERVER: str = ""
    LDAP_BASE_DN: str = ""
    LDAP_BIND_DN: str = ""
    LDAP_BIND_PASSWORD: str = ""

    # Correo (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "ventas@qsdsoft.com"
    EMAIL_FROM_NAME: str = "QHelpDesk"

    # Correo legacy SMTP (no usado, reservado para futuro)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
