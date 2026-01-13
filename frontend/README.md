# Support Tracker - Frontend

Interfaz web moderna para el Support Tracker, construida con React, Vite, Tailwind CSS y Recharts.

## 🚀 Inicio Rápido

### Instalación

```bash
cd frontend
npm install
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Build para Producción

```bash
npm run build
```

### Preview del Build

```bash
npm run preview
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto frontend:

**Para desarrollo local:**
```env
VITE_API_URL=http://localhost:8000
```

**Para producción (Railway):**
```env
VITE_API_URL=https://supporttracker-production.up.railway.app
```

**Nota:** 
- Si no defines `VITE_API_URL`, el frontend usará `http://localhost:8000` por defecto.
- El archivo `.env` debe estar en la raíz del directorio `frontend/`.
- Después de cambiar `.env`, reinicia el servidor de desarrollo (`npm run dev`).

## 📦 Dependencias Principales

- **React 18** - Biblioteca UI
- **React Router DOM** - Navegación entre páginas
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **Axios** - Cliente HTTP
- **Recharts** - Gráficas y visualizaciones
- **Lucide React** - Iconos
- **html2canvas** - Captura de pantalla a imagen

## 🎨 Características

- ✅ Interfaz moderna y profesional estilo SaaS
- ✅ Tema oscuro corporativo (azul oscuro/gris)
- ✅ Navegación con rutas (Dashboard y Configuración de Equipo)
- ✅ Gestión de equipos y agentes
- ✅ Carga de datos en dos modos:
  - **Manual**: Entrada directa por agente con tabla editable
  - **Excel**: Pegar datos crudos desde Excel
- ✅ Configuración del día: fecha y metas globales
- ✅ Tabla de métricas con lógica de colores
- ✅ Sprint Heatmap con visualización de productividad y carga
- ✅ Indicadores visuales de burnout
- ✅ Copiar/descargar tabla como imagen
- ✅ Diseño responsive

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx         # Componente principal con carga de datos
│   │   ├── TeamSettings.jsx      # Configuración de equipos y agentes
│   │   ├── DailyTable.jsx        # Tabla de métricas
│   │   └── SprintHeatmap.jsx     # Heatmap de sprint
│   ├── App.jsx                   # Componente raíz con routing
│   ├── main.jsx                  # Punto de entrada
│   └── index.css                 # Estilos globales
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🗺️ Rutas

La aplicación utiliza React Router para la navegación:

- `/` - Dashboard principal (carga de datos y visualizaciones)
- `/team-settings` - Configuración de equipos y agentes

La navegación entre rutas se realiza mediante una barra de navegación con tabs en la parte superior.

## 📊 Dashboard

El Dashboard está dividido en dos secciones principales:

### 1. Configuración del Día

- **Fecha del Reporte**: Selector de fecha para el reporte diario
- **Meta de Tickets Global**: Meta global aplicada a todos los agentes
- **Meta Squadlinx Global**: Meta global de puntos aplicada a todos los agentes
- **Selector de Equipo**: Selección del equipo para el cual se ingresan los datos

### 2. Datos de los Agentes

Con dos tabs para diferentes métodos de entrada:

#### Tab "Carga Manual"

- Tabla con todos los agentes activos del equipo seleccionado
- Inputs editables para "Tickets Real" y "Puntos Real" por agente
- Botón "Guardar Todo" que envía todos los datos estructurados al backend
- Las metas globales se aplican automáticamente

#### Tab "Pegar desde Excel"

- Textarea para pegar datos crudos copiados desde Excel
- Al procesar, usa la fecha y metas definidas en la Configuración del Día
- Mantiene compatibilidad con el formato Excel original
- Busca agentes por su `excel_alias` en el equipo seleccionado

## ⚙️ Configuración de Equipo

La página de configuración (`/team-settings`) permite:

- **Ver equipos disponibles**: Lista de todos los equipos
- **Seleccionar equipo**: Cambiar entre equipos para gestionar sus agentes
- **Ver agentes**: Tabla con todos los agentes del equipo seleccionado
- **Agregar agente**: Modal para crear nuevos agentes con:
  - Nombre completo
  - Alias en Excel (debe coincidir exactamente con el usado en Excel)
  - Estado activo/inactivo
- **Editar agente**: Modal para modificar información del agente
- **Activar/Desactivar agente**: Toggle rápido del estado del agente
- **Eliminar agente**: Eliminación con confirmación

## 🔌 Endpoints del Backend

El frontend se conecta a los siguientes endpoints:

### Equipos
- `GET /api/teams` - Obtener lista de equipos
- `POST /api/teams` - Crear nuevo equipo
- `GET /api/teams/{id}` - Obtener equipo específico
- `PUT /api/teams/{id}` - Actualizar equipo
- `DELETE /api/teams/{id}` - Eliminar equipo

### Agentes
- `GET /api/agents` - Obtener lista de agentes (con filtros: `team_id`, `is_active`)
- `POST /api/agents` - Crear nuevo agente
- `GET /api/agents/{id}` - Obtener agente específico
- `PUT /api/agents/{id}` - Actualizar agente
- `DELETE /api/agents/{id}` - Eliminar agente

### Métricas de Rendimiento
- `POST /api/performances/bulk` - Crear/actualizar múltiples registros de rendimiento
- `POST /upload-raw-data` - Procesar datos crudos desde Excel
- `GET /api/metrics` - Obtener métricas históricas (usado por Sprint Heatmap)

**Backend en producción:** `https://supporttracker-production.up.railway.app`

## 🎨 Estilos y Temas

La aplicación utiliza Tailwind CSS con un tema oscuro personalizado:

- **Colores primarios**: Azul (#0284c7 - primary-600)
- **Colores oscuros**: Escala de grises oscuros (dark-800, dark-900, dark-950)
- **Componentes reutilizables**: Clases personalizadas en `index.css`:
  - `.card` - Tarjetas con borde y sombra
  - `.input-field` - Campos de entrada estilizados
  - `.btn-primary` - Botón principal
  - `.btn-secondary` - Botón secundario

## 🔄 Flujo de Trabajo

1. **Configurar Equipo** (si es necesario):
   - Ir a "Configuración de Equipo"
   - Crear equipo si no existe
   - Agregar agentes con sus nombres y aliases de Excel

2. **Cargar Datos del Día**:
   - Ir al Dashboard
   - Configurar fecha y metas globales
   - Seleccionar equipo
   - Elegir método de carga (Manual o Excel)
   - Guardar datos

3. **Visualizar Métricas**:
   - El Sprint Heatmap muestra las métricas históricas
   - La tabla de resultados muestra los datos procesados

## 📝 Notas Importantes

- Los aliases de Excel deben coincidir **exactamente** con los usados en los archivos Excel
- Los agentes deben existir antes de poder cargar datos para ellos
- La carga manual solo guarda agentes con datos ingresados
- La carga desde Excel busca agentes por alias y devuelve error si no los encuentra

## Licencia

Este proyecto es de uso interno.
