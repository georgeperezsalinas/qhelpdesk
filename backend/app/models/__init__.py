# Importar en orden: primero las entidades independientes, luego las que tienen FKs

from app.models.sede          import Sede
from app.models.proveedor     import Proveedor
from app.models.conocimiento  import ArticuloKB
from app.models.usuario       import Usuario, RolUsuario, TurnoTecnico
from app.models.inventario    import Equipo, MovimientoEquipo, Licencia, AsignacionLicencia, TipoEquipo, EstadoEquipo
from app.models.ticket        import (
    Ticket, ComentarioTicket, AdjuntoTicket, HistorialTicket,
    PrioridadTicket, EstadoTicket, CategoriaTicket, CanalEntrada
)
from app.models.mantenimiento import (
    OrdenMantenimiento, CronogramaMantenimiento, ChecklistMantenimiento,
    TipoMantenimiento, EstadoOrden
)
from app.models.backup        import PoliticaBackup, EjecucionBackup, EstadoBackup
from app.models.compra        import SolicitudCompra, ItemSolicitud, EstadoSolicitud
from app.models.contrato      import Contrato, TipoContrato
from app.models.telefonia     import LineaTelefonica, CentralTelefonica
from app.models.infraestructura import Servidor, BaseDatos, DispositivoRed
from app.models.notificacion  import Notificacion, TipoNotificacion
from app.models.configuracion import ConfiguracionApp
