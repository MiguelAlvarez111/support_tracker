# Support Tracker API

API backend para seguimiento de tickets de soporte y métricas diarias de agentes, construida con FastAPI y SQLAlchemy.

## Características

- **FastAPI**: Framework moderno y rápido para construir APIs
- **SQLAlchemy**: ORM para manejo de base de datos
- **PostgreSQL**: Base de datos relacional
- **Pydantic**: Validación de datos y serialización
- **Carga masiva**: Soporte para cargar múltiples métricas diarias a la vez

## Estructura del Proyecto

```
support_tracker/
├── main.py              # Aplicación FastAPI principal
├── database.py          # Configuración de conexión a base de datos
├── models.py            # Modelos SQLAlchemy
├── schemas.py           # Schemas Pydantic para validación
├── requirements.txt     # Dependencias del proyecto
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

### DailyMetric

Cada registro representa las métricas diarias de un agente:

- `id`: Identificador único (Primary Key)
- `agent_name`: Nombre del agente (ej: "M. ALVAREZ")
- `date`: Fecha del registro
- `tickets_processed`: Cantidad de tickets procesados
- `ticket_goal`: Meta de tickets para ese día específico
- `squadlinx_points`: Puntos de Squadlinx registrados
- `squadlinx_goal`: Meta de puntos Squadlinx (usualmente 8.0 o 9.0)
- `is_burnout`: Campo calculado automáticamente cuando `squadlinx_points > squadlinx_goal + 0.5`

**Nota importante**: Las metas varían día a día, por lo que se guardan en cada registro diario. No hay tablas de "Metas Fijas".

## Endpoints Principales

### Métricas

- `POST /api/metrics` - Crear una nueva métrica
- `POST /api/metrics/bulk` - Crear múltiples métricas (carga masiva)
- `GET /api/metrics` - Listar métricas (con filtros opcionales)
- `GET /api/metrics/{metric_id}` - Obtener una métrica específica
- `PUT /api/metrics/{metric_id}` - Actualizar una métrica
- `DELETE /api/metrics/{metric_id}` - Eliminar una métrica

### Filtros disponibles en GET /api/metrics

- `agent_name`: Filtrar por nombre de agente
- `start_date`: Filtrar desde esta fecha
- `end_date`: Filtrar hasta esta fecha
- `is_burnout`: Filtrar por estado de burnout
- `skip`: Paginación - registros a saltar
- `limit`: Paginación - máximo de registros a retornar

## Ejemplo de Uso

### Crear una métrica

```bash
curl -X POST "http://localhost:8000/api/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "M. ALVAREZ",
    "date": "2024-01-15",
    "tickets_processed": 25,
    "ticket_goal": 30,
    "squadlinx_points": 8.5,
    "squadlinx_goal": 8.0
  }'
```

### Carga masiva

```bash
curl -X POST "http://localhost:8000/api/metrics/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [
      {
        "agent_name": "M. ALVAREZ",
        "date": "2024-01-15",
        "tickets_processed": 25,
        "ticket_goal": 30,
        "squadlinx_points": 8.5,
        "squadlinx_goal": 8.0
      },
      {
        "agent_name": "J. SMITH",
        "date": "2024-01-15",
        "tickets_processed": 32,
        "ticket_goal": 30,
        "squadlinx_points": 9.5,
        "squadlinx_goal": 9.0
      }
    ]
  }'
```

### Obtener métricas con filtros

```bash
curl "http://localhost:8000/api/metrics?agent_name=M. ALVAREZ&start_date=2024-01-01&is_burnout=false"
```

## Desarrollo

Para desarrollo, usa el modo reload:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Licencia

Este proyecto es de uso interno.

