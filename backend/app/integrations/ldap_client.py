from app.core.config import settings

class LDAPClient:
    """Autenticación contra Active Directory vía LDAP"""
    def authenticate(self, username: str, password: str) -> bool:
        if not settings.LDAP_SERVER:
            return False
        try:
            import ldap
            conn = ldap.initialize(settings.LDAP_SERVER)
            conn.simple_bind_s(f"{username}@{settings.LDAP_BASE_DN}", password)
            return True
        except Exception:
            return False

    def get_user_info(self, username: str) -> dict:
        """Obtiene datos del usuario desde AD (email, nombre, área)"""
        return {}
