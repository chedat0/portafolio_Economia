"""
Backend del portafolio de inversión simulada (curso de economía).

Ejecutar con:
    uvicorn main:app --reload

Documentación interactiva automática en:
    http://127.0.0.1:8000/docs
"""

from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import market_data
import portfolio_data as pd_data

app = FastAPI(
    title="Portafolio de Inversión Simulada",
    description="API para el dashboard de portafolio del curso de economía",
    version="1.0.0",
)

# CORS abierto: el frontend puede vivir en otro puerto/origen (ej. Live Server,
# React dev server, o un simple archivo HTML abierto en el navegador).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def raiz():
    return {"status": "ok", "mensaje": "API del portafolio de inversión. Ver /docs"}


@app.get("/api/portfolio")
def obtener_portafolio():
    """Información base del portafolio: activos, tickers, precios y cantidades
    con las que se armó la inversión inicial (31/07/2026)."""
    return {
        "fecha_inicial": pd_data.FECHA_INICIAL.isoformat(),
        "fecha_final_semestre": pd_data.FECHA_FINAL.isoformat(),
        "total_invertido": pd_data.TOTAL_INVERTIDO,
        "activos": pd_data.PORTAFOLIO,
    }


@app.get("/api/history")
def obtener_historico():
    """Serie histórica semanal (cada viernes) de valor por activo y total del
    portafolio, desde el 31/07/2026 hasta el último viernes disponible
    (o el fin del semestre, lo que ocurra primero)."""
    fridays = pd_data.fridays_del_semestre()

    # 1. Obtener precios históricos de cada activo para todos los viernes
    precios_por_activo: dict[str, dict[date, float]] = {}
    errores: dict[str, str] = {}
    for activo in pd_data.PORTAFOLIO:
        try:
            precios_por_activo[activo["id"]] = market_data.historico_semanal(
                activo["ticker_yfinance"], fridays
            )
        except Exception as e:  # noqa: BLE001 - queremos capturar cualquier fallo de red/ticker
            errores[activo["id"]] = str(e)
            precios_por_activo[activo["id"]] = {}

    # 2. Armar filas por semana (solo semanas donde YA tenemos precio de todos los activos)
    filas = []
    for fecha in fridays:
        valores_activos = {}
        valor_total_semana = 0.0
        semana_completa = True

        for activo in pd_data.PORTAFOLIO:
            precio = precios_por_activo[activo["id"]].get(fecha)
            if precio is None:
                semana_completa = False
                continue
            valor = activo["cantidad"] * precio
            valores_activos[activo["id"]] = {
                "precio": round(precio, 4),
                "valor": round(valor, 2),
            }
            valor_total_semana += valor

        if not semana_completa:
            continue  # aún no ha pasado esa semana / falta algún dato

        ganancia_perdida = valor_total_semana - pd_data.TOTAL_INVERTIDO
        rendimiento_pct = (ganancia_perdida / pd_data.TOTAL_INVERTIDO) * 100

        filas.append(
            {
                "fecha": fecha.isoformat(),
                "activos": valores_activos,
                "valor_total_portafolio": round(valor_total_semana, 2),
                "ganancia_perdida_usd": round(ganancia_perdida, 2),
                "rendimiento_pct": round(rendimiento_pct, 3),
                "estado": "ganancia" if ganancia_perdida >= 0 else "perdida",
            }
        )

    return {
        "total_invertido": pd_data.TOTAL_INVERTIDO,
        "semanas": filas,
        "errores_datos": errores or None,
    }


@app.get("/api/summary")
def obtener_resumen():
    """Snapshot más reciente: valor actual de cada activo, ganancia/pérdida en
    USD y en %, y el total del portafolio."""
    historico = obtener_historico()
    semanas = historico["semanas"]

    if not semanas:
        raise HTTPException(
            status_code=503,
            detail=(
                "Todavía no hay datos históricos disponibles. Esto es normal si "
                "corres esto antes del primer viernes, o si el backend no tiene "
                "acceso a internet para consultar Yahoo Finance."
            ),
        )

    ultima_semana = semanas[-1]

    detalle_activos = []
    for activo in pd_data.PORTAFOLIO:
        info_semana = ultima_semana["activos"].get(activo["id"])
        if info_semana is None:
            continue
        ganancia = info_semana["valor"] - activo["inversion_inicial"]
        rendimiento_pct = (ganancia / activo["inversion_inicial"]) * 100
        detalle_activos.append(
            {
                "id": activo["id"],
                "nombre": activo["nombre"],
                "tipo": activo["tipo"],
                "precio_inicial": activo["precio_inicial"],
                "precio_actual": info_semana["precio"],
                "cantidad": activo["cantidad"],
                "inversion_inicial": activo["inversion_inicial"],
                "valor_actual": info_semana["valor"],
                "ganancia_perdida_usd": round(ganancia, 2),
                "rendimiento_pct": round(rendimiento_pct, 3),
                "estado": "ganancia" if ganancia >= 0 else "perdida",
            }
        )

    return {
        "fecha_corte": ultima_semana["fecha"],
        "total_invertido": pd_data.TOTAL_INVERTIDO,
        "valor_total_actual": ultima_semana["valor_total_portafolio"],
        "ganancia_perdida_total_usd": ultima_semana["ganancia_perdida_usd"],
        "rendimiento_total_pct": ultima_semana["rendimiento_pct"],
        "estado_general": ultima_semana["estado"],
        "activos": detalle_activos,
    }
