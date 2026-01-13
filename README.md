# Support Tracker: Deje de Adivinar, Empiece a Gestionar

Mire, la gestión de equipos de soporte suele ser un desastre. Tiene métricas por un lado, agentes por otro, hojas de cálculo que nadie entiende y un dolor de cabeza garantizado al final del mes.

**Support Tracker** no es magia. Es simplemente una herramienta que toma ese caos y lo pone en orden. Si sus métricas son malas, seguirán siendo malas, pero al menos sabrá exactamente *por qué* y *quién* es el responsable.

Aquí no hay excusas. Solo datos.

---

## El Arsenal (Tecnología)

Usamos herramientas sólidas porque no tenemos tiempo para jugar con cosas que se rompen.

*   **FastAPI**: Porque esperar a que cargue una API es perder vida.
*   **SQLAlchemy**: Porque necesitamos estructura, no anarquía.
*   **PostgreSQL**: Porque sus datos valen más que una hoja de Excel corrupta.
*   **React + Tailwind**: Porque si se ve feo, nadie lo usará.

## Póngalo a Funcionar (Sin Llorar)

Siga estos pasos. No sea creativo.

### 1. El Entorno (Backend)

```bash
# Cree su espacio seguro
python -m venv venv
source venv/bin/activate  # O venv\Scripts\activate si usa Windows (nadie es perfecto)

# Instale lo necesario
pip install -r requirements.txt
```

### 2. La Base de Datos

Necesita PostgreSQL. No intente hacerlo con SQLite "para probar". Hágalo bien de una vez.

Cree un archivo `.env` y ponga esto (con SUS datos, obviamente):

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/support_tracker
```

### 3. Arranque los Motores

```bash
# Backend
uvicorn main:app --reload

# Frontend (en otra terminal, carpeta frontend/)
npm install
npm run dev
```

Si ve cosas verdes en la terminal, felicidades. Si ve rojo, lea el error antes de entrar en pánico.

---

## Cómo Usar Esta Cosa

El flujo es simple. No lo complique.

1.  **Cree un Equipo**: No puede gestionar personas si no sabe a quién pertenecen. Vaya a `Configuración`, cree un equipo.
2.  **Agregue Agentes**: Nombres reales. Roles reales. "Líderes" no cuentan para tickets (porque se supone que lideran, no que procesan).
3.  **Cargue Datos**:
    *   Manual: Si le gusta sufrir escribiendo uno por uno.
    *   **Scripts (Recomendado)**: Use `ingest_performance.py` para cargar sus CSV. Es rápido, es indoloro.
4.  **Mire el Dashboard**: Ahí está la verdad.
    *   **Heatmaps**: Vea quién trabaja y quién finge.
    *   **Historial**: Filtre por fecha. Vea el pasado. Aprenda de él.

## La Verdad sobre los Datos (Modelos)

*   **Teams**: Grupos de gente.
*   **Agents**: La gente. Tienen un `role`. Si es 'Leader', no le exigimos tickets. Si es 'Agent', más les vale cumplir la meta.
*   **Performance**: Lo que hicieron ese día. Tickets reales vs Meta. Puntos Squadlinx vs Meta. Si no llegan, aparece en rojo. El rojo es malo.

## Endpoints (Para los Nerds)

Si quiere hablar directamente con la API, aquí está el menú:

*   `GET /docs`: La documentación automática. Es fea pero útil.
*   `POST /api/performances/bulk`: Donde ocurre la magia de la carga masiva.
*   `GET /api/metrics`: De donde saca los datos el dashboard. Soporta filtros de fecha (`start_date`, `end_date`), porque ver todo el historial de golpe es de psicópatas.

---

**Licencia**: Úselo. Mejórelo. No rompa producción un viernes.
