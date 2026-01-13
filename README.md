# Support Tracker API

API backend para seguimiento de tickets de soporte y métricas diarias de agentes, construida con FastAPI y SQLAlchemy.

## Características

- **FastAPI**: Framework moderno y rápido para construir APIs
- **SQLAlchemy**: ORM para manejo de base de datos
- **PostgreSQL**: Base de datos relacional
- **Pydantic**: Validación de datos y serialización
- **Multi-equipo**: Soporte para múltiples equipos y agentes persistentes
- **Carga masiva**: Soporte para cargar múltiples métricas diarias a la vez

## Estructura del Proyecto

```
support_tracker/
├── main.py              # Aplicación FastAPI principal
├── database.py          # Configuración de conexión a base de datos
├── models.py            # Modelos SQLAlchemy
├── schemas.py           # Schemas Pydantic para validación
├── requirements.txt     # Dependencias del proyecto
├── routers/             # Routers modulares
│   ├── __init__.py
│   ├── teams.py         # Endpoints CRUD para equipos
│   ├── agents.py        # Endpoints CRUD para agentes
│   └── performances.py  # Endpoints para métricas de rendimiento
├── services/            # Servicios de negocio
│   ├── __init__.py
│   └── parser.py        # Parser para datos de Excel
├── .env                 # Variables de entorno (crear basado en .env.example)
└── README.md            # Este archivo
```

## Instalación

### 1. Crear entorno virtual

```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar base de datos

Crear un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/support_tracker
```

**Nota**: Asegúrate de tener PostgreSQL instalado y crear la base de datos:

```sql
CREATE DATABASE support_tracker;
```

### 4. Ejecutar la aplicación

```bash
uvicorn main:app --reload
```

La API estará disponible en: `http://localhost:8000`

## Documentación

Una vez que la aplicación esté corriendo, puedes acceder a:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Modelo de Datos

La aplicación utiliza un modelo relacional con tres tablas principales:

### Team (Equipos)

Cada equipo representa un grupo de agentes de soporte:

- `id`: Identificador único (Primary Key)
- `name`: Nombre del equipo (único)
- `created_at`: Fecha de creación

### Agent (Agentes)

Cada agente pertenece a un equipo y tiene un alias único en Excel:

- `id`: Identificador único (Primary Key)
- `team_id`: ID del equipo al que pertenece (Foreign Key)
- `full_name`: Nombre completo del agente
- `excel_alias`: Alias usado en archivos Excel (ej: "M. ALVAREZ")
- `is_active`: Indica si el agente está activo

**Nota**: El `excel_alias` debe ser único dentro del mismo equipo y debe coincidir exactamente con el nombre usado en los archivos Excel.

### DailyPerformance (Rendimiento Diario)

Cada registro representa el rendimiento diario de un agente:

- `id`: Identificador único (Primary Key)
- `agent_id`: ID del agente (Foreign Key)
- `date`: Fecha del registro
- `tickets_actual`: Cantidad real de tickets procesados
- `tickets_goal`: Meta de tickets para ese día
- `points_actual`: Puntos Squadlinx reales registrados
- `points_goal`: Meta de puntos Squadlinx para ese día

**Nota importante**: Las metas varían día a día, por lo que se guardan en cada registro diario.

## Endpoints Principales

### Equipos (Teams)

- `POST /api/teams` - Crear un nuevo equipo
- `GET /api/teams` - Listar todos los equipos
- `GET /api/teams/{team_id}` - Obtener un equipo específico con sus agentes
- `PUT /api/teams/{team_id}` - Actualizar un equipo
- `DELETE /api/teams/{team_id}` - Eliminar un equipo (cascada: elimina agentes y métricas)

### Agentes (Agents)

- `POST /api/agents` - Crear un nuevo agente
- `GET /api/agents` - Listar agentes (con filtros opcionales: `team_id`, `is_active`)
- `GET /api/agents/{agent_id}` - Obtener un agente específico
- `PUT /api/agents/{agent_id}` - Actualizar un agente
- `DELETE /api/agents/{agent_id}` - Eliminar un agente (cascada: elimina métricas)

### Rendimiento (Performances)

- `POST /api/performances/bulk` - Crear/actualizar múltiples registros de rendimiento en bulk
- `POST /upload-raw-data` - Procesar datos crudos desde Excel

### Filtros disponibles

Para `GET /api/agents`:
- `team_id`: Filtrar por ID de equipo
- `is_active`: Filtrar por estado activo/inactivo
- `skip`: Paginación - registros a saltar
- `limit`: Paginación - máximo de registros a retornar

## Ejemplos de Uso

### Crear un equipo

```bash
curl -X POST "http://localhost:8000/api/teams" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Equipo de Soporte A"
  }'
```

### Crear un agente

```bash
curl -X POST "http://localhost:8000/api/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": 1,
    "full_name": "María Álvarez",
    "excel_alias": "M. ALVAREZ",
    "is_active": true
  }'
```

### Carga masiva de rendimiento

```bash
curl -X POST "http://localhost:8000/api/performances/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "performances": [
      {
        "agent_id": 1,
        "date": "2024-01-15",
        "tickets_actual": 25,
        "tickets_goal": 30,
        "points_actual": 8.5,
        "points_goal": 8.0
      },
      {
        "agent_id": 2,
        "date": "2024-01-15",
        "tickets_actual": 32,
        "tickets_goal": 30,
        "points_actual": 9.5,
        "points_goal": 9.0
      }
    ]
  }'
```

### Carga desde Excel

```bash
curl -X POST "http://localhost:8000/upload-raw-data" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_data": "WIEDER 1 ene.\nT. P M. A D.M\nM. ALVAREZ 25 30 1",
    "team_id": 1,
    "date": "2024-01-15",
    "tickets_goal": 30,
    "points_goal": 8.0
  }'
```

**Nota**: El endpoint `/upload-raw-data` requiere:
- `raw_data`: Texto crudo copiado desde Excel
- `team_id`: ID del equipo
- `date` (opcional): Fecha específica para el reporte (sobrescribe fechas del Excel)
- `tickets_goal` (opcional): Meta global de tickets
- `points_goal` (opcional): Meta global de puntos Squadlinx

El endpoint busca agentes por su `excel_alias` dentro del equipo especificado. Si algún agente no se encuentra, devuelve un error con la lista de aliases faltantes.

## Desarrollo

Para desarrollo, usa el modo reload:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Migración desde versión 1.0

Si estás migrando desde una versión anterior con el modelo `DailyMetric`, necesitarás:

1. Crear equipos y agentes primero
2. Importar datos históricos mapeando `agent_name` a `excel_alias` y creando los agentes correspondientes
3. Migrar los registros de `DailyMetric` a `DailyPerformance` con los nuevos `agent_id`

## Licencia

Este proyecto es de uso interno.
