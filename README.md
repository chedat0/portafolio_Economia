# Backend – Portafolio de Inversión Simulada

Backend en FastAPI que calcula el valor semanal (cada viernes) de un portafolio
de $1,000,000 USD ficticios, usando precios reales de mercado obtenidos de
**Yahoo Finance** (vía la librería `yfinance`, gratuita y sin necesidad de API
key).

## Por qué no se usó investing.com

investing.com no tiene una API pública: la página de datos históricos se
genera dinámicamente y está protegida contra scraping automatizado. Por eso
se optó por Yahoo Finance, que ofrece los mismos tipos de activos (acciones,
divisas y commodities) con datos históricos confiables y gratuitos.

## 1. Instalación

```bash
cd backend
python -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Ejecutar el servidor

```bash
uvicorn main:app --reload
```

Se levanta en `http://127.0.0.1:8000`. La documentación interactiva
(Swagger) queda disponible en `http://127.0.0.1:8000/docs`.

> **Nota:** este backend necesita internet real hacia `finance.yahoo.com`
> para funcionar.

## 3. Endpoints

### `GET /api/portfolio`
Información base: los 7 activos, sus tickers, precio y cantidad inicial
(31/07/2026), y el total invertido ($1,000,000).

### `GET /api/history`
Serie histórica semanal. Devuelve una fila por cada viernes **que ya haya
pasado**, con el precio y valor de cada activo, el valor total del
portafolio, la ganancia/pérdida en USD, el rendimiento % y si esa semana
cerró en `"ganancia"` o `"perdida"`. Las semanas futuras simplemente no
aparecen todavía — a medida que pasen los viernes, este endpoint se va
completando solo, sin que tengas que tocar nada.

```json
{
  "total_invertido": 1000000.0,
  "semanas": [
    {
      "fecha": "2026-07-31",
      "activos": {
        "nvda": { "precio": 200.75, "valor": 150000.44 },
        "oro":  { "precio": 4042.67, "valor": 199970.95 }
        // ... resto de activos
      },
      "valor_total_portafolio": 1000123.45,
      "ganancia_perdida_usd": 123.45,
      "rendimiento_pct": 0.012,
      "estado": "ganancia"
    }
  ]
}
```

### `GET /api/summary`
El "resumen" más reciente: toma la última semana disponible en `/api/history`
y desglosa la ganancia/pérdida de cada activo individualmente además del
total del portafolio. 

## 4. Activos y tickets usados

| Activo | Tipo | Ticker (Yahoo Finance) |
|---|---|---|
| GBP/USD | Divisa | `GBPUSD=X` |
| Oro | Commodity | `GC=F` (futuro COMEX) |
| Plata | Commodity | `SI=F` (futuro COMEX) |
| Adobe | Acción | `ADBE` |
| Coca-Cola | Acción | `KO` |
| Nvidia | Acción | `NVDA` |
| Johnson & Johnson | Acción | `JNJ` |

**Supuesto documentado:** para oro y plata se usan los futuros COMEX
(`GC=F`, `SI=F`) en vez de un ticker "spot", porque son los que Yahoo Finance
mantiene con datos históricos completos y confiables. El precio puede diferir
en centavos del spot que muestra investing.com, pero la diferencia es
insignificante para efectos del ejercicio del curso.

## 5. Cómo se calcula todo

- Cada semana, el valor de un activo = `cantidad * precio_de_cierre_del_viernes`.
- Ganancia/pérdida de un activo = `valor_actual - inversion_inicial`.
- Rendimiento % de un activo = `ganancia_perdida / inversion_inicial * 100`.
- Lo mismo aplica al portafolio completo, sumando todos los activos.
- Si un viernes cae en día festivo bursátil, se usa el cierre del día hábil
  inmediatamente anterior (así nunca queda un hueco en la serie).

## 6. Conectar tu frontend

CORS ya está abierto (`allow_origins=["*"]`), así que se puede consumir la API
desde cualquier origen — un archivo HTML local, un servidor de desarrollo de
React/Vite, etc. — con `fetch('http://127.0.0.1:8000/api/summary')`.

