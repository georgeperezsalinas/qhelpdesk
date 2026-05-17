"""
seed_data.py – Datos iniciales completos para QHELP DESK ERP
Ejecutar: python -m app.core.seed_data
"""
from datetime import date, datetime, timedelta
from app.core.database import SessionLocal
import bcrypt

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def run():
    db = SessionLocal()
    try:
        _sedes(db)
        _proveedores(db)
        _usuarios(db)
        _articulos_kb(db)
        _articulos_kb_extra(db)
        _equipos(db)
        _licencias(db)
        _cronogramas(db)
        _politicas_backup(db)
        _servidores(db)
        _dispositivos_red(db)
        _lineas_telefonicas(db)
        _contratos(db)
        db.commit()
        print("\n✅  Seed data cargado correctamente.\n")
    except Exception as e:
        db.rollback()
        print(f"\n❌  Error: {e}")
        raise
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
def _sedes(db):
    from app.models.sede import Sede
    if db.query(Sede).count(): return
    sedes = [
        Sede(nombre="Sede Central – Lima",     codigo="LIMA-CENTRAL", direccion="Av. Abancay 123, Cercado de Lima",
             distrito="Cercado de Lima", provincia="Lima", region="Lima", telefono="01-4271200", es_central=True, activa=True),
        Sede(nombre="Sede Norte – Trujillo",   codigo="TRU-01",       direccion="Jr. Independencia 456, Trujillo",
             distrito="Trujillo",       provincia="Trujillo",  region="La Libertad", activa=True),
        Sede(nombre="Sede Sur – Arequipa",     codigo="AQP-01",       direccion="Calle Mercaderes 789, Arequipa",
             distrito="Cercado",        provincia="Arequipa",  region="Arequipa",    activa=True),
        Sede(nombre="Sede Oriente – Iquitos",  codigo="IQT-01",       direccion="Av. Abelardo Quiñones 321, Iquitos",
             distrito="Iquitos",        provincia="Maynas",    region="Loreto",      activa=True),
    ]
    db.add_all(sedes); db.flush()
    print(f"  ✔ Sedes: {len(sedes)}")


def _proveedores(db):
    from app.models.proveedor import Proveedor
    if db.query(Proveedor).count(): return
    proveedores = [
        Proveedor(razon_social="Tecnología & Soluciones SAC",  ruc="20501234567", contacto="Carlos Ríos",
                  telefono="01-3456789", email="ventas@tecnologia.pe",   categoria="hardware"),
        Proveedor(razon_social="Microsoft Perú SRL",           ruc="20502345678", contacto="Ana García",
                  telefono="01-6112000", email="licencias@microsoft.com", categoria="software"),
        Proveedor(razon_social="Claro Empresas",               ruc="20503456789", contacto="Luis Mendoza",
                  telefono="800-9999",   email="empresas@claro.com.pe",   categoria="telecomunicaciones"),
        Proveedor(razon_social="Lenovo Perú",                  ruc="20504567890", contacto="Sofía Torres",
                  telefono="01-6115000", email="ventas@lenovo.pe",         categoria="hardware"),
        Proveedor(razon_social="HP Inc. Perú SAC",             ruc="20505678901", contacto="Marco Silva",
                  telefono="01-6116000", email="ventas@hp.com.pe",         categoria="hardware"),
    ]
    db.add_all(proveedores); db.flush()
    print(f"  ✔ Proveedores: {len(proveedores)}")


def _usuarios(db):
    from app.models.usuario import Usuario, RolUsuario
    from app.models.sede import Sede

    sede_central  = db.query(Sede).filter(Sede.codigo == "LIMA-CENTRAL").first()
    sede_norte    = db.query(Sede).filter(Sede.codigo == "TRU-01").first()
    sede_sur      = db.query(Sede).filter(Sede.codigo == "AQP-01").first()
    sede_oriente  = db.query(Sede).filter(Sede.codigo == "IQT-01").first()

    existentes = {u.username for u in db.query(Usuario).all()}

    candidatos = [
        # ── Alta Dirección ──────────────────────────────────────────────────
        Usuario(username="director",   email="director@entidad.gob.pe",
                nombre="Roberto",      apellido="Mendoza Paredes",
                hashed_password=hash_pw("Director2024*"),
                rol=RolUsuario.alta_direccion,
                area="Dirección General", sede_id=sede_central.id if sede_central else None),
        Usuario(username="subdirector", email="subdirector@entidad.gob.pe",
                nombre="Carmen",       apellido="Huanca Flores",
                hashed_password=hash_pw("SubDir2024*"),
                rol=RolUsuario.alta_direccion,
                area="Sub Dirección", sede_id=sede_central.id if sede_central else None),

        # ── Jefe de área ────────────────────────────────────────────────────
        Usuario(username="jefesistemas", email="jefesistemas@entidad.gob.pe",
                nombre="Eduardo",      apellido="Castillo Ríos",
                hashed_password=hash_pw("Jefe2024*"),
                rol=RolUsuario.jefe, cargo="Jefe de la Oficina de Sistemas",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                carga_maxima=50),

        # ── Especialistas ───────────────────────────────────────────────────
        Usuario(username="esp_redes",   email="esp.redes@entidad.gob.pe",
                nombre="Miguel",        apellido="Torres Vega",
                hashed_password=hash_pw("Esp2024*"),
                rol=RolUsuario.especialista, cargo="Especialista en Redes",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                skills="redes,firewall,vpn,switches", carga_maxima=15),
        Usuario(username="esp_servidores", email="esp.servidores@entidad.gob.pe",
                nombre="Patricia",      apellido="Luna Campos",
                hashed_password=hash_pw("Esp2024*"),
                rol=RolUsuario.especialista, cargo="Especialista en Servidores",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                skills="servidores,bases_datos,backup,linux,windows_server", carga_maxima=15),
        Usuario(username="esp_seguridad", email="esp.seguridad@entidad.gob.pe",
                nombre="Andrés",        apellido="Poma Ccari",
                hashed_password=hash_pw("Esp2024*"),
                rol=RolUsuario.especialista, cargo="Especialista en Seguridad",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                skills="seguridad,firewall,antivirus,correo", carga_maxima=15),

        # ── Mesa de ayuda ───────────────────────────────────────────────────
        Usuario(username="mesa1",      email="mesa1@entidad.gob.pe",
                nombre="Lucía",        apellido="Quispe Mamani",
                hashed_password=hash_pw("Mesa2024*"),
                rol=RolUsuario.mesa_ayuda, cargo="Técnico Mesa de Ayuda",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                skills="hardware,software,impresoras,office", carga_maxima=20),
        Usuario(username="mesa2",      email="mesa2@entidad.gob.pe",
                nombre="José",         apellido="Vargas Huallpa",
                hashed_password=hash_pw("Mesa2024*"),
                rol=RolUsuario.mesa_ayuda, cargo="Técnico Mesa de Ayuda",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                skills="hardware,software,accesos,office", carga_maxima=20),
        Usuario(username="mesa3",      email="mesa3@entidad.gob.pe",
                nombre="Rosa",         apellido="Chávez Tello",
                hashed_password=hash_pw("Mesa2024*"),
                rol=RolUsuario.mesa_ayuda, cargo="Técnico Mesa de Ayuda",
                area="Oficina de Sistemas", sede_id=sede_central.id if sede_central else None,
                skills="hardware,software,telefonia,office", carga_maxima=20),

        # ── Técnico de sedes remotas ────────────────────────────────────────
        Usuario(username="tec_norte",  email="tec.norte@entidad.gob.pe",
                nombre="Fernando",     apellido="Alva Reyes",
                hashed_password=hash_pw("Tec2024*"),
                rol=RolUsuario.especialista, cargo="Técnico TI – Sede Norte",
                area="Oficina de Sistemas", sede_id=sede_norte.id if sede_norte else None,
                skills="hardware,software,redes,impresoras", carga_maxima=15),
        Usuario(username="tec_sur",    email="tec.sur@entidad.gob.pe",
                nombre="Gladys",       apellido="Apaza Condori",
                hashed_password=hash_pw("Tec2024*"),
                rol=RolUsuario.especialista, cargo="Técnico TI – Sede Sur",
                area="Oficina de Sistemas", sede_id=sede_sur.id if sede_sur else None,
                skills="hardware,software,redes,impresoras", carga_maxima=15),

        # ── Usuarios finales ────────────────────────────────────────────────
        Usuario(username="ufin_adm",   email="ufin.adm@entidad.gob.pe",
                nombre="María",        apellido="Sánchez López",
                hashed_password=hash_pw("User2024*"),
                rol=RolUsuario.usuario_final, cargo="Asistente Administrativo",
                area="Administración", sede_id=sede_central.id if sede_central else None),
        Usuario(username="ufin_cont",  email="ufin.cont@entidad.gob.pe",
                nombre="Arturo",       apellido="Flores Muñoz",
                hashed_password=hash_pw("User2024*"),
                rol=RolUsuario.usuario_final, cargo="Contador",
                area="Contabilidad", sede_id=sede_central.id if sede_central else None),
        Usuario(username="ufin_log",   email="ufin.log@entidad.gob.pe",
                nombre="Sandra",       apellido="Cano Peña",
                hashed_password=hash_pw("User2024*"),
                rol=RolUsuario.usuario_final, cargo="Especialista en Logística",
                area="Logística", sede_id=sede_central.id if sede_central else None),

        # ── Usuarios externos (sedes remotas) ───────────────────────────────
        Usuario(username="uext_norte", email="uext.norte@entidad.gob.pe",
                nombre="Raúl",         apellido="Gutiérrez Arce",
                hashed_password=hash_pw("Ext2024*"),
                rol=RolUsuario.usuario_externo, cargo="Coordinador Regional",
                area="Coordinación Norte", sede_id=sede_norte.id if sede_norte else None),
        Usuario(username="uext_sur",   email="uext.sur@entidad.gob.pe",
                nombre="Elena",        apellido="Mamani Ticona",
                hashed_password=hash_pw("Ext2024*"),
                rol=RolUsuario.usuario_externo, cargo="Coordinador Regional",
                area="Coordinación Sur", sede_id=sede_sur.id if sede_sur else None),
        Usuario(username="uext_oriente", email="uext.oriente@entidad.gob.pe",
                nombre="César",        apellido="Ruiz Panduro",
                hashed_password=hash_pw("Ext2024*"),
                rol=RolUsuario.usuario_externo, cargo="Coordinador Regional",
                area="Coordinación Oriente", sede_id=sede_oriente.id if sede_oriente else None),
    ]
    nuevos = [u for u in candidatos if u.username not in existentes]
    if not nuevos:
        print("  — Usuarios ya existen")
        return
    db.add_all(nuevos); db.flush()
    print(f"  ✔ Usuarios nuevos: {len(nuevos)}")


def _articulos_kb(db):
    from app.models.conocimiento import ArticuloKB, EstadoArticulo
    if db.query(ArticuloKB).count(): return
    articulos = [
        ArticuloKB(titulo="Cómo restablecer contraseña de Windows",
                   contenido="1. Ir a pantalla de inicio\n2. Clic en '¿Olvidaste tu contraseña?'\n3. Ingresar usuario de dominio\n4. Contactar a mesa de ayuda con el código generado.",
                   categoria="acceso", tags="contraseña,windows,dominio", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Configurar VPN desde fuera de la oficina",
                   contenido="1. Descargar el cliente VPN desde el portal interno\n2. Ingresar servidor: vpn.entidad.gob.pe\n3. Usuario: mismo del dominio\n4. Si falla, verificar que el certificado esté vigente.",
                   categoria="vpn", tags="vpn,acceso_remoto,sedes", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Impresora no imprime – pasos básicos",
                   contenido="1. Verificar que la impresora esté encendida y en línea\n2. Revisar cola de impresión (Panel de Control > Dispositivos)\n3. Reiniciar el servicio Print Spooler\n4. Reinstalar el driver desde la red compartida: \\\\servidor\\drivers.",
                   categoria="hardware", tags="impresora,driver,hardware", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Correo institucional – configurar en Outlook",
                   contenido="1. Abrir Outlook\n2. Agregar cuenta: correo@entidad.gob.pe\n3. Servidor Exchange: mail.entidad.gob.pe\n4. Usar credenciales del dominio.",
                   categoria="correo", tags="correo,outlook,exchange", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Solicitar acceso a sistema de información",
                   contenido="Crear ticket con categoría 'Acceso', indicar:\n- Nombre del sistema\n- Nivel de acceso requerido\n- Justificación\n- Aprobación del jefe inmediato (adjuntar correo o memorándum).",
                   categoria="acceso", tags="acceso,permisos,sistemas", estado=EstadoArticulo.publicado),
    ]
    db.add_all(articulos); db.flush()
    print(f"  ✔ Artículos KB: {len(articulos)}")


def _articulos_kb_extra(db):
    from app.models.conocimiento import ArticuloKB, EstadoArticulo
    extras = [
        # SOFTWARE
        ArticuloKB(titulo="Error 'No se puede abrir el archivo' en Office",
                   contenido="1. Verificar que el archivo no esté en uso por otro usuario.\n2. Revisar que tenga permisos de lectura/escritura sobre la carpeta.\n3. Si el archivo está en red, mapear la unidad de red correctamente (\\\\servidor\\datos).\n4. Reparar Office: Panel de Control > Programas > Microsoft Office > Cambiar > Reparación rápida.",
                   categoria="software", tags="office,archivo,error", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Cómo instalar un programa nuevo en mi equipo",
                   contenido="Los usuarios no tienen permisos de instalación por política de seguridad.\n\nPasos:\n1. Crear un ticket de categoría 'Software' indicando el programa a instalar y su justificación.\n2. El jefe de área debe aprobar la solicitud.\n3. Mesa de ayuda instalará el software en un plazo de 24 horas hábiles.\n\nNota: No intente instalar software por su cuenta; puede generar alertas de seguridad.",
                   categoria="software", tags="instalacion,software,permisos", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Windows Update está causando lentitud en mi PC",
                   contenido="1. Verifique si hay actualizaciones en proceso: Configuración > Windows Update.\n2. Si el equipo lleva más de 30 minutos lento, reinícielo fuera del horario de trabajo.\n3. Si persiste, cree un ticket indicando: versión de Windows, RAM disponible (Task Manager > Performance) y hora aproximada de inicio del problema.\n4. Mesa de ayuda puede reprogramar las actualizaciones para horarios nocturnos.",
                   categoria="software", tags="windows,actualizacion,lentitud", estado=EstadoArticulo.publicado),
        # RED
        ArticuloKB(titulo="No tengo acceso a Internet desde mi puesto",
                   contenido="Pasos a seguir:\n1. Verificar que el cable de red esté bien conectado (luz verde en el puerto).\n2. Reiniciar el adaptador de red: Configuración > Redes > Deshabilitar / Habilitar.\n3. Probar con otro cable o puerto del switch.\n4. Verificar si otros compañeros en la misma área tienen el mismo problema (puede ser caída del switch).\n5. Si el problema persiste, crear ticket con categoría 'Red' indicando número de PC y ubicación física.",
                   categoria="red", tags="internet,red,cable,switch", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Conexión Wi-Fi lenta o inestable",
                   contenido="1. Acercarse al access point más cercano (preguntar a sistemas por su ubicación).\n2. Olvidar la red y volver a conectarse: Configuración > Wi-Fi > Propiedades > Olvidar.\n3. Cambiar al canal 5 GHz si el equipo lo soporta (mayor velocidad, menor alcance).\n4. Evitar zonas con muchos dispositivos Bluetooth o microondas que interfieren.\n5. Si trabaja con archivos grandes en red, prefiera siempre el cable ethernet.",
                   categoria="red", tags="wifi,lento,acceso,red", estado=EstadoArticulo.publicado),
        # SEGURIDAD
        ArticuloKB(titulo="Sospechas de virus o malware en mi PC",
                   contenido="¡No apague el equipo! Pasos inmediatos:\n1. Desconecte el cable de red del equipo para aislarlo.\n2. Cree un ticket URGENTE con categoría 'Seguridad'.\n3. Anote qué estaba haciendo antes de notar el problema (URL visitada, archivo abierto, USB conectado).\n4. No use el equipo hasta que sistemas lo revise.\n\nSeñales de alerta: pop-ups constantes, archivos renombrados con extensión extraña, PC muy lenta sin motivo, antivirus desactivado solo.",
                   categoria="seguridad", tags="virus,malware,seguridad,antivirus", estado=EstadoArticulo.publicado),
        ArticuloKB(titulo="Cómo reportar un correo de phishing",
                   contenido="Si recibiste un correo sospechoso:\n1. NO hagas clic en ningún enlace ni descargues adjuntos.\n2. NO respondas al remitente.\n3. Reenvía el correo completo (con encabezados) a: seguridad@entidad.gob.pe\n4. Crea un ticket con categoría 'Seguridad' describiendo el correo.\n5. Si ya hiciste clic en algún enlace, indícalo en el ticket para actuar de inmediato.\n\nLos correos de phishing suelen: pedir credenciales, crear urgencia ('su cuenta será bloqueada'), tener remitentes con dominios similares al real.",
                   categoria="seguridad", tags="phishing,correo,seguridad,estafa", estado=EstadoArticulo.publicado),
        # TELEFONIA
        ArticuloKB(titulo="Mi teléfono IP no tiene tono o no llama",
                   contenido="1. Verificar que el cable de red del teléfono esté conectado (el teléfono IP usa PoE — alimentación por red).\n2. Reiniciar el teléfono desconectando el cable de red 10 segundos y reconectándolo.\n3. Comprobar que la pantalla muestre extensión y fecha/hora (indica registro correcto).\n4. Si la pantalla dice 'Registering...' o está en blanco, cree un ticket con el número de extensión y ubicación.\n5. Para llamadas externas, marque 0 antes del número.",
                   categoria="telefonia", tags="telefono,ip,extension,voip", estado=EstadoArticulo.publicado),
        # SERVIDOR / SISTEMA CAÍDO
        ArticuloKB(titulo="El sistema de gestión no carga o da error 500",
                   contenido="1. Refrescar con Ctrl+F5 para descartar caché del navegador.\n2. Probar en modo incógnito o con otro navegador.\n3. Verificar si el problema ocurre solo en su equipo o en toda el área.\n4. Si es generalizado, ya se generó una alerta automática en sistemas — no es necesario crear múltiples tickets.\n5. Si es solo en su equipo: borrar caché del navegador (Ctrl+Shift+Del), reiniciar y reintentar.\n6. Crear ticket con: URL del sistema, navegador usado, mensaje de error exacto y captura de pantalla.",
                   categoria="servidor", tags="sistema,error,servidor,caido", estado=EstadoArticulo.publicado),
        # IMPRESORA adicional
        ArticuloKB(titulo="Cómo agregar una impresora de red a mi equipo",
                   contenido="1. Ir a Configuración > Impresoras y escáneres > Agregar impresora.\n2. Si no aparece automáticamente, seleccionar 'La impresora no está en la lista'.\n3. Elegir 'Agregar impresora por dirección TCP/IP' e ingresar la IP (consultar a mesa de ayuda).\n4. Seleccionar el driver correspondiente al modelo.\n5. Imprimir página de prueba.\n\nIPs de impresoras comunes:\n- Piso 1: 192.168.1.50\n- Piso 2: 192.168.1.51\n- Gerencia: 192.168.1.52\n\nSi no tiene permisos para agregar impresoras, cree un ticket y un técnico lo asistirá.",
                   categoria="impresora", tags="impresora,red,driver,instalacion", estado=EstadoArticulo.publicado),
        # MANTENIMIENTO
        ArticuloKB(titulo="Solicitar mantenimiento preventivo de equipo",
                   contenido="El mantenimiento preventivo se realiza cada 6 meses según cronograma.\n\nSi su equipo presenta:\n- Lentitud progresiva\n- Ruido en el ventilador\n- Calentamiento excesivo\n- Polvo visible en rejillas de ventilación\n\nCree un ticket con categoría 'Mantenimiento' indicando síntomas y número de inventario del equipo (etiqueta en el costado del CPU o laptop).\n\nEl técnico coordinará una fecha para no interrumpir su trabajo.",
                   categoria="mantenimiento", tags="mantenimiento,preventivo,equipo,inventario", estado=EstadoArticulo.publicado),
        # HARDWARE adicional
        ArticuloKB(titulo="Mi monitor no enciende o muestra pantalla negra",
                   contenido="1. Verificar que el botón de encendido del monitor esté pulsado (luz indicadora).\n2. Revisar el cable de video (HDMI o VGA) en ambos extremos (monitor y PC).\n3. Comprobar que el cable de alimentación del monitor esté conectado.\n4. Probar cambiando el cable de video por uno de repuesto.\n5. Si la PC enciende (ventiladores y luces) pero no hay imagen: presione Windows+P y seleccione 'Solo pantalla de PC'.\n6. Si nada funciona, cree un ticket indicando marca y modelo del monitor.",
                   categoria="hardware", tags="monitor,pantalla,video,hdmi", estado=EstadoArticulo.publicado),
    ]
    titulos_existentes = {t for (t,) in db.query(ArticuloKB.titulo).all()}
    nuevos = [a for a in extras if a.titulo not in titulos_existentes]
    if nuevos:
        db.add_all(nuevos); db.flush()
        print(f"  ✔ Artículos KB extra: {len(nuevos)}")


def _equipos(db):
    from app.models.inventario import Equipo, TipoEquipo, EstadoEquipo
    from app.models.sede import Sede
    from app.models.usuario import Usuario
    from app.models.proveedor import Proveedor
    if db.query(Equipo).count(): return

    sede_c = db.query(Sede).filter(Sede.codigo == "LIMA-CENTRAL").first()
    sede_n = db.query(Sede).filter(Sede.codigo == "TRU-01").first()
    sede_s = db.query(Sede).filter(Sede.codigo == "AQP-01").first()
    u_adm  = db.query(Usuario).filter(Usuario.username == "ufin_adm").first()
    u_cont = db.query(Usuario).filter(Usuario.username == "ufin_cont").first()
    u_dir  = db.query(Usuario).filter(Usuario.username == "director").first()
    prov_len = db.query(Proveedor).filter(Proveedor.ruc == "20504567890").first()
    prov_hp  = db.query(Proveedor).filter(Proveedor.ruc == "20505678901").first()

    equipos = [
        Equipo(codigo_inventario="EQ-LIM-0001", codigo_patrimonial="PAT-2022-0001",
               tipo=TipoEquipo.pc_escritorio, marca="Lenovo", modelo="ThinkCentre M75s",
               serie="PF3N0001", procesador="AMD Ryzen 5 PRO 4650G", ram_gb=8, disco_gb=512,
               sistema_operativo="Windows 11 Pro", office_version="Office 365",
               ip_asignada="192.168.1.101", estado=EstadoEquipo.activo,
               usuario_asignado_id=u_adm.id if u_adm else None, sede_id=sede_c.id, ubicacion_fisica="Piso 2 – Of. 201",
               fecha_compra=date(2022, 3, 15), valor_compra=2800.00, vida_util_anios=4,
               garantia_hasta=date(2025, 3, 15), proveedor_id=prov_len.id),
        Equipo(codigo_inventario="EQ-LIM-0002", codigo_patrimonial="PAT-2022-0002",
               tipo=TipoEquipo.laptop, marca="HP", modelo="ProBook 450 G9",
               serie="5CG2200001", procesador="Intel Core i5-1235U", ram_gb=16, disco_gb=512,
               sistema_operativo="Windows 11 Pro", office_version="Office 365",
               ip_asignada="192.168.1.102", estado=EstadoEquipo.activo,
               usuario_asignado_id=u_cont.id if u_cont else None, sede_id=sede_c.id, ubicacion_fisica="Piso 3 – Of. 301",
               fecha_compra=date(2022, 6, 20), valor_compra=3500.00, vida_util_anios=4,
               garantia_hasta=date(2025, 6, 20), proveedor_id=prov_hp.id),
        Equipo(codigo_inventario="EQ-LIM-0003", codigo_patrimonial="PAT-2023-0001",
               tipo=TipoEquipo.laptop, marca="Lenovo", modelo="ThinkPad X1 Carbon",
               serie="PF4A0001", procesador="Intel Core i7-1260P", ram_gb=16, disco_gb=1000,
               sistema_operativo="Windows 11 Pro", office_version="Office 365",
               ip_asignada="192.168.1.103", estado=EstadoEquipo.activo,
               usuario_asignado_id=u_dir.id if u_dir else None, sede_id=sede_c.id, ubicacion_fisica="Piso 5 – Dirección",
               fecha_compra=date(2023, 1, 10), valor_compra=5200.00, vida_util_anios=4,
               garantia_hasta=date(2026, 1, 10), proveedor_id=prov_len.id),
        Equipo(codigo_inventario="EQ-LIM-0004",
               tipo=TipoEquipo.impresora, marca="HP", modelo="LaserJet Pro M404dn",
               serie="VNB3C00001", estado=EstadoEquipo.activo,
               sede_id=sede_c.id, ubicacion_fisica="Piso 2 – Área común",
               fecha_compra=date(2021, 8, 5), valor_compra=1200.00, vida_util_anios=5,
               garantia_hasta=date(2023, 8, 5), proveedor_id=prov_hp.id),
        Equipo(codigo_inventario="EQ-TRU-0001",
               tipo=TipoEquipo.pc_escritorio, marca="Lenovo", modelo="ThinkCentre M75s",
               serie="PF3N0050", procesador="AMD Ryzen 5 PRO 4650G", ram_gb=8, disco_gb=256,
               sistema_operativo="Windows 10 Pro", office_version="Office 2019",
               estado=EstadoEquipo.activo, sede_id=sede_n.id, ubicacion_fisica="Oficina principal",
               fecha_compra=date(2021, 11, 20), valor_compra=2500.00, vida_util_anios=4,
               garantia_hasta=date(2024, 11, 20), proveedor_id=prov_len.id),
        Equipo(codigo_inventario="EQ-AQP-0001",
               tipo=TipoEquipo.laptop, marca="HP", modelo="ProBook 440 G8",
               serie="5CG1100001", procesador="Intel Core i5-1135G7", ram_gb=8, disco_gb=256,
               sistema_operativo="Windows 10 Pro", office_version="Office 2019",
               estado=EstadoEquipo.en_mantenimiento, sede_id=sede_s.id,
               fecha_compra=date(2021, 5, 15), valor_compra=2900.00, vida_util_anios=4,
               garantia_hasta=date(2024, 5, 15), proveedor_id=prov_hp.id),
    ]
    db.add_all(equipos); db.flush()
    print(f"  ✔ Equipos: {len(equipos)}")


def _licencias(db):
    from app.models.inventario import Licencia
    from app.models.proveedor import Proveedor
    if db.query(Licencia).count(): return
    prov_ms  = db.query(Proveedor).filter(Proveedor.ruc == "20502345678").first()
    prov_tec = db.query(Proveedor).filter(Proveedor.ruc == "20501234567").first()
    licencias = [
        Licencia(software="Microsoft 365 Business Standard", version="2024", fabricante="Microsoft",
                 tipo_licencia="suscripcion", cantidad_total=25, cantidad_usada=22,
                 proveedor_id=prov_ms.id, fecha_compra=date(2024, 1, 1),
                 fecha_vencimiento=date(2024, 12, 31), valor=12500.00),
        Licencia(software="Windows 11 Pro", version="11", fabricante="Microsoft",
                 tipo_licencia="volumen", cantidad_total=40, cantidad_usada=35,
                 proveedor_id=prov_ms.id, fecha_compra=date(2022, 3, 1),
                 fecha_vencimiento=None, valor=18000.00),
        Licencia(software="AutoCAD 2024", version="2024", fabricante="Autodesk",
                 tipo_licencia="suscripcion", cantidad_total=3, cantidad_usada=3,
                 proveedor_id=prov_tec.id, fecha_compra=date(2024, 2, 15),
                 fecha_vencimiento=date(2025, 2, 14), valor=7200.00),
        Licencia(software="ESET Endpoint Security", version="10", fabricante="ESET",
                 tipo_licencia="volumen", cantidad_total=50, cantidad_usada=48,
                 proveedor_id=prov_tec.id, fecha_compra=date(2023, 7, 1),
                 fecha_vencimiento=date(2024, 6, 30), valor=4500.00,
                 alerta_30=True, alerta_15=True, alerta_7=True),  # ya vencida – para demo
    ]
    db.add_all(licencias); db.flush()
    print(f"  ✔ Licencias: {len(licencias)}")


def _cronogramas(db):
    from app.models.mantenimiento import CronogramaMantenimiento
    if db.query(CronogramaMantenimiento).count(): return
    cronogramas = [
        CronogramaMantenimiento(nombre="Limpieza PC escritorio – trimestral",
                                tipo_equipo="pc_escritorio", frecuencia_dias=90,
                                descripcion_tareas="Limpieza interna con aire comprimido, revisión de conexiones, actualización de drivers, análisis de virus, desfragmentación de disco."),
        CronogramaMantenimiento(nombre="Limpieza laptop – trimestral",
                                tipo_equipo="laptop", frecuencia_dias=90,
                                descripcion_tareas="Limpieza de ventilación, revisión de batería, actualización de drivers, análisis de virus."),
        CronogramaMantenimiento(nombre="Mantenimiento impresora – semestral",
                                tipo_equipo="impresora", frecuencia_dias=180,
                                descripcion_tareas="Limpieza de rodillos, revisión de niveles de tóner, prueba de impresión, calibración."),
        CronogramaMantenimiento(nombre="Revisión servidor – mensual",
                                tipo_equipo="servidor", frecuencia_dias=30,
                                descripcion_tareas="Revisión de logs, espacio en disco, temperatura, actualizaciones de seguridad, prueba de backup."),
        CronogramaMantenimiento(nombre="Revisión switches/routers – semestral",
                                tipo_equipo="switch", frecuencia_dias=180,
                                descripcion_tareas="Revisión de firmware, logs de tráfico, limpieza de polvo, verificación de puertos."),
    ]
    db.add_all(cronogramas); db.flush()
    print(f"  ✔ Cronogramas mantenimiento: {len(cronogramas)}")


def _politicas_backup(db):
    from app.models.backup import PoliticaBackup, TipoBackup
    from app.models.usuario import Usuario
    if db.query(PoliticaBackup).count(): return
    esp = db.query(Usuario).filter(Usuario.username == "esp_servidores").first()
    from datetime import time
    politicas = [
        PoliticaBackup(nombre="Backup BD SIAF – diario full",
                       servidor="SRV-BD-01", ruta_origen="/var/lib/postgresql/siaf",
                       ruta_destino="//NAS-BACKUP/siaf/daily", tipo=TipoBackup.full,
                       frecuencia="diario", hora_ejecucion=time(23, 0),
                       retencion_dias=30, activa=True, responsable_id=esp.id if esp else None),
        PoliticaBackup(nombre="Backup BD correo – diario incremental",
                       servidor="SRV-MAIL-01", ruta_origen="/var/spool/mail",
                       ruta_destino="//NAS-BACKUP/mail/incr", tipo=TipoBackup.incremental,
                       frecuencia="diario", hora_ejecucion=time(22, 0),
                       retencion_dias=15, activa=True, responsable_id=esp.id if esp else None),
        PoliticaBackup(nombre="Backup archivos compartidos – semanal",
                       servidor="SRV-FILES-01", ruta_origen="/srv/compartidos",
                       ruta_destino="//NAS-BACKUP/files/weekly", tipo=TipoBackup.full,
                       frecuencia="semanal", hora_ejecucion=time(2, 0),
                       retencion_dias=90, activa=True, responsable_id=esp.id if esp else None),
    ]
    db.add_all(politicas); db.flush()
    print(f"  ✔ Políticas de backup: {len(politicas)}")


def _servidores(db):
    from app.models.infraestructura import Servidor, BaseDatos, TipoServidor, EstadoServicio
    from app.models.sede import Sede
    from app.models.usuario import Usuario
    if db.query(Servidor).count(): return
    sede_c = db.query(Sede).filter(Sede.codigo == "LIMA-CENTRAL").first()
    esp    = db.query(Usuario).filter(Usuario.username == "esp_servidores").first()
    servidores = [
        Servidor(nombre="Servidor Base de Datos Principal", hostname="SRV-BD-01",
                 ip_gestion="192.168.1.10", tipo=TipoServidor.fisico,
                 sistema_operativo="Ubuntu Server", version_so="22.04 LTS",
                 cpu_nucleos=16, ram_gb=64, disco_total_tb=4.0,
                 sede_id=sede_c.id, rack="RACK-A-01",
                 estado=EstadoServicio.operativo, responsable_id=esp.id if esp else None,
                 servicios="PostgreSQL 15, Oracle 19c"),
        Servidor(nombre="Servidor de Correo Electrónico", hostname="SRV-MAIL-01",
                 ip_gestion="192.168.1.11", tipo=TipoServidor.fisico,
                 sistema_operativo="Windows Server", version_so="2022 Standard",
                 cpu_nucleos=8, ram_gb=32, disco_total_tb=2.0,
                 sede_id=sede_c.id, rack="RACK-A-02",
                 estado=EstadoServicio.operativo, responsable_id=esp.id if esp else None,
                 servicios="Microsoft Exchange 2019"),
        Servidor(nombre="Servidor de Archivos y Directorio Activo", hostname="SRV-AD-01",
                 ip_gestion="192.168.1.12", tipo=TipoServidor.fisico,
                 sistema_operativo="Windows Server", version_so="2019 Standard",
                 cpu_nucleos=8, ram_gb=16, disco_total_tb=1.0,
                 sede_id=sede_c.id, rack="RACK-A-03",
                 estado=EstadoServicio.operativo, responsable_id=esp.id if esp else None,
                 servicios="Active Directory, DNS, DHCP, File Server"),
    ]
    db.add_all(servidores); db.flush()

    bd_list = [
        BaseDatos(nombre="bd_siaf",   motor="PostgreSQL", version="15.3",
                  servidor_id=servidores[0].id, puerto=5432,
                  sistema_info="SIAF – Sistema Integrado de Administración Financiera",
                  tamanio_gb=45.2, activa=True, responsable_id=esp.id if esp else None),
        BaseDatos(nombre="bd_tramite", motor="Oracle", version="19c",
                  servidor_id=servidores[0].id, puerto=1521,
                  sistema_info="Sistema de Gestión Documentaria",
                  tamanio_gb=12.8, activa=True, responsable_id=esp.id if esp else None),
        BaseDatos(nombre="bd_helpdesk", motor="PostgreSQL", version="15.3",
                  servidor_id=servidores[0].id, puerto=5432,
                  sistema_info="QHELP DESK ERP",
                  tamanio_gb=1.5, activa=True, responsable_id=esp.id if esp else None),
    ]
    db.add_all(bd_list); db.flush()
    print(f"  ✔ Servidores: {len(servidores)} | Bases de datos: {len(bd_list)}")


def _dispositivos_red(db):
    from app.models.infraestructura import DispositivoRed, EstadoServicio
    from app.models.sede import Sede
    if db.query(DispositivoRed).count(): return
    sede_c = db.query(Sede).filter(Sede.codigo == "LIMA-CENTRAL").first()
    dispositivos = [
        DispositivoRed(nombre="Firewall perimetral", tipo="firewall",
                       marca="Fortinet", modelo="FortiGate 200F",
                       serie="FGT200F0000001", ip_gestion="192.168.1.1",
                       sede_id=sede_c.id, ubicacion="Rack-A, Piso 1",
                       estado=EstadoServicio.operativo, firmware="7.4.1"),
        DispositivoRed(nombre="Switch core Piso 1", tipo="switch",
                       marca="Cisco", modelo="Catalyst 9200L",
                       serie="FCW2300A001", ip_gestion="192.168.1.2",
                       sede_id=sede_c.id, ubicacion="Rack-A, Piso 1",
                       estado=EstadoServicio.operativo, firmware="17.9.1"),
        DispositivoRed(nombre="Router WAN principal", tipo="router",
                       marca="Cisco", modelo="ISR 4331",
                       serie="FDO2100B001", ip_gestion="192.168.1.3",
                       sede_id=sede_c.id, ubicacion="Rack-A, Piso 1",
                       estado=EstadoServicio.operativo, firmware="16.9.6"),
        DispositivoRed(nombre="VPN concentrador", tipo="vpn",
                       marca="Cisco", modelo="ASA 5506-X",
                       serie="FCH2200C001", ip_gestion="192.168.1.4",
                       sede_id=sede_c.id, ubicacion="Rack-A, Piso 1",
                       estado=EstadoServicio.operativo),
    ]
    db.add_all(dispositivos); db.flush()
    print(f"  ✔ Dispositivos de red: {len(dispositivos)}")


def _lineas_telefonicas(db):
    from app.models.telefonia import LineaTelefonica, TipoLinea, CentralTelefonica
    from app.models.usuario import Usuario
    from app.models.sede import Sede
    if db.query(LineaTelefonica).count(): return
    sede_c  = db.query(Sede).filter(Sede.codigo == "LIMA-CENTRAL").first()
    u_dir   = db.query(Usuario).filter(Usuario.username == "director").first()
    u_subdir = db.query(Usuario).filter(Usuario.username == "subdirector").first()
    u_jefe  = db.query(Usuario).filter(Usuario.username == "jefesistemas").first()

    central = CentralTelefonica(nombre="Central IP Sede Central", marca="Grandstream",
                                modelo="UCM6304A", ip="192.168.1.20",
                                sede_id=sede_c.id, extensiones_total=100,
                                en_garantia=True, activa=True)
    db.add(central); db.flush()

    lineas = [
        LineaTelefonica(numero="999100001", tipo=TipoLinea.celular, operador="Claro",
                        plan="Empresarial Ilimitado", costo_mensual=89.90,
                        asignado_a_id=u_dir.id if u_dir else None, sede_id=sede_c.id,
                        es_directivo=True, activa=True,
                        equipo_celular="Samsung Galaxy S24"),
        LineaTelefonica(numero="999100002", tipo=TipoLinea.celular, operador="Claro",
                        plan="Empresarial Ilimitado", costo_mensual=89.90,
                        asignado_a_id=u_subdir.id if u_subdir else None, sede_id=sede_c.id,
                        es_directivo=True, activa=True,
                        equipo_celular="Samsung Galaxy S23"),
        LineaTelefonica(numero="999100003", tipo=TipoLinea.celular, operador="Movistar",
                        plan="Empresarial 10GB", costo_mensual=59.90,
                        asignado_a_id=u_jefe.id if u_jefe else None, sede_id=sede_c.id,
                        es_directivo=False, activa=True,
                        equipo_celular="iPhone 14"),
    ]
    db.add_all(lineas); db.flush()
    print(f"  ✔ Líneas telefónicas: {len(lineas)} | Central: 1")


def _contratos(db):
    from app.models.contrato import Contrato, TipoContrato, EstadoContrato
    from app.models.proveedor import Proveedor
    if db.query(Contrato).count(): return
    prov_claro = db.query(Proveedor).filter(Proveedor.ruc == "20503456789").first()
    prov_tec   = db.query(Proveedor).filter(Proveedor.ruc == "20501234567").first()
    contratos = [
        Contrato(numero="CONT-2024-001", tipo=TipoContrato.servicio,
                 objeto="Servicio de internet fibra óptica 200Mbps dedicado",
                 proveedor_id=prov_claro.id, estado=EstadoContrato.vigente,
                 fecha_inicio=date(2024, 1, 1), fecha_fin=date(2024, 12, 31),
                 monto=18000.00, moneda="PEN"),
        Contrato(numero="CONT-2024-002", tipo=TipoContrato.mantenimiento,
                 objeto="Mantenimiento preventivo y correctivo de equipos TI – 40 equipos",
                 proveedor_id=prov_tec.id, estado=EstadoContrato.vigente,
                 fecha_inicio=date(2024, 3, 1), fecha_fin=date(2025, 2, 28),
                 monto=24000.00, moneda="PEN"),
    ]
    db.add_all(contratos); db.flush()
    print(f"  ✔ Contratos: {len(contratos)}")


if __name__ == "__main__":
    print("\n📦  Cargando datos iniciales del sistema QHELP DESK ERP...\n")
    run()
