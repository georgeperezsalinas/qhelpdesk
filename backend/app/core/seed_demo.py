"""
seed_demo.py – Datos de demostración para probar todos los módulos
Ejecutar: python -m app.core.seed_demo
"""
from datetime import date, datetime, timedelta
from app.core.database import SessionLocal
from app.models.ticket import (
    Ticket, ComentarioTicket, PrioridadTicket,
    EstadoTicket, CategoriaTicket, CanalEntrada
)
from app.models.inventario import Equipo, TipoEquipo, EstadoEquipo, Licencia
from app.models.mantenimiento import (
    OrdenMantenimiento, ChecklistMantenimiento,
    TipoMantenimiento, EstadoOrden, OrigenOrden
)
from app.models.compra import SolicitudCompra, ItemSolicitud, EstadoSolicitud, TipoSolicitud
from app.models.backup import PoliticaBackup, EjecucionBackup, EstadoBackup, TipoBackup
from app.models.usuario import Usuario
from app.models.sede import Sede
from app.models.proveedor import Proveedor
from sqlalchemy import func
from datetime import time

def run():
    db = SessionLocal()
    try:
        _equipos_extra(db)
        _tickets_demo(db)
        _mantenimiento_demo(db)
        _compras_demo(db)
        _backup_demo(db)
        db.commit()
        print("\n✅  Datos de demo cargados correctamente.\n")
    except Exception as e:
        db.rollback()
        print(f"\n❌  Error: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()

# ─────────────────────────────────────────────────────────────────────────────
def _equipos_extra(db):
    """Agregar más equipos para tener variedad en mantenimiento"""
    if db.query(Equipo).count() > 8:
        print("  — Equipos extra ya existen")
        return

    sede_c = db.query(Sede).filter(Sede.codigo == "LIMA-CENTRAL").first()
    sede_n = db.query(Sede).filter(Sede.codigo == "TRU-01").first()
    sede_s = db.query(Sede).filter(Sede.codigo == "AQP-01").first()
    prov_len = db.query(Proveedor).filter(Proveedor.ruc == "20504567890").first()
    prov_hp  = db.query(Proveedor).filter(Proveedor.ruc == "20505678901").first()

    equipos = [
        Equipo(codigo_inventario="EQ-LIM-0005", tipo=TipoEquipo.pc_escritorio,
               marca="HP", modelo="ProDesk 400 G7", serie="MXL1234567",
               procesador="Intel Core i5-10500", ram_gb=8, disco_gb=256,
               sistema_operativo="Windows 10 Pro", office_version="Office 2019",
               ip_asignada="192.168.1.105", estado=EstadoEquipo.activo,
               sede_id=sede_c.id, ubicacion_fisica="Piso 1 – Recepción",
               fecha_compra=date(2020, 6, 1), valor_compra=2200.00, vida_util_anios=4,
               garantia_hasta=date(2023, 6, 1), proveedor_id=prov_hp.id),
        Equipo(codigo_inventario="EQ-LIM-0006", tipo=TipoEquipo.laptop,
               marca="Lenovo", modelo="IdeaPad 3", serie="PF2B9876",
               procesador="AMD Ryzen 3 5300U", ram_gb=8, disco_gb=512,
               sistema_operativo="Windows 11 Home", office_version="Office 365",
               ip_asignada="192.168.1.106", estado=EstadoEquipo.activo,
               sede_id=sede_c.id, ubicacion_fisica="Piso 2 – RRHH",
               fecha_compra=date(2022, 9, 15), valor_compra=2600.00, vida_util_anios=4,
               garantia_hasta=date(2025, 9, 15), proveedor_id=prov_len.id),
        Equipo(codigo_inventario="EQ-LIM-0007", tipo=TipoEquipo.impresora,
               marca="Epson", modelo="EcoTank L3250", serie="X9KL000123",
               estado=EstadoEquipo.activo, sede_id=sede_c.id,
               ubicacion_fisica="Piso 3 – Área común",
               fecha_compra=date(2021, 3, 10), valor_compra=850.00, vida_util_anios=5,
               garantia_hasta=date(2024, 3, 10), proveedor_id=prov_hp.id),
        Equipo(codigo_inventario="EQ-LIM-0008", tipo=TipoEquipo.ups,
               marca="APC", modelo="Smart-UPS 1500VA", serie="AS1234567",
               estado=EstadoEquipo.activo, sede_id=sede_c.id,
               ubicacion_fisica="Sala de servidores",
               fecha_compra=date(2020, 1, 20), valor_compra=3200.00, vida_util_anios=5,
               garantia_hasta=date(2023, 1, 20), proveedor_id=prov_hp.id),
        Equipo(codigo_inventario="EQ-TRU-0002", tipo=TipoEquipo.laptop,
               marca="HP", modelo="ProBook 440 G9", serie="5CG3300001",
               procesador="Intel Core i5-1235U", ram_gb=8, disco_gb=256,
               sistema_operativo="Windows 11 Pro", office_version="Office 2019",
               estado=EstadoEquipo.activo, sede_id=sede_n.id,
               fecha_compra=date(2022, 11, 5), valor_compra=3100.00, vida_util_anios=4,
               garantia_hasta=date(2025, 11, 5), proveedor_id=prov_hp.id),
        Equipo(codigo_inventario="EQ-AQP-0002", tipo=TipoEquipo.pc_escritorio,
               marca="Lenovo", modelo="ThinkCentre M70s", serie="PF3A0002",
               procesador="Intel Core i5-10400", ram_gb=8, disco_gb=256,
               sistema_operativo="Windows 10 Pro", office_version="Office 2019",
               estado=EstadoEquipo.en_mantenimiento, sede_id=sede_s.id,
               fecha_compra=date(2021, 7, 20), valor_compra=2400.00, vida_util_anios=4,
               garantia_hasta=date(2024, 7, 20), proveedor_id=prov_len.id),
        Equipo(codigo_inventario="EQ-LIM-0009", tipo=TipoEquipo.switch,
               marca="Cisco", modelo="Catalyst 2960-X", serie="FCW2100A002",
               ip_asignada="192.168.1.5", estado=EstadoEquipo.activo,
               sede_id=sede_c.id, ubicacion_fisica="Rack Piso 2",
               fecha_compra=date(2020, 8, 15), valor_compra=4500.00, vida_util_anios=7,
               garantia_hasta=date(2025, 8, 15), proveedor_id=prov_hp.id),
    ]
    db.add_all(equipos)
    db.flush()
    print(f"  ✔ Equipos extra: {len(equipos)}")

# ─────────────────────────────────────────────────────────────────────────────
def _tickets_demo(db):
    if db.query(Ticket).count() > 2:
        print("  — Tickets demo ya existen")
        return

    usuarios = {u.username: u for u in db.query(Usuario).all()}
    sedes    = {s.codigo: s for s in db.query(Sede).all()}
    equipos  = {e.codigo_inventario: e for e in db.query(Equipo).all()}
    base_num = db.query(func.count(Ticket.id)).scalar()

    def mk_ticket(num_offset, titulo, desc, prioridad, estado, categoria, canal,
                  solicitante, tecnico=None, sede_cod="LIMA-CENTRAL",
                  equipo_cod=None, dias_atras=0, resuelto=False, nps=None):
        creado = datetime.utcnow() - timedelta(days=dias_atras)
        sla_h  = {PrioridadTicket.critica:4, PrioridadTicket.alta:8,
                  PrioridadTicket.media:24, PrioridadTicket.baja:72}
        sla    = creado + timedelta(hours=sla_h[prioridad])
        t = Ticket(
            numero=f"TK-2024-{base_num + num_offset:05d}",
            titulo=titulo, descripcion=desc,
            prioridad=prioridad, estado=estado, categoria=categoria,
            canal_entrada=canal,
            sede_id=sedes[sede_cod].id if sede_cod in sedes else None,
            solicitante_id=usuarios[solicitante].id,
            tecnico_id=usuarios[tecnico].id if tecnico and tecnico in usuarios else None,
            equipo_id=equipos[equipo_cod].id if equipo_cod and equipo_cod in equipos else None,
            sla_limite=sla, creado_en=creado, actualizado_en=creado,
            asignado_en=creado + timedelta(minutes=15) if tecnico else None,
        )
        if resuelto:
            t.resuelto_en = creado + timedelta(hours=3)
            t.cerrado_en  = creado + timedelta(hours=4)
            t.sla_cumplido = t.resuelto_en <= sla
            t.tiempo_resolucion_h = 3.0
            t.solucion = "Se aplicó la solución correspondiente y se verificó el funcionamiento."
        if nps:
            t.nps_puntuacion = nps
            t.nps_enviado    = True
        return t

    tickets = [
        # Críticos activos
        mk_ticket(1, "Sistema SIAF no carga – Contabilidad bloqueada",
                  "Al intentar ingresar al SIAF aparece error de conexión. Todo el área de contabilidad está sin poder trabajar desde las 8am.",
                  PrioridadTicket.critica, EstadoTicket.en_progreso,
                  CategoriaTicket.software, CanalEntrada.portal,
                  "director", "esp_servidores", dias_atras=0),
        mk_ticket(2, "Internet caído en Piso 3",
                  "Sin conexión a internet en todo el tercer piso desde las 9am. Afecta a 15 usuarios.",
                  PrioridadTicket.alta, EstadoTicket.asignado,
                  CategoriaTicket.red, CanalEntrada.llamada,
                  "ufin_adm", "esp_redes", dias_atras=0),
        # Tickets de mesa de ayuda
        mk_ticket(3, "No puedo imprimir desde mi PC",
                  "La impresora del área aparece offline en mi equipo EQ-LIM-0001. Restarté pero sigue igual.",
                  PrioridadTicket.media, EstadoTicket.asignado,
                  CategoriaTicket.impresora, CanalEntrada.portal,
                  "ufin_cont", "mesa1", "LIMA-CENTRAL", "EQ-LIM-0001", dias_atras=1),
        mk_ticket(4, "Correo no sincroniza en Outlook",
                  "Desde ayer mi Outlook no descarga correos nuevos. Otros usuarios del área sí tienen correo.",
                  PrioridadTicket.media, EstadoTicket.pendiente,
                  CategoriaTicket.correo, CanalEntrada.correo,
                  "ufin_log", "mesa2", dias_atras=2),
        mk_ticket(5, "Solicitud de acceso al sistema de Logística",
                  "Necesito acceso de consulta al módulo de almacén del sistema de logística para mis funciones.",
                  PrioridadTicket.baja, EstadoTicket.abierto,
                  CategoriaTicket.acceso, CanalEntrada.portal,
                  "ufin_adm", dias_atras=1),
        # Tickets externos (sedes remotas)
        mk_ticket(6, "VPN no conecta desde sede Trujillo",
                  "Los usuarios de la sede norte no pueden conectarse a la VPN institucional. Necesitamos acceso urgente a los sistemas.",
                  PrioridadTicket.alta, EstadoTicket.en_progreso,
                  CategoriaTicket.vpn, CanalEntrada.correo,
                  "uext_norte", "esp_redes", "TRU-01", dias_atras=0),
        mk_ticket(7, "PC lenta y se congela con frecuencia",
                  "Mi laptop EQ-TRU-0001 se congela cada 30 minutos. Tengo que reiniciarla. Afecta mi productividad.",
                  PrioridadTicket.media, EstadoTicket.asignado,
                  CategoriaTicket.hardware, CanalEntrada.portal,
                  "uext_norte", "tec_norte", "TRU-01", "EQ-TRU-0001", dias_atras=3),
        mk_ticket(8, "Impresora de sede Arequipa no enciende",
                  "La impresora del área administrativa no enciende desde esta mañana.",
                  PrioridadTicket.media, EstadoTicket.asignado,
                  CategoriaTicket.impresora, CanalEntrada.portal,
                  "uext_sur", "tec_sur", "AQP-01", dias_atras=1),
        # Tickets resueltos (historial)
        mk_ticket(9, "Actualización de contraseña caducada",
                  "Mi contraseña venció y no puedo ingresar al sistema.",
                  PrioridadTicket.media, EstadoTicket.cerrado,
                  CategoriaTicket.acceso, CanalEntrada.portal,
                  "ufin_adm", "mesa1", dias_atras=5, resuelto=True, nps=9),
        mk_ticket(10, "Instalación de Adobe Reader",
                  "Necesito Adobe Reader para abrir documentos PDF de proveedores.",
                  PrioridadTicket.baja, EstadoTicket.cerrado,
                  CategoriaTicket.software, CanalEntrada.portal,
                  "ufin_cont", "mesa2", dias_atras=7, resuelto=True, nps=8),
        mk_ticket(11, "PC no arranca – pantalla negra",
                  "Al encender mi PC solo aparece pantalla negra. No carga el sistema operativo.",
                  PrioridadTicket.alta, EstadoTicket.resuelto,
                  CategoriaTicket.hardware, CanalEntrada.llamada,
                  "ufin_log", "mesa3", "LIMA-CENTRAL", "EQ-LIM-0005", dias_atras=3, resuelto=True, nps=7),
        mk_ticket(12, "Configurar nuevo equipo de trabajo",
                  "Recibí un equipo nuevo y necesita configuración inicial: Windows, Office, correo y acceso a sistemas.",
                  PrioridadTicket.media, EstadoTicket.cerrado,
                  CategoriaTicket.hardware, CanalEntrada.portal,
                  "uext_norte", "tec_norte", "TRU-01", dias_atras=10, resuelto=True, nps=10),
        mk_ticket(13, "Teléfono IP sin tono",
                  "Mi teléfono de escritorio no tiene tono de marcado desde esta mañana.",
                  PrioridadTicket.media, EstadoTicket.en_progreso,
                  CategoriaTicket.telefonia, CanalEntrada.llamada,
                  "ufin_adm", "mesa1", dias_atras=0),
        mk_ticket(14, "Backup de base de datos fallando",
                  "El backup nocturno de la BD SIAF falló los últimos 3 días. Necesita revisión urgente.",
                  PrioridadTicket.alta, EstadoTicket.en_progreso,
                  CategoriaTicket.servidor, CanalEntrada.sistema,
                  "jefesistemas", "esp_servidores", dias_atras=0),
        mk_ticket(15, "Licencia de AutoCAD vencida",
                  "El software AutoCAD muestra que la licencia expiró. No puedo trabajar.",
                  PrioridadTicket.alta, EstadoTicket.abierto,
                  CategoriaTicket.software, CanalEntrada.portal,
                  "ufin_log", dias_atras=1),
    ]

    db.add_all(tickets)
    db.flush()

    # Comentarios de ejemplo
    comentarios = [
        ComentarioTicket(ticket_id=tickets[0].id, autor_id=usuarios["esp_servidores"].id,
                         contenido="Revisando el servicio de base de datos. El servicio PostgreSQL está detenido. Procediendo a reiniciarlo.", es_interno=False,
                         creado_en=datetime.utcnow() - timedelta(minutes=30)),
        ComentarioTicket(ticket_id=tickets[0].id, autor_id=usuarios["director"].id,
                         contenido="Por favor atender con urgencia, toda el área de finanzas está paralizada.", es_interno=False,
                         creado_en=datetime.utcnow() - timedelta(minutes=20)),
        ComentarioTicket(ticket_id=tickets[2].id, autor_id=usuarios["mesa1"].id,
                         contenido="Revisaré el driver de la impresora. Mientras tanto intenta imprimir con el botón físico.", es_interno=False,
                         creado_en=datetime.utcnow() - timedelta(hours=2)),
        ComentarioTicket(ticket_id=tickets[5].id, autor_id=usuarios["esp_redes"].id,
                         contenido="Verificando configuración del concentrador VPN. El certificado SSL parece vencido.", es_interno=True,
                         creado_en=datetime.utcnow() - timedelta(hours=1)),
        ComentarioTicket(ticket_id=tickets[5].id, autor_id=usuarios["esp_redes"].id,
                         contenido="Estamos trabajando en el problema. Estimamos solución en 2 horas.", es_interno=False,
                         creado_en=datetime.utcnow() - timedelta(minutes=45)),
    ]
    db.add_all(comentarios)
    print(f"  ✔ Tickets demo: {len(tickets)} | Comentarios: {len(comentarios)}")

# ─────────────────────────────────────────────────────────────────────────────
def _mantenimiento_demo(db):
    if db.query(OrdenMantenimiento).count() > 0:
        print("  — Órdenes de mantenimiento ya existen")
        return

    usuarios = {u.username: u for u in db.query(Usuario).all()}
    equipos  = {e.codigo_inventario: e for e in db.query(Equipo).all()}

    def mk_orden(codigo_eq, tipo, estado, fecha_prog, desc, tecnico,
                 origen=OrigenOrden.manual, trabajos=None, costo=None,
                 fecha_ini=None, fecha_fin=None, proxima=None):
        eq = equipos.get(codigo_eq)
        if not eq:
            return None
        n = db.query(func.count(OrdenMantenimiento.id)).scalar() + 1
        o = OrdenMantenimiento(
            numero=f"MNT-2024-{n:04d}",
            tipo=tipo, origen=origen, estado=estado,
            equipo_id=eq.id,
            tecnico_id=usuarios[tecnico].id if tecnico in usuarios else None,
            fecha_programada=fecha_prog,
            descripcion=desc,
            trabajos_realizados=trabajos,
            costo=costo,
            fecha_inicio=fecha_ini,
            fecha_fin=fecha_fin,
            proxima_fecha=proxima,
            creado_en=datetime.utcnow() - timedelta(days=30),
        )
        if fecha_ini and fecha_fin:
            delta = fecha_fin - fecha_ini
            o.duracion_minutos = int(delta.total_seconds() / 60)
        return o

    tareas_prev = [
        "Limpieza interna con aire comprimido",
        "Verificar y asegurar conexiones internas",
        "Actualizar drivers y sistema operativo",
        "Ejecutar antivirus y análisis de malware",
        "Verificar espacio en disco",
        "Probar funcionamiento completo",
    ]
    tareas_corr = [
        "Diagnosticar falla reportada",
        "Identificar componente afectado",
        "Aplicar corrección",
        "Verificar solución",
        "Documentar trabajos",
    ]

    ordenes_data = [
        # Completadas (historial)
        ("EQ-LIM-0001", TipoMantenimiento.preventivo, EstadoOrden.completado,
         date.today() - timedelta(days=95),
         "Mantenimiento preventivo trimestral – PC escritorio", "mesa1",
         OrigenOrden.automatico,
         "Limpieza completa, actualización de drivers, análisis de virus sin amenazas.",
         80.0,
         datetime.utcnow() - timedelta(days=95, hours=2),
         datetime.utcnow() - timedelta(days=95),
         date.today() + timedelta(days=0)),

        ("EQ-LIM-0002", TipoMantenimiento.preventivo, EstadoOrden.completado,
         date.today() - timedelta(days=92),
         "Mantenimiento preventivo trimestral – Laptop HP", "mesa2",
         OrigenOrden.automatico,
         "Limpieza de ventilación, batería al 87%, actualización de Windows completada.",
         80.0,
         datetime.utcnow() - timedelta(days=92, hours=3),
         datetime.utcnow() - timedelta(days=92),
         date.today() + timedelta(days=3)),

        ("EQ-LIM-0007", TipoMantenimiento.correctivo, EstadoOrden.completado,
         date.today() - timedelta(days=20),
         "Impresora no alimenta papel – atasco interno", "mesa3",
         OrigenOrden.ticket,
         "Se limpió rodillo de alimentación y se reemplazó separador de papel. Impresión de prueba OK.",
         120.0,
         datetime.utcnow() - timedelta(days=20, hours=1),
         datetime.utcnow() - timedelta(days=20),
         date.today() + timedelta(days=160)),

        # En proceso
        ("EQ-AQP-0002", TipoMantenimiento.correctivo, EstadoOrden.en_proceso,
         date.today(),
         "PC no enciende – posible falla en fuente de poder", "tec_sur",
         OrigenOrden.ticket, None, None,
         datetime.utcnow() - timedelta(hours=2), None, None),

        ("EQ-LIM-0005", TipoMantenimiento.preventivo, EstadoOrden.en_proceso,
         date.today(),
         "Mantenimiento preventivo trimestral", "mesa1",
         OrigenOrden.automatico, None, None,
         datetime.utcnow() - timedelta(hours=1), None,
         date.today() + timedelta(days=90)),

        # Programadas próximas
        ("EQ-LIM-0003", TipoMantenimiento.preventivo, EstadoOrden.programado,
         date.today() + timedelta(days=3),
         "Mantenimiento preventivo trimestral – Laptop directivo", "mesa2",
         OrigenOrden.automatico, None, None, None, None,
         date.today() + timedelta(days=93)),

        ("EQ-LIM-0004", TipoMantenimiento.preventivo, EstadoOrden.programado,
         date.today() + timedelta(days=5),
         "Mantenimiento semestral – Impresora LaserJet", "mesa3",
         OrigenOrden.automatico, None, None, None, None, None),

        ("EQ-TRU-0001", TipoMantenimiento.correctivo, EstadoOrden.programado,
         date.today() + timedelta(days=1),
         "PC lenta y congelamiento frecuente – desde ticket TK-2024-00007", "tec_norte",
         OrigenOrden.ticket, None, None, None, None, None),

        ("EQ-LIM-0009", TipoMantenimiento.preventivo, EstadoOrden.programado,
         date.today() + timedelta(days=7),
         "Revisión semestral de switch – verificar logs y firmware", "esp_redes",
         OrigenOrden.automatico, None, None, None, None,
         date.today() + timedelta(days=187)),

        ("EQ-LIM-0008", TipoMantenimiento.preventivo, EstadoOrden.programado,
         date.today() + timedelta(days=10),
         "Revisión de UPS – prueba de batería y autonomía", "esp_servidores",
         OrigenOrden.manual, None, None, None, None,
         date.today() + timedelta(days=190)),

        # Vencidas (para ver alertas)
        ("EQ-TRU-0002", TipoMantenimiento.preventivo, EstadoOrden.programado,
         date.today() - timedelta(days=5),
         "Mantenimiento preventivo vencido – Laptop sede norte", "tec_norte",
         OrigenOrden.automatico, None, None, None, None, None),

        ("EQ-LIM-0006", TipoMantenimiento.preventivo, EstadoOrden.postergado,
         date.today() - timedelta(days=15),
         "Mantenimiento postergado por carga de trabajo", "mesa1",
         OrigenOrden.automatico, None, None, None, None,
         date.today() + timedelta(days=7)),
    ]

    ordenes = []
    for od in ordenes_data:
        o = mk_orden(*od)
        if o:
            ordenes.append(o)
            db.add(o)
            db.flush()

            # Agregar checklist
            tareas = tareas_prev if od[1] == TipoMantenimiento.preventivo else tareas_corr
            for i, tarea in enumerate(tareas):
                completado = od[2] == EstadoOrden.completado or (
                    od[2] == EstadoOrden.en_proceso and i < 3
                )
                db.add(ChecklistMantenimiento(
                    orden_id=o.id, tarea=tarea,
                    completado=completado,
                    observacion="Realizado sin observaciones" if completado else None,
                ))

    print(f"  ✔ Órdenes de mantenimiento: {len(ordenes)}")

# ─────────────────────────────────────────────────────────────────────────────
def _compras_demo(db):
    if db.query(SolicitudCompra).count() > 0:
        print("  — Solicitudes de compra ya existen")
        return

    usuarios = {u.username: u for u in db.query(Usuario).all()}
    proveedores = {p.ruc: p for p in db.query(Proveedor).all()}

    solicitudes_data = [
        ("SC-2024-001", TipoSolicitud.equipo_nuevo, EstadoSolicitud.aprobada,
         "Adquisición de 5 laptops para personal nuevo de sede central",
         "Ampliación de personal en el área de administración requiere 5 laptops nuevas.",
         "Lenovo ThinkPad E14 Gen 4, Intel Core i5-1235U, 8GB RAM, 256GB SSD, Windows 11 Pro",
         "ufin_adm", "jefesistemas", "20504567890", 17500.00,
         [("Laptop Lenovo ThinkPad E14 Gen 4", 5, "unidad", 3500.00)]),

        ("SC-2024-002", TipoSolicitud.licencia, EstadoSolicitud.en_proceso,
         "Renovación de licencias Microsoft 365 Business Standard – 25 usuarios",
         "Las licencias actuales vencen el 31/12/2024. Renovación anual necesaria.",
         "Microsoft 365 Business Standard, suscripción anual, 25 usuarios",
         "jefesistemas", "jefesistemas", "20502345678", 12500.00,
         [("Microsoft 365 Business Standard – 25 usuarios, 1 año", 1, "suscripción", 12500.00)]),

        ("SC-2024-003", TipoSolicitud.equipo_nuevo, EstadoSolicitud.enviada,
         "Impresora multifuncional para área de logística",
         "La impresora actual tiene 5 años y está fallando constantemente. Se requiere reemplazo.",
         "Impresora HP LaserJet Pro MFP M428fdw, impresión doble cara, escáner, copiadora",
         "ufin_log", "jefesistemas", "20505678901", 2800.00,
         [("HP LaserJet Pro MFP M428fdw", 1, "unidad", 2800.00)]),

        ("SC-2024-004", TipoSolicitud.repuesto, EstadoSolicitud.recibida,
         "Memoria RAM para actualización de PCs antiguos",
         "10 PCs del área de administración tienen solo 4GB RAM. Actualización a 8GB mejorará rendimiento.",
         "Módulos RAM DDR4 4GB 2666MHz compatible con equipos Lenovo ThinkCentre",
         "mesa1", "jefesistemas", "20501234567", 1500.00,
         [("Módulo RAM DDR4 4GB 2666MHz", 10, "unidad", 150.00)]),

        ("SC-2024-005", TipoSolicitud.servicio, EstadoSolicitud.borrador,
         "Servicio de mantenimiento preventivo para sede norte y sur",
         "Contratar servicio externo de mantenimiento para 20 equipos en sedes remotas.",
         "Servicio de mantenimiento preventivo semestral, incluye mano de obra y materiales",
         "tec_norte", None, None, 8000.00,
         [("Mantenimiento preventivo – Sede Norte (10 equipos)", 1, "servicio", 4000.00),
          ("Mantenimiento preventivo – Sede Sur (10 equipos)",   1, "servicio", 4000.00)]),

        ("SC-2024-006", TipoSolicitud.renovacion, EstadoSolicitud.rechazada,
         "Renovación antivirus ESET – 50 licencias",
         "Las licencias de ESET vencieron. Necesitamos renovación urgente para proteger los equipos.",
         "ESET Endpoint Security, 50 licencias, 2 años",
         "esp_seguridad", "jefesistemas", "20501234567", 9000.00,
         [("ESET Endpoint Security – 50 licencias, 2 años", 1, "paquete", 9000.00)]),
    ]

    for sd in solicitudes_data:
        num, tipo, estado, desc, just, esp, sol, apr, prov_ruc, val, items_data = sd
        sol_u = usuarios.get(sol)
        apr_u = usuarios.get(apr) if apr else None
        prov  = proveedores.get(prov_ruc) if prov_ruc else None

        s = SolicitudCompra(
            numero=num, tipo=tipo, estado=estado,
            descripcion=desc, justificacion=just, especificaciones=esp,
            solicitante_id=sol_u.id if sol_u else None,
            aprobador_id=apr_u.id if apr_u else None,
            proveedor_id=prov.id if prov else None,
            valor_estimado=val,
            valor_aprobado=val if estado in [EstadoSolicitud.aprobada, EstadoSolicitud.en_proceso, EstadoSolicitud.recibida] else None,
            presupuesto_codigo=f"2.6.7.{num[-3:]}",
            motivo_rechazo="El presupuesto de TI ya fue comprometido para este trimestre. Reprogramar para Q1-2025." if estado == EstadoSolicitud.rechazada else None,
            creado_en=datetime.utcnow() - timedelta(days=30),
            fecha_aprobacion=datetime.utcnow() - timedelta(days=20) if estado in [EstadoSolicitud.aprobada, EstadoSolicitud.en_proceso, EstadoSolicitud.recibida] else None,
            fecha_recepcion=datetime.utcnow() - timedelta(days=5) if estado == EstadoSolicitud.recibida else None,
        )
        db.add(s)
        db.flush()

        for item_desc, qty, unit, precio in items_data:
            db.add(ItemSolicitud(
                solicitud_id=s.id, descripcion=item_desc,
                cantidad=qty, unidad=unit,
                precio_unitario=precio, subtotal=qty * precio,
            ))

    print(f"  ✔ Solicitudes de compra: {len(solicitudes_data)}")

# ─────────────────────────────────────────────────────────────────────────────
def _backup_demo(db):
    if db.query(EjecucionBackup).count() > 0:
        print("  — Ejecuciones de backup ya existen")
        return

    politicas = db.query(PoliticaBackup).all()
    if not politicas:
        print("  — No hay políticas de backup aún")
        return

    ejecuciones = []
    for pol in politicas:
        # Últimos 7 días de backups
        for dias in range(7, 0, -1):
            inicio = datetime.utcnow() - timedelta(days=dias, hours=1)
            fin    = inicio + timedelta(minutes=45)
            # Simular 1 fallo en los últimos 7 días
            estado = EstadoBackup.fallido if dias == 3 else EstadoBackup.exitoso
            ej = EjecucionBackup(
                politica_id=pol.id,
                estado=estado,
                inicio=inicio,
                fin=fin if estado == EstadoBackup.exitoso else None,
                tamanio_gb=round(2.5 + dias * 0.3, 2) if estado == EstadoBackup.exitoso else None,
                archivos_total=1250 + dias * 50 if estado == EstadoBackup.exitoso else None,
                ruta_archivo=f"//NAS-BACKUP/{pol.nombre}/{inicio.strftime('%Y%m%d')}.tar.gz" if estado == EstadoBackup.exitoso else None,
                verificado=dias > 3,
                fecha_verificacion=datetime.utcnow() - timedelta(days=dias-1) if dias > 3 else None,
                log=f"[OK] Backup completado en {45} minutos." if estado == EstadoBackup.exitoso else "[ERROR] Timeout de conexión al servidor de origen. Reintentar.",
                alertado=estado == EstadoBackup.fallido,
            )
            ejecuciones.append(ej)

    db.add_all(ejecuciones)
    print(f"  ✔ Ejecuciones de backup: {len(ejecuciones)}")

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🎭  Cargando datos de demostración...\n")
    run()
