
import math
from datetime import date, timedelta
from functools import lru_cache
import time

import pandas as pd
import yfinance as yf

# Cache simple en memoria: evita volver a pedir el histórico completo de un
# ticker en cada request. Se invalida sola cada CACHE_TTL_SEGUNDOS.
_cache: dict[str, tuple[float, pd.DataFrame]] = {}
CACHE_TTL_SEGUNDOS = 60 * 30  # 30 minutos


def _descargar_historico(ticker: str, start: date, end: date) -> pd.DataFrame:
    """Descarga el histórico diario de un ticker entre start y end (inclusive),
    usando cache en memoria para no repetir llamadas innecesarias."""
    cache_key = f"{ticker}_{start}_{end}"
    ahora = time.time()

    if cache_key in _cache:
        ts, df = _cache[cache_key]
        if ahora - ts < CACHE_TTL_SEGUNDOS:
            return df

    df = yf.download(
        ticker,
        start=start.isoformat(),
        # yfinance excluye el 'end', así que sumamos un día para incluirlo
        end=(end + timedelta(days=1)).isoformat(),
        progress=False,
        auto_adjust=True,
    )

    if df.empty:
        raise ValueError(f"No se obtuvieron datos para el ticker '{ticker}'")

    # yfinance puede devolver columnas multi-índice si se piden varios tickers;
    # aquí siempre pedimos uno solo, pero normalizamos por seguridad.
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    _cache[cache_key] = (ahora, df)
    return df


def historico_semanal(ticker: str, fechas_objetivo: list[date]) -> dict[date, float]:
    """Para una lista de viernes, devuelve {fecha_objetivo: precio_cierre}.

    Descarga UNA sola vez el rango completo que cubre a todas las fechas (en
    vez de una descarga por cada viernes), y para cada viernes toma el último
    día hábil disponible en o antes de esa fecha (cubre festivos/feriados).
    Las fechas futuras (semanas que todavía no han pasado) se omiten.
    """
    if not fechas_objetivo:
        return {}

    hoy = date.today()
    fechas_pasadas = sorted(f for f in fechas_objetivo if f <= hoy)
    if not fechas_pasadas:
        return {}

    # Un solo rango que cubre todas las fechas pedidas, con 7 días de colchón
    # al inicio por si el primer viernes cae justo después de un festivo largo.
    rango_inicio = fechas_pasadas[0] - timedelta(days=7)
    rango_fin = fechas_pasadas[-1]

    try:
        df = _descargar_historico(ticker, rango_inicio, rango_fin)
    except ValueError:
        return {}

    resultado: dict[date, float] = {}
    for fecha in fechas_pasadas:
        # Filtrar hasta la fecha y eliminar explícitamente cualquier fila con NaN en Close
        df_hasta_fecha = df[(df.index.date <= fecha) & (df["Close"].notna())]
        if df_hasta_fecha.empty:
            continue

        ultimo_cierre = df_hasta_fecha.iloc[-1]["Close"]

        # Si yfinance devuelve una serie o escalar, asegurar conversión a float nativo
        if hasattr(ultimo_cierre, "item"):
            val = float(ultimo_cierre.item())
        else:
            val = float(ultimo_cierre)

        # Validar que no sea NaN ni Infinito antes de agregarlo al resultado
        if not math.isnan(val) and not math.isinf(val):
            resultado[fecha] = val

    return resultado
