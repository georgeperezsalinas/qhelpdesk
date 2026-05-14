from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.usuario import Usuario, RolUsuario

def crear_usuarios_iniciales():
    db = SessionLocal()
    try:
        usuarios = [
            {
                "username": "admin",
                "email": "admin@entidad.gob.pe",
                "nombre": "Administrador",
                "apellido": "Sistema",
                "password": "Admin2024*",
                "rol": RolUsuario.jefe,
                "area": "Oficina de Sistemas",
            },
            {
                "username": "tecnico1",
                "email": "tecnico1@entidad.gob.pe",
                "nombre": "Técnico",
                "apellido": "Uno",
                "password": "Tecnico2024*",
                "rol": RolUsuario.especialista,
                "area": "Oficina de Sistemas",
            },
            {
                "username": "mesa1",
                "email": "mesa1@entidad.gob.pe",
                "nombre": "Mesa",
                "apellido": "Ayuda",
                "password": "Mesa2024*",
                "rol": RolUsuario.mesa_ayuda,
                "area": "Oficina de Sistemas",
            },
            {
                "username": "usuario1",
                "email": "usuario1@entidad.gob.pe",
                "nombre": "Usuario",
                "apellido": "Final",
                "password": "Usuario2024*",
                "rol": RolUsuario.usuario_final,
                "area": "Administración",
            },
        ]

        for u in usuarios:
            existe = db.query(Usuario).filter(Usuario.username == u["username"]).first()
            if not existe:
                nuevo = Usuario(
                    username=u["username"],
                    email=u["email"],
                    nombre=u["nombre"],
                    apellido=u["apellido"],
                    hashed_password=get_password_hash(u["password"]),
                    rol=u["rol"],
                    area=u["area"],
                    activo=True,
                )
                db.add(nuevo)
                print(f"  ✔ Creado: {u['username']} ({u['rol']})")
            else:
                print(f"  — Ya existe: {u['username']}")

        db.commit()
        print("\nUsuarios iniciales listos.")
    finally:
        db.close()

if __name__ == "__main__":
    print("Creando usuarios iniciales...\n")
    crear_usuarios_iniciales()
