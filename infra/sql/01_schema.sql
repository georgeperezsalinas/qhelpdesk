BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 69e0650d631f

CREATE TABLE cronogramas_mantenimiento (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200) NOT NULL, 
    tipo_equipo VARCHAR(50), 
    frecuencia_dias INTEGER, 
    descripcion_tareas TEXT, 
    activo BOOLEAN, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_cronogramas_mantenimiento_id ON cronogramas_mantenimiento (id);

CREATE TABLE proveedores (
    id SERIAL NOT NULL, 
    razon_social VARCHAR(300) NOT NULL, 
    ruc VARCHAR(20) NOT NULL, 
    contacto VARCHAR(200), 
    telefono VARCHAR(30), 
    email VARCHAR(200), 
    web VARCHAR(200), 
    direccion VARCHAR(300), 
    categoria VARCHAR(100), 
    activo BOOLEAN, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    UNIQUE (ruc)
);

CREATE INDEX ix_proveedores_id ON proveedores (id);

CREATE TABLE sedes (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200) NOT NULL, 
    codigo VARCHAR(20) NOT NULL, 
    direccion VARCHAR(300), 
    distrito VARCHAR(100), 
    provincia VARCHAR(100), 
    region VARCHAR(100), 
    telefono VARCHAR(30), 
    es_central BOOLEAN, 
    activa BOOLEAN, 
    observaciones TEXT, 
    PRIMARY KEY (id), 
    UNIQUE (codigo)
);

CREATE INDEX ix_sedes_id ON sedes (id);

CREATE TABLE centrales_telefonicas (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200), 
    marca VARCHAR(100), 
    modelo VARCHAR(200), 
    ip VARCHAR(20), 
    sede_id INTEGER, 
    extensiones_total INTEGER, 
    en_garantia BOOLEAN, 
    activa BOOLEAN, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id)
);

CREATE INDEX ix_centrales_telefonicas_id ON centrales_telefonicas (id);

CREATE TYPE tipocontrato AS ENUM ('mantenimiento', 'soporte', 'licencia', 'servicio', 'alquiler', 'otro');

CREATE TYPE estadocontrato AS ENUM ('vigente', 'por_vencer', 'vencido', 'rescindido');

CREATE TABLE contratos (
    id SERIAL NOT NULL, 
    numero VARCHAR(100) NOT NULL, 
    tipo tipocontrato, 
    objeto TEXT, 
    proveedor_id INTEGER NOT NULL, 
    estado estadocontrato, 
    fecha_inicio DATE, 
    fecha_fin DATE, 
    monto FLOAT, 
    moneda VARCHAR(5), 
    alerta_30 BOOLEAN, 
    alerta_15 BOOLEAN, 
    alerta_7 BOOLEAN, 
    archivo_url VARCHAR(500), 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(proveedor_id) REFERENCES proveedores (id), 
    UNIQUE (numero)
);

CREATE INDEX ix_contratos_id ON contratos (id);

CREATE TYPE estadoservicio AS ENUM ('operativo', 'degradado', 'fuera', 'mantenimiento');

CREATE TABLE dispositivos_red (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200), 
    tipo VARCHAR(50), 
    marca VARCHAR(100), 
    modelo VARCHAR(200), 
    serie VARCHAR(200), 
    ip_gestion VARCHAR(20), 
    sede_id INTEGER, 
    ubicacion VARCHAR(200), 
    estado estadoservicio, 
    firmware VARCHAR(50), 
    fecha_compra TIMESTAMP WITHOUT TIME ZONE, 
    garantia_hasta TIMESTAMP WITHOUT TIME ZONE, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id)
);

CREATE INDEX ix_dispositivos_red_id ON dispositivos_red (id);

CREATE TABLE licencias (
    id SERIAL NOT NULL, 
    software VARCHAR(200) NOT NULL, 
    version VARCHAR(50), 
    fabricante VARCHAR(200), 
    tipo_licencia VARCHAR(100), 
    cantidad_total INTEGER, 
    cantidad_usada INTEGER, 
    clave TEXT, 
    proveedor_id INTEGER, 
    orden_compra VARCHAR(100), 
    fecha_compra DATE, 
    fecha_vencimiento DATE, 
    valor FLOAT, 
    alerta_30 BOOLEAN, 
    alerta_15 BOOLEAN, 
    alerta_7 BOOLEAN, 
    activa BOOLEAN, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(proveedor_id) REFERENCES proveedores (id)
);

CREATE INDEX ix_licencias_id ON licencias (id);

CREATE TYPE rolusuario AS ENUM ('jefe', 'especialista', 'mesa_ayuda', 'alta_direccion', 'usuario_final', 'usuario_externo');

CREATE TYPE turnotecnico AS ENUM ('manana', 'tarde', 'noche');

CREATE TABLE usuarios (
    id SERIAL NOT NULL, 
    username VARCHAR(100) NOT NULL, 
    email VARCHAR(200) NOT NULL, 
    nombre VARCHAR(150) NOT NULL, 
    apellido VARCHAR(150) NOT NULL, 
    hashed_password VARCHAR(300), 
    rol rolusuario NOT NULL, 
    cargo VARCHAR(200), 
    area VARCHAR(200), 
    sede_id INTEGER, 
    telefono VARCHAR(30), 
    celular VARCHAR(30), 
    activo BOOLEAN, 
    ldap_dn VARCHAR(500), 
    foto_url VARCHAR(500), 
    turno turnotecnico, 
    skills TEXT, 
    carga_maxima INTEGER, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    ultimo_acceso TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id)
);

CREATE UNIQUE INDEX ix_usuarios_email ON usuarios (email);

CREATE INDEX ix_usuarios_id ON usuarios (id);

CREATE UNIQUE INDEX ix_usuarios_username ON usuarios (username);

CREATE TYPE estadoarticulo AS ENUM ('borrador', 'publicado', 'archivado');

CREATE TABLE articulos_kb (
    id SERIAL NOT NULL, 
    titulo VARCHAR(300) NOT NULL, 
    contenido TEXT NOT NULL, 
    categoria VARCHAR(100), 
    tags VARCHAR(300), 
    estado estadoarticulo, 
    autor_id INTEGER, 
    vistas INTEGER, 
    util_si INTEGER, 
    util_no INTEGER, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    actualizado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(autor_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_articulos_kb_id ON articulos_kb (id);

CREATE TYPE tipoequipo AS ENUM ('pc_escritorio', 'laptop', 'servidor', 'impresora', 'switch', 'router', 'firewall', 'access_point', 'ups', 'proyector', 'telefono_ip', 'celular', 'tablet', 'scanner', 'otro');

CREATE TYPE estadoequipo AS ENUM ('activo', 'en_mantenimiento', 'en_reparacion', 'de_baja', 'bodega', 'robado_perdido');

CREATE TABLE equipos (
    id SERIAL NOT NULL, 
    codigo_inventario VARCHAR(50) NOT NULL, 
    codigo_patrimonial VARCHAR(50), 
    tipo tipoequipo NOT NULL, 
    marca VARCHAR(100), 
    modelo VARCHAR(200), 
    serie VARCHAR(200), 
    procesador VARCHAR(200), 
    ram_gb INTEGER, 
    disco_gb INTEGER, 
    pantalla_pulgadas FLOAT, 
    sistema_operativo VARCHAR(100), 
    office_version VARCHAR(50), 
    mac_address VARCHAR(20), 
    ip_asignada VARCHAR(20), 
    estado estadoequipo, 
    usuario_asignado_id INTEGER, 
    sede_id INTEGER, 
    ubicacion_fisica VARCHAR(200), 
    proveedor_id INTEGER, 
    orden_compra VARCHAR(100), 
    fecha_compra DATE, 
    valor_compra FLOAT, 
    vida_util_anios INTEGER, 
    valor_residual FLOAT, 
    garantia_hasta DATE, 
    poliza_seguro VARCHAR(100), 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    actualizado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(proveedor_id) REFERENCES proveedores (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id), 
    FOREIGN KEY(usuario_asignado_id) REFERENCES usuarios (id), 
    UNIQUE (codigo_patrimonial)
);

CREATE UNIQUE INDEX ix_equipos_codigo_inventario ON equipos (codigo_inventario);

CREATE INDEX ix_equipos_id ON equipos (id);

CREATE INDEX ix_equipos_serie ON equipos (serie);

CREATE TYPE tiponotificacion AS ENUM ('ticket_nuevo', 'ticket_asignado', 'ticket_actualizado', 'ticket_resuelto', 'sla_por_vencer', 'sla_vencido', 'licencia_por_vencer', 'mantenimiento_prog', 'backup_fallido', 'contrato_por_vencer', 'sistema');

CREATE TABLE notificaciones (
    id SERIAL NOT NULL, 
    usuario_id INTEGER NOT NULL, 
    tipo tiponotificacion, 
    titulo VARCHAR(300), 
    mensaje TEXT, 
    url VARCHAR(300), 
    leida BOOLEAN, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_notificaciones_id ON notificaciones (id);

CREATE TYPE tipobackup AS ENUM ('full', 'incremental', 'diferencial');

CREATE TABLE politicas_backup (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200) NOT NULL, 
    servidor VARCHAR(200), 
    ruta_origen VARCHAR(300), 
    ruta_destino VARCHAR(300), 
    tipo tipobackup, 
    frecuencia VARCHAR(50), 
    hora_ejecucion TIME WITHOUT TIME ZONE, 
    retencion_dias INTEGER, 
    activa BOOLEAN, 
    responsable_id INTEGER, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(responsable_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_politicas_backup_id ON politicas_backup (id);

CREATE TYPE tiposervidor AS ENUM ('fisico', 'virtual', 'nube');

CREATE TABLE servidores (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200) NOT NULL, 
    hostname VARCHAR(200), 
    ip_gestion VARCHAR(20), 
    tipo tiposervidor, 
    sistema_operativo VARCHAR(100), 
    version_so VARCHAR(50), 
    cpu_nucleos INTEGER, 
    ram_gb INTEGER, 
    disco_total_tb FLOAT, 
    sede_id INTEGER, 
    rack VARCHAR(50), 
    estado estadoservicio, 
    responsable_id INTEGER, 
    servicios TEXT, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    actualizado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(responsable_id) REFERENCES usuarios (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id), 
    UNIQUE (hostname)
);

CREATE INDEX ix_servidores_id ON servidores (id);

CREATE TYPE tiposolicitud AS ENUM ('equipo_nuevo', 'repuesto', 'licencia', 'servicio', 'renovacion', 'otro');

CREATE TYPE estadosolicitud AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada', 'en_cotizacion', 'en_proceso', 'recibida', 'cancelada');

CREATE TABLE solicitudes_compra (
    id SERIAL NOT NULL, 
    numero VARCHAR(20) NOT NULL, 
    tipo tiposolicitud, 
    estado estadosolicitud, 
    descripcion TEXT NOT NULL, 
    justificacion TEXT, 
    especificaciones TEXT, 
    solicitante_id INTEGER NOT NULL, 
    aprobador_id INTEGER, 
    proveedor_id INTEGER, 
    valor_estimado FLOAT, 
    valor_aprobado FLOAT, 
    valor_final FLOAT, 
    moneda VARCHAR(5), 
    presupuesto_codigo VARCHAR(100), 
    orden_compra_numero VARCHAR(100), 
    fecha_necesidad DATE, 
    fecha_aprobacion TIMESTAMP WITHOUT TIME ZONE, 
    fecha_recepcion TIMESTAMP WITHOUT TIME ZONE, 
    motivo_rechazo TEXT, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    actualizado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(aprobador_id) REFERENCES usuarios (id), 
    FOREIGN KEY(proveedor_id) REFERENCES proveedores (id), 
    FOREIGN KEY(solicitante_id) REFERENCES usuarios (id), 
    UNIQUE (numero)
);

CREATE INDEX ix_solicitudes_compra_id ON solicitudes_compra (id);

CREATE TABLE asignaciones_licencia (
    id SERIAL NOT NULL, 
    licencia_id INTEGER NOT NULL, 
    equipo_id INTEGER, 
    usuario_id INTEGER, 
    fecha DATE, 
    activa BOOLEAN, 
    PRIMARY KEY (id), 
    FOREIGN KEY(equipo_id) REFERENCES equipos (id), 
    FOREIGN KEY(licencia_id) REFERENCES licencias (id), 
    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_asignaciones_licencia_id ON asignaciones_licencia (id);

CREATE TABLE bases_datos (
    id SERIAL NOT NULL, 
    nombre VARCHAR(200) NOT NULL, 
    motor VARCHAR(50), 
    version VARCHAR(50), 
    servidor_id INTEGER, 
    puerto INTEGER, 
    sistema_info VARCHAR(200), 
    tamanio_gb FLOAT, 
    activa BOOLEAN, 
    responsable_id INTEGER, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(responsable_id) REFERENCES usuarios (id), 
    FOREIGN KEY(servidor_id) REFERENCES servidores (id)
);

CREATE INDEX ix_bases_datos_id ON bases_datos (id);

CREATE TYPE estadobackup AS ENUM ('exitoso', 'fallido', 'parcial', 'corriendo', 'cancelado');

CREATE TABLE ejecuciones_backup (
    id SERIAL NOT NULL, 
    politica_id INTEGER NOT NULL, 
    estado estadobackup, 
    inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    fin TIMESTAMP WITHOUT TIME ZONE, 
    tamanio_gb FLOAT, 
    archivos_total INTEGER, 
    ruta_archivo VARCHAR(500), 
    hash_md5 VARCHAR(64), 
    verificado BOOLEAN, 
    fecha_verificacion TIMESTAMP WITHOUT TIME ZONE, 
    verificado_por_id INTEGER, 
    resultado_verificacion TEXT, 
    alertado BOOLEAN, 
    log TEXT, 
    PRIMARY KEY (id), 
    FOREIGN KEY(politica_id) REFERENCES politicas_backup (id), 
    FOREIGN KEY(verificado_por_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_ejecuciones_backup_id ON ejecuciones_backup (id);

CREATE TABLE items_solicitud (
    id SERIAL NOT NULL, 
    solicitud_id INTEGER NOT NULL, 
    descripcion VARCHAR(300) NOT NULL, 
    cantidad INTEGER, 
    unidad VARCHAR(50), 
    precio_unitario FLOAT, 
    subtotal FLOAT, 
    PRIMARY KEY (id), 
    FOREIGN KEY(solicitud_id) REFERENCES solicitudes_compra (id)
);

CREATE INDEX ix_items_solicitud_id ON items_solicitud (id);

CREATE TYPE tipolinea AS ENUM ('fija', 'celular', 'voip', 'fax');

CREATE TABLE lineas_telefonicas (
    id SERIAL NOT NULL, 
    numero VARCHAR(30) NOT NULL, 
    tipo tipolinea, 
    operador VARCHAR(100), 
    plan VARCHAR(200), 
    costo_mensual FLOAT, 
    asignado_a_id INTEGER, 
    sede_id INTEGER, 
    es_directivo BOOLEAN, 
    fecha_asignacion DATE, 
    fecha_vencimiento DATE, 
    activa BOOLEAN, 
    imei VARCHAR(50), 
    equipo_celular VARCHAR(200), 
    equipo_id INTEGER, 
    observaciones TEXT, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(asignado_a_id) REFERENCES usuarios (id), 
    FOREIGN KEY(equipo_id) REFERENCES equipos (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id), 
    UNIQUE (numero)
);

CREATE INDEX ix_lineas_telefonicas_id ON lineas_telefonicas (id);

CREATE TABLE movimientos_equipo (
    id SERIAL NOT NULL, 
    equipo_id INTEGER NOT NULL, 
    tipo VARCHAR(50), 
    usuario_origen_id INTEGER, 
    usuario_destino_id INTEGER, 
    sede_origen_id INTEGER, 
    sede_destino_id INTEGER, 
    motivo TEXT, 
    acta_numero VARCHAR(100), 
    responsable_id INTEGER, 
    fecha TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(equipo_id) REFERENCES equipos (id), 
    FOREIGN KEY(responsable_id) REFERENCES usuarios (id), 
    FOREIGN KEY(sede_destino_id) REFERENCES sedes (id), 
    FOREIGN KEY(sede_origen_id) REFERENCES sedes (id), 
    FOREIGN KEY(usuario_destino_id) REFERENCES usuarios (id), 
    FOREIGN KEY(usuario_origen_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_movimientos_equipo_id ON movimientos_equipo (id);

CREATE TYPE prioridadticket AS ENUM ('critica', 'alta', 'media', 'baja');

CREATE TYPE estadoticket AS ENUM ('abierto', 'asignado', 'en_progreso', 'pendiente', 'escalado', 'resuelto', 'cerrado', 'cancelado');

CREATE TYPE categoriaticket AS ENUM ('hardware', 'software', 'red', 'acceso', 'vpn', 'correo', 'impresora', 'telefonia', 'servidor', 'seguridad', 'mantenimiento', 'otro');

CREATE TYPE canalentrada AS ENUM ('portal', 'correo', 'whatsapp', 'llamada', 'sistema');

CREATE TABLE tickets (
    id SERIAL NOT NULL, 
    numero VARCHAR(20) NOT NULL, 
    titulo VARCHAR(300) NOT NULL, 
    descripcion TEXT, 
    prioridad prioridadticket NOT NULL, 
    estado estadoticket NOT NULL, 
    categoria categoriaticket, 
    canal_entrada canalentrada, 
    sede_id INTEGER, 
    solicitante_id INTEGER NOT NULL, 
    tecnico_id INTEGER, 
    tecnico_nivel2_id INTEGER, 
    equipo_id INTEGER, 
    creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    actualizado_en TIMESTAMP WITHOUT TIME ZONE, 
    asignado_en TIMESTAMP WITHOUT TIME ZONE, 
    resuelto_en TIMESTAMP WITHOUT TIME ZONE, 
    cerrado_en TIMESTAMP WITHOUT TIME ZONE, 
    sla_limite TIMESTAMP WITHOUT TIME ZONE, 
    sla_cumplido BOOLEAN, 
    tiempo_resolucion_h FLOAT, 
    solucion TEXT, 
    articulo_kb_id INTEGER, 
    nps_enviado BOOLEAN, 
    nps_puntuacion INTEGER, 
    nps_comentario TEXT, 
    email_message_id VARCHAR(300), 
    email_asunto VARCHAR(300), 
    PRIMARY KEY (id), 
    FOREIGN KEY(articulo_kb_id) REFERENCES articulos_kb (id), 
    FOREIGN KEY(equipo_id) REFERENCES equipos (id), 
    FOREIGN KEY(sede_id) REFERENCES sedes (id), 
    FOREIGN KEY(solicitante_id) REFERENCES usuarios (id), 
    FOREIGN KEY(tecnico_id) REFERENCES usuarios (id), 
    FOREIGN KEY(tecnico_nivel2_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_tickets_id ON tickets (id);

CREATE UNIQUE INDEX ix_tickets_numero ON tickets (numero);

CREATE TABLE adjuntos_ticket (
    id SERIAL NOT NULL, 
    ticket_id INTEGER NOT NULL, 
    nombre VARCHAR(300), 
    ruta VARCHAR(500), 
    tipo_mime VARCHAR(100), 
    tamanio_kb INTEGER, 
    subido_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(ticket_id) REFERENCES tickets (id)
);

CREATE INDEX ix_adjuntos_ticket_id ON adjuntos_ticket (id);

CREATE TABLE comentarios_ticket (
    id SERIAL NOT NULL, 
    ticket_id INTEGER NOT NULL, 
    autor_id INTEGER NOT NULL, 
    contenido TEXT NOT NULL, 
    es_interno BOOLEAN, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(autor_id) REFERENCES usuarios (id), 
    FOREIGN KEY(ticket_id) REFERENCES tickets (id)
);

CREATE INDEX ix_comentarios_ticket_id ON comentarios_ticket (id);

CREATE TABLE historial_ticket (
    id SERIAL NOT NULL, 
    ticket_id INTEGER NOT NULL, 
    usuario_id INTEGER, 
    campo VARCHAR(100), 
    valor_anterior VARCHAR(300), 
    valor_nuevo VARCHAR(300), 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(ticket_id) REFERENCES tickets (id), 
    FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_historial_ticket_id ON historial_ticket (id);

CREATE TYPE tipomantenimiento AS ENUM ('preventivo', 'correctivo');

CREATE TYPE origenorden AS ENUM ('manual', 'automatico', 'ticket');

CREATE TYPE estadoorden AS ENUM ('programado', 'en_proceso', 'completado', 'cancelado', 'postergado');

CREATE TABLE ordenes_mantenimiento (
    id SERIAL NOT NULL, 
    numero VARCHAR(20) NOT NULL, 
    tipo tipomantenimiento NOT NULL, 
    origen origenorden, 
    estado estadoorden, 
    equipo_id INTEGER NOT NULL, 
    tecnico_id INTEGER, 
    ticket_origen_id INTEGER, 
    cronograma_id INTEGER, 
    fecha_programada DATE NOT NULL, 
    fecha_inicio TIMESTAMP WITHOUT TIME ZONE, 
    fecha_fin TIMESTAMP WITHOUT TIME ZONE, 
    duracion_minutos INTEGER, 
    costo FLOAT, 
    descripcion TEXT, 
    trabajos_realizados TEXT, 
    repuestos_usados TEXT, 
    proxima_fecha DATE, 
    requiere_baja BOOLEAN, 
    creado_en TIMESTAMP WITHOUT TIME ZONE, 
    actualizado_en TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(cronograma_id) REFERENCES cronogramas_mantenimiento (id), 
    FOREIGN KEY(equipo_id) REFERENCES equipos (id), 
    FOREIGN KEY(tecnico_id) REFERENCES usuarios (id), 
    FOREIGN KEY(ticket_origen_id) REFERENCES tickets (id), 
    UNIQUE (numero)
);

CREATE INDEX ix_ordenes_mantenimiento_id ON ordenes_mantenimiento (id);

CREATE TABLE checklist_mantenimiento (
    id SERIAL NOT NULL, 
    orden_id INTEGER NOT NULL, 
    tarea VARCHAR(300) NOT NULL, 
    completado BOOLEAN, 
    observacion TEXT, 
    PRIMARY KEY (id), 
    FOREIGN KEY(orden_id) REFERENCES ordenes_mantenimiento (id)
);

CREATE INDEX ix_checklist_mantenimiento_id ON checklist_mantenimiento (id);

INSERT INTO alembic_version (version_num) VALUES ('69e0650d631f') RETURNING alembic_version.version_num;

COMMIT;

