from sqlalchemy import Column, Integer, String, Float, Date, Boolean, Enum, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoEquipo(str, enum.Enum):
    pc_escritorio   = "pc_escritorio"
    laptop          = "laptop"
    servidor        = "servidor"
    impresora       = "impresora"
    switch          = "switch"
    router          = "router"
    firewall        = "firewall"
    access_point    = "access_point"
    ups             = "ups"
    proyector       = "proyector"
    telefono_ip     = "telefono_ip"
    celular         = "celular"
    tablet          = "tablet"
    scanner         = "scanner"
    otro            = "otro"

class EstadoEquipo(str, enum.Enum):
    activo          = "activo"
    en_mantenimiento = "en_mantenimiento"
    en_reparacion   = "en_reparacion"
    de_baja         = "de_baja"
    bodega          = "bodega"
    robado_perdido  = "robado_perdido"

class Equipo(Base):
    __tablename__ = "equipos"

    id                   = Column(Integer, primary_key=True, index=True)
    codigo_inventario    = Column(String(50), unique=True, nullable=False, index=True)
    codigo_patrimonial   = Column(String(50), unique=True, nullable=True)   # código del área de patrimonio
    tipo                 = Column(Enum(TipoEquipo), nullable=False)
    marca                = Column(String(100))
    modelo               = Column(String(200))
    serie                = Column(String(200), index=True)
    procesador           = Column(String(200))
    ram_gb               = Column(Integer)
    disco_gb             = Column(Integer)
    pantalla_pulgadas    = Column(Float)
    sistema_operativo    = Column(String(100))
    office_version       = Column(String(50))
    mac_address          = Column(String(20))
    ip_asignada          = Column(String(20))
    estado               = Column(Enum(EstadoEquipo), default=EstadoEquipo.activo)

    # Asignación
    usuario_asignado_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    sede_id              = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    ubicacion_fisica     = Column(String(200))   # "Piso 3 – Oficina 302"

    # Datos de compra / financieros
    proveedor_id         = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    orden_compra         = Column(String(100))
    fecha_compra         = Column(Date)
    valor_compra         = Column(Float)
    vida_util_anios      = Column(Integer, default=4)
    valor_residual       = Column(Float, default=0)
    garantia_hasta       = Column(Date, nullable=True)
    poliza_seguro        = Column(String(100), nullable=True)

    foto_url             = Column(String(500), nullable=True)
    observaciones        = Column(Text)
    creado_en            = Column(DateTime, default=datetime.utcnow)
    actualizado_en       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    usuario_asignado     = relationship("Usuario",   foreign_keys=[usuario_asignado_id])
    sede                 = relationship("Sede",       back_populates="equipos")
    proveedor            = relationship("Proveedor",  back_populates="equipos")
    tickets              = relationship("Ticket",     back_populates="equipo")
    ordenes_mantenimiento = relationship("OrdenMantenimiento", back_populates="equipo")
    movimientos          = relationship("MovimientoEquipo", back_populates="equipo", cascade="all, delete-orphan")


class MovimientoEquipo(Base):
    """Historial de asignaciones / traslados del equipo"""
    __tablename__ = "movimientos_equipo"

    id              = Column(Integer, primary_key=True, index=True)
    equipo_id       = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tipo            = Column(String(50))   # "asignacion", "traslado", "baja", "ingreso_bodega"
    usuario_origen_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuario_destino_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    sede_origen_id     = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    sede_destino_id    = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    motivo          = Column(Text)
    acta_numero     = Column(String(100))   # número de acta de entrega
    responsable_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha           = Column(DateTime, default=datetime.utcnow)

    equipo          = relationship("Equipo", back_populates="movimientos")


class Licencia(Base):
    __tablename__ = "licencias"

    id                  = Column(Integer, primary_key=True, index=True)
    software            = Column(String(200), nullable=False)
    version             = Column(String(50))
    fabricante          = Column(String(200))
    tipo_licencia       = Column(String(100))   # volumen, OEM, suscripcion, open_source
    cantidad_total      = Column(Integer, default=1)
    cantidad_usada      = Column(Integer, default=0)
    clave               = Column(Text, nullable=True)
    proveedor_id        = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    orden_compra        = Column(String(100))
    fecha_compra        = Column(Date)
    fecha_vencimiento   = Column(Date, nullable=True)
    valor               = Column(Float)
    alerta_30           = Column(Boolean, default=False)
    alerta_15           = Column(Boolean, default=False)
    alerta_7            = Column(Boolean, default=False)
    activa              = Column(Boolean, default=True)
    observaciones       = Column(Text)
    creado_en           = Column(DateTime, default=datetime.utcnow)

    proveedor           = relationship("Proveedor", back_populates="licencias")
    asignaciones        = relationship("AsignacionLicencia", back_populates="licencia", cascade="all, delete-orphan")


class AsignacionLicencia(Base):
    """Qué equipo o usuario usa cada licencia"""
    __tablename__ = "asignaciones_licencia"

    id          = Column(Integer, primary_key=True, index=True)
    licencia_id = Column(Integer, ForeignKey("licencias.id"), nullable=False)
    equipo_id   = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha       = Column(Date)
    activa      = Column(Boolean, default=True)

    licencia    = relationship("Licencia", back_populates="asignaciones")
