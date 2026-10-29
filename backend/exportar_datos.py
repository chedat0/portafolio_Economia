"""
Congela las respuestas de la API en archivos .json para publicar el dashboard
en GitHub Pages (que no puede ejecutar Python).

Uso (desde la carpeta backend, con internet; no necesita el servidor encendido):
    python exportar_datos.py
    python exportar_datos.py ../frontend/data     # otra carpeta de salida

Genera: portfolio.json, history.json, summary.json
"""
import json
import sys
from pathlib import Path

from fastapi import HTTPException

import main
import portfolio_data


def guardar(carpeta: Path, nombre: str, datos: dict) -> None:
    ruta = carpeta / nombre
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  guardado: {ruta}")


def exportar(salida: Path) -> None:
    portfolio = main.obtener_portafolio()
    history = main.obtener_historico()
    try:
        summary = main.obtener_resumen()
    except HTTPException as e:
        raise SystemExit(f"ERROR: no hay datos para exportar. {e.detail}")

    # Seguridad: no congelar datos incompletos.
    semanas = history["semanas"]
    esperada = portfolio_data.FECHA_FINAL.isoformat()
    if history.get("errores_datos") or not semanas or semanas[-1]["fecha"] != esperada:
        ultima = semanas[-1]["fecha"] if semanas else "ninguna"
        raise SystemExit(
            f"ERROR: la última semana es {ultima} y se esperaba {esperada} "
            f"(errores: {history.get('errores_datos')}). No se guardó nada."
        )

    salida.mkdir(parents=True, exist_ok=True)
    print(f"Carpeta de salida: {salida.resolve()}")
    guardar(salida, "portfolio.json", portfolio)
    guardar(salida, "history.json", history)
    guardar(salida, "summary.json", summary)

    ultima = semanas[-1]
    print(f"\nListo. Corte {ultima['fecha']} | valor total ${ultima['valor_total_portafolio']:,.2f} "
          f"| rendimiento {ultima['rendimiento_pct']:+.3f}%")


if __name__ == "__main__":
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../frontend/data")
    exportar(destino)
