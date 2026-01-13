# Instalación de Dependencias

Esta guía explica cómo instalar las dependencias del proyecto Support Tracker.

## Opción 1: Usando Entorno Virtual (Recomendado)

### 1. Crear un entorno virtual

```bash
# Desde la raíz del proyecto
python3 -m venv venv
```

### 2. Activar el entorno virtual

**En macOS/Linux:**
```bash
source venv/bin/activate
```

**En Windows:**
```bash
venv\Scripts\activate
```

### 3. Instalar las dependencias

```bash
pip install -r requirements.txt
```

### 4. Verificar la instalación

```bash
pip list
```

Deberías ver todas las dependencias instaladas, incluyendo:
- fastapi
- pytest
- sqlalchemy
- uvicorn
- etc.

### 5. Ejecutar los tests

```bash
pytest tests/ -v
```

## Opción 2: Instalación Global (No Recomendado)

Si no quieres usar un entorno virtual (no recomendado), puedes instalar directamente:

```bash
pip3 install -r requirements.txt
```

**Nota:** En algunos sistemas (especialmente macOS con Homebrew Python), puede que necesites usar:

```bash
pip3 install --user -r requirements.txt
```

## Dependencias Principales

Las dependencias incluyen:

### Runtime:
- `fastapi` - Framework web
- `uvicorn` - Servidor ASGI
- `sqlalchemy` - ORM
- `psycopg2-binary` - Driver PostgreSQL
- `pydantic` - Validación de datos
- `python-dotenv` - Variables de entorno

### Testing:
- `pytest` - Framework de testing
- `pytest-asyncio` - Soporte para async tests
- `httpx` - Cliente HTTP para tests

## Desactivar el Entorno Virtual

Cuando termines de trabajar, puedes desactivar el entorno virtual:

```bash
deactivate
```

## Actualizar Dependencias

Si se agregan nuevas dependencias al `requirements.txt`:

```bash
# Asegúrate de tener el entorno virtual activado
source venv/bin/activate

# Instala las nuevas dependencias
pip install -r requirements.txt
```

## Solución de Problemas

### Error: "No module named pytest"

Asegúrate de haber activado el entorno virtual y haber instalado las dependencias:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Error con pip en macOS

Si tienes problemas con pip en macOS (especialmente con Python de Homebrew), usa:

```bash
python3 -m pip install --user -r requirements.txt
```

### Error: "permission denied"

Si tienes problemas de permisos, usa el flag `--user`:

```bash
pip install --user -r requirements.txt
```

## Para Ejecutar los Tests

Una vez instaladas las dependencias:

```bash
# Activa el entorno virtual (si lo estás usando)
source venv/bin/activate

# Ejecuta todos los tests
pytest tests/ -v

# Ejecuta un archivo específico
pytest tests/test_teams.py -v

# Ejecuta un test específico
pytest tests/test_teams.py::test_create_team -v
```

