"""
Datos base del portafolio de inversión simulada.

Fuente: información entregada por (inversion.xlsx), con precios de
cierre al viernes 31 de julio de 2026. El monto total ficticio asignado es de
$1,000,000 USD.

IMPORTANTE: 'cantidad' y 'precio_inicial' se guardan tal como fueron
entregados. El valor inicial en USD de cada posición (cantidad * precio)
debería aproximarse a 'inversion_inicial'; pequeñas diferencias se deben al
redondeo de la cantidad de acciones/unidades en el Excel original.
"""

from datetime import date

# Fecha de la foto inicial del portafolio (viernes de cierre, semana 0)
FECHA_INICIAL = date(2026, 7, 31)

# Último viernes del semestre (fin de octubre 2026) según el enunciado del curso
FECHA_FINAL = date(2026, 10, 30)

TOTAL_INVERTIDO = 1_000_000.0

PORTAFOLIO = [
    {
        "id": "gbpusd",
        "nombre": "GBP/USD (Libras)",
        "tipo": "divisa",
        "ticker_yfinance": "GBPUSD=X",
        "precio_inicial": 1.3482,
        "cantidad": 111259.46,
        "inversion_inicial": 150000.0,
        "unidad": "USD por GBP",
    },
    {
        "id": "oro",
        "nombre": "Oro",
        "tipo": "commodity",
        "ticker_yfinance": "GC=F",
        "precio_inicial": 4042.67,
        "cantidad": 49.47,
        "inversion_inicial": 200000.0,
        "unidad": "USD por onza troy",
    },
    {
        "id": "plata",
        "nombre": "Plata",
        "tipo": "commodity",
        "ticker_yfinance": "SI=F",
        "precio_inicial": 57.6569,
        "cantidad": 867.2,
        "inversion_inicial": 50000.0,
        "unidad": "USD por onza troy",
    },
    {
        "id": "adbe",
        "nombre": "Adobe",
        "tipo": "accion",
        "ticker_yfinance": "ADBE",
        "precio_inicial": 250.41,
        "cantidad": 599,
        "inversion_inicial": 150000.0,
        "unidad": "USD por acción",
    },
    {
        "id": "ko",
        "nombre": "Coca-Cola",
        "tipo": "accion",
        "ticker_yfinance": "KO",
        "precio_inicial": 87.59,
        "cantidad": 1712.52,
        "inversion_inicial": 150000.0,
        "unidad": "USD por acción",
    },
    {
        "id": "nvda",
        "nombre": "Nvidia",
        "tipo": "accion",
        "ticker_yfinance": "NVDA",
        "precio_inicial": 200.75,
        "cantidad": 747.2,
        "inversion_inicial": 150000.0,
        "unidad": "USD por acción",
    },
    {
        "id": "jnj",
        "nombre": "Johnson & Johnson",
        "tipo": "accion",
        "ticker_yfinance": "JNJ",
        "precio_inicial": 256.35,
        "cantidad": 585.14,
        "inversion_inicial": 150000.0,
        "unidad": "USD por acción",
    },
]


def fridays_del_semestre():
    """Devuelve la lista de fechas (viernes) entre FECHA_INICIAL y FECHA_FINAL."""
    from datetime import timedelta

    fechas = []
    d = FECHA_INICIAL
    while d <= FECHA_FINAL:
        if d.weekday() == 4:  # 4 = viernes
            fechas.append(d)
        d += timedelta(days=1)
    return fechas
