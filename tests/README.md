# Tests Unitarios - Support Tracker

Este directorio contiene los tests unitarios para la API de Support Tracker.

## Estructura

```
tests/
├── __init__.py
├── conftest.py           # Configuración y fixtures compartidos
├── test_parser.py        # Tests para el servicio parser
├── test_teams.py         # Tests para el router de teams
├── test_agents.py        # Tests para el router de agents
├── test_performances.py  # Tests para el router de performances
└── test_metrics.py       # Tests para el router de metrics
```

## Instalación

Las dependencias de testing están incluidas en `requirements.txt`. Instálalas con:

```bash
pip install -r requirements.txt
```

O instala solo las dependencias de testing:

```bash
pip install pytest pytest-asyncio httpx
```

## Ejecutar Tests

### Ejecutar todos los tests

```bash
pytest
```

### Ejecutar tests con output detallado

```bash
pytest -v
```

### Ejecutar un archivo de tests específico

```bash
pytest tests/test_teams.py -v
```

### Ejecutar un test específico

```bash
pytest tests/test_teams.py::test_create_team -v
```

### Ejecutar tests con coverage

```bash
pip install pytest-cov
pytest --cov=. --cov-report=html
```

## Fixtures Disponibles

- `db_session`: Sesión de base de datos para cada test (SQLite en memoria)
- `client`: Cliente de test de FastAPI con base de datos override
- `sample_team_data`: Datos de ejemplo para crear un equipo
- `sample_agent_data`: Datos de ejemplo para crear un agente
- `sample_performance_data`: Datos de ejemplo para crear un performance

## Tests Incluidos

### test_parser.py
- ✅ Test de parsing básico
- ✅ Test de parsing con múltiples días
- ✅ Test de formato inválido
- ✅ Test de líneas vacías
- ✅ Test de año por defecto
- ✅ Test de skipping headers

### test_teams.py
- ✅ Crear equipo
- ✅ Crear equipo con nombre duplicado
- ✅ Obtener equipos (vacío)
- ✅ Obtener equipos
- ✅ Obtener equipo por ID
- ✅ Obtener equipo inexistente
- ✅ Actualizar equipo
- ✅ Eliminar equipo

### test_agents.py
- ✅ Crear agente
- ✅ Crear agente con equipo inexistente
- ✅ Crear agente con alias duplicado
- ✅ Obtener agentes
- ✅ Obtener agentes por equipo
- ✅ Obtener agente por ID
- ✅ Actualizar agente
- ✅ Eliminar agente

### test_performances.py
- ✅ Crear performances en bulk
- ✅ Crear performances con agente inexistente
- ✅ Actualizar performance existente

### test_metrics.py
- ✅ Obtener métricas (vacío)
- ✅ Obtener métricas
- ✅ Obtener métricas con límite
- ✅ Verificar flag de burnout

## Notas

- Los tests usan SQLite en memoria para velocidad y aislamiento
- Cada test tiene su propia base de datos limpia
- Los tests son independientes y pueden ejecutarse en cualquier orden
- El cliente de test override la dependencia `get_db` para usar la base de datos de test

