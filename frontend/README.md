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
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **Axios** - Cliente HTTP
- **Recharts** - Gráficas y visualizaciones
- **Lucide React** - Iconos
- **html2canvas** - Captura de pantalla a imagen

## 🎨 Características

- ✅ Interfaz moderna y profesional estilo SaaS
- ✅ Tema oscuro corporativo (azul oscuro/gris)
- ✅ Carga de datos desde Excel (texto crudo)
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
│   │   ├── Dashboard.jsx      # Componente principal
│   │   ├── DailyTable.jsx     # Tabla de métricas
│   │   └── SprintHeatmap.jsx  # Heatmap de sprint
│   ├── App.jsx                # Componente raíz
│   ├── main.jsx               # Punto de entrada
│   └── index.css              # Estilos globales
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🔌 Endpoints del Backend

El frontend se conecta a los siguientes endpoints:

- `POST /upload-raw-data` - Procesar datos crudos de Excel
- `GET /api/metrics` - Obtener métricas históricas (usado por Sprint Heatmap)

**Backend en producción:** `https://supporttracker-production.up.railway.app`

