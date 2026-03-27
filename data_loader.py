"""
=====================================================================
 MÓDULO 1 - INGESTA Y LIMPIEZA DE DATOS
 Hackathon Talentotech - Análisis de comportamiento web
 Datos fuente: Microsoft Clarity (cloudlabslearning.com)
=====================================================================
Archivos esperados en la misma carpeta:
  - 1_Data_Recordings.csv   (sesiones granulares por usuario)
  - 2_Data_Metrics.csv      (métricas agregadas por URL/dispositivo/OS)
"""

import pandas as pd
import numpy as np
import re
import os
from urllib.parse import urlparse

# ─────────────────────────────────────────────
#  CONFIGURACIÓN DE RUTAS
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RUTA_RECORDINGS = os.path.join(BASE_DIR, "1_Data_Recordings.csv")
RUTA_METRICS    = os.path.join(BASE_DIR, "2_Data_Metrics.csv")


# ═════════════════════════════════════════════════════════════════════
#  FUNCIONES DE LIMPIEZA DE URLs
# ═════════════════════════════════════════════════════════════════════

def limpiar_url(url: str) -> str:
    """
    Normaliza una URL eliminando parámetros de sesión, tokens OAuth,
    parámetros UTM y fragmentos de error.
    """
    if pd.isna(url) or url == "":
        return "desconocida"

    url = str(url).strip()

    # Eliminar fragmentos (#...) que contengan error, state, session_state, code
    url = re.sub(r"#(error|state|session_state|code)=[^&\s]*(&[^\s]*)?", "", url)

    # Eliminar parámetros de query de OAuth / errores
    url = re.sub(r"\?(err|error|state|session_state|code)=[^&\s]*(&[^\s]*)?", "?", url)

    # Eliminar parámetros UTM y publicitarios completos
    patrones_publicitarios = [
        "utm_term", "utm_campaign", "utm_source", "utm_medium",
        "hsa_acc", "hsa_cam", "hsa_grp", "hsa_ad", "hsa_src",
        "hsa_tgt", "hsa_kw", "hsa_mt", "hsa_net", "hsa_ver",
        "gad_source", "gad_campaignid", "gbraid", "gclid",
        "fbclid", "msclkid"
    ]
    for param in patrones_publicitarios:
        url = re.sub(rf"[?&]{param}=[^&\s]*", "", url)

    # Limpiar signos de interrogación o & sobrantes al final
    url = re.sub(r"[?&]+$", "", url)
    url = re.sub(r"\?&", "?", url)

    # Quitar barras o fragmentos vacíos al final
    url = url.rstrip("#").rstrip("?")

    return url


def extraer_ruta(url: str) -> str:
    try:
        parsed = urlparse(str(url))
        ruta = parsed.path.rstrip("/") or "/"
        return ruta if ruta else "/"
    except Exception:
        return "/"


def detectar_tipo_pagina(url: str) -> str:
    url_lower = str(url).lower()

    if re.search(r"#error=login_required|err=subscription_not_found", url_lower):
        return "error_autenticacion"
    if "/request-demo" in url_lower:
        return "solicitud_demo"
    if "/elementary-school" in url_lower:
        return "landing_primaria"
    if "/blogs-and-news" in url_lower or "/blog" in url_lower:
        return "blog"
    if "/downloads" in url_lower:
        return "descargas"
    if "/page-not-found" in url_lower or "404" in url_lower:
        return "pagina_error_404"
    if "/uniminuto" in url_lower:
        return "landing_uniminuto"
    if url_lower.endswith("cloudlabslearning.com/") or url_lower.endswith("cloudlabslearning.com"):
        return "home"
    if "utm_source" in url_lower or "gclid" in url_lower:
        return "landing_publicitaria"
    return "otra_pagina"


# ═════════════════════════════════════════════════════════════════════
#  CARGA Y LIMPIEZA
# ═════════════════════════════════════════════════════════════════════

def cargar_recordings(ruta: str = RUTA_RECORDINGS) -> pd.DataFrame:
    print(f"📂 Cargando {os.path.basename(ruta)}...")
    if not os.path.exists(ruta):
        print(f"   ❌ ERROR: El archivo {ruta} no existe.")
        return pd.DataFrame()
        
    df = pd.read_csv(ruta, low_memory=False)
    print(f"   ✅ {len(df):,} filas cargadas | {df.shape[1]} columnas")

    # Fechas
    if "fecha" in df.columns:
        df["fecha"] = pd.to_datetime(df["fecha"], format="%m/%d/%Y", errors="coerce")
        df["dia_semana"] = df["fecha"].dt.day_name()
        df["mes"] = df["fecha"].dt.month
        df["semana"] = df["fecha"].dt.isocalendar().week.astype("Int64") # Int64 maneja NaN mejor que int

    # Duración
    if "duracion_sesion_segundos" in df.columns:
        df["duracion_sesion_segundos"] = pd.to_numeric(
            df["duracion_sesion_segundos"], errors="coerce"
        ).fillna(0)

        bins    = [-1, 10, 60, 300, 600, float("inf")]
        labels  = ["<10s (rebote)", "10-60s", "1-5min", "5-10min", ">10min"]
        df["rango_duracion"] = pd.cut(
            df["duracion_sesion_segundos"], bins=bins, labels=labels
        )

    # URLs
    for col in ["direccion_url_entrada", "direccion_url_salida"]:
        if col in df.columns:
            df[col] = df[col].fillna("desconocida")
            df[f"{col}_limpia"]    = df[col].apply(limpiar_url)
            df[f"{col}_ruta"]      = df[f"{col}_limpia"].apply(extraer_ruta)
            df[f"{col}_tipo"]      = df[f"{col}_limpia"].apply(detectar_tipo_pagina)

    # Nulos numéricos
    cols_numericas = [
        "recuento_paginas", "clics_sesion", "clicks_por_pagina",
        "tiempo_por_pagina", "interaccion_total", "standarized_engagement_score"
    ]
    for col in cols_numericas:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Indicadores binarios
    for col in ["abandono_rapido", "posible_frustracion", "entrada_es_home", "trafico_externo"]:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)

    # Columnas derivadas
    if "trafico_externo" in df.columns and "referente" in df.columns:
        df["origen_trafico"] = np.where(
            df["trafico_externo"] == 1,
            np.where(df["referente"].fillna("").str.contains("google", case=False), "Google Orgánico", "Otro Externo"),
            "Directo / Interno"
        )
    else:
        df["origen_trafico"] = "Desconocido"

    if "standarized_engagement_score" in df.columns:
        df["nivel_engagement"] = pd.cut(
            df["standarized_engagement_score"],
            bins=[-float("inf"), -0.3, 0.0, 0.5, float("inf")],
            labels=["Muy Bajo", "Bajo", "Medio", "Alto"]
        )

    # Sesión problemática
    # Verificamos que las columnas existan primero
    if "posible_frustracion" in df.columns and "abandono_rapido" in df.columns and "clics_sesion" in df.columns:
        df["sesion_problematica"] = (
            (df["posible_frustracion"] == 1) |
            ((df["abandono_rapido"] == 1) & (df["clics_sesion"] == 0))
        ).astype(int)
    else:
        df["sesion_problematica"] = 0

    print(f"   ✅ Limpieza completada. Columnas resultantes: {df.shape[1]}")
    return df


def cargar_metrics(ruta: str = RUTA_METRICS) -> pd.DataFrame:
    print(f"📂 Cargando {os.path.basename(ruta)}...")
    if not os.path.exists(ruta):
        print(f"   ❌ ERROR: El archivo {ruta} no existe.")
        return pd.DataFrame()
        
    df = pd.read_csv(ruta, low_memory=False)
    print(f"   ✅ {len(df):,} filas cargadas | {df.shape[1]} columnas")

    if "Url" in df.columns:
        df["Url"] = df["Url"].fillna("desconocida")
        df["Url_limpia"]   = df["Url"].apply(limpiar_url)
        df["Url_ruta"]     = df["Url_limpia"].apply(extraer_ruta)
        df["Url_tipo"]     = df["Url_limpia"].apply(detectar_tipo_pagina)

    if "Device" in df.columns:
        df["Device"] = df["Device"].str.strip().str.title().fillna("Desconocido")
    if "OS" in df.columns:
        df["OS"]     = df["OS"].str.strip().fillna("Desconocido")
        df["OS"] = df["OS"].replace({"IOS": "iOS", "Ios": "iOS"})

    cols_num = [
        "sessionsCount", "sessionsWithMetricPercentage",
        "sessionsWithoutMetricPercentage", "pagesViews",
        "subTotal", "averageScrollDepth", "totalSessionCount",
        "totalBotSessionCount", "distinctUserCount",
        "pagesPerSessionPercentage", "totalTime", "activeTime"
    ]
    for col in cols_num:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    mapa_metricas = {
        "DeadClickCount"  : "Clics_Muertos",
        "RageClickCount"  : "Clics_Rabia",
        "ExcessiveScrollCount": "Scroll_Excesivo",
        "ErrorClickCount" : "Clics_Error",
        "ScrollDepth"     : "Profundidad_Scroll",
        "JavascriptErrorCount": "Error_JS",
    }
    if "metricName" in df.columns:
        df["categoria_metrica"] = df["metricName"].map(mapa_metricas).fillna("Otra_Metrica")

        metricas_problema = ["DeadClickCount", "RageClickCount", "ErrorClickCount", "JavascriptErrorCount"]
        df["es_metrica_problema"] = df["metricName"].isin(metricas_problema).astype(int)

    print(f"   ✅ Limpieza completada. Columnas resultantes: {df.shape[1]}")
    return df


def reporte_calidad(df: pd.DataFrame, nombre: str) -> dict:
    if df.empty:
        return {"archivo": nombre, "estado": "Vacio"}

    total = len(df)
    nulos = df.isnull().sum()
    nulos_pct = (nulos / total * 100).round(2)

    reporte = {
        "archivo"          : nombre,
        "total_filas"      : total,
        "total_columnas"   : df.shape[1],
        "filas_duplicadas" : int(df.duplicated().sum()),
        "columnas_con_nulos": int((nulos > 0).sum()),
        "nulos_por_columna": nulos_pct[nulos_pct > 0].to_dict(),
        "rango_fechas"     : None,
    }

    if "fecha" in df.columns and pd.api.types.is_datetime64_any_dtype(df["fecha"]):
        reporte["rango_fechas"] = {
            "inicio" : str(df["fecha"].min().date()),
            "fin"    : str(df["fecha"].max().date()),
            "dias"   : (df["fecha"].max() - df["fecha"].min()).days
        }

    print(f"\n📊 REPORTE DE CALIDAD — {nombre}")
    print(f"   Filas          : {total:,}")
    print(f"   Columnas       : {df.shape[1]}")
    print(f"   Duplicados     : {reporte['filas_duplicadas']:,}")
    print(f"   Cols con nulos : {reporte['columnas_con_nulos']}")
    if reporte["rango_fechas"]:
        r = reporte["rango_fechas"]
        print(f"   Rango fechas   : {r['inicio']} → {r['fin']} ({r['dias']} días)")

    return reporte


def cargar_todo() -> dict:
    print("=" * 60)
    print("  HACKATHON - INGESTA Y LIMPIEZA DE DATOS")
    print("=" * 60)

    df_rec = cargar_recordings()
    df_met = cargar_metrics()

    cal_rec = reporte_calidad(df_rec, "1_Data_Recordings")
    cal_met = reporte_calidad(df_met, "2_Data_Metrics")

    print("\n✅ Ambos archivos listos para análisis.\n")

    return {
        "recordings"          : df_rec,
        "metrics"             : df_met,
        "calidad_recordings"  : cal_rec,
        "calidad_metrics"     : cal_met,
    }

if __name__ == "__main__":
    datos = cargar_todo()
    df_rec = datos["recordings"]
    df_met = datos["metrics"]
    
    if not df_rec.empty:
        print("\n── MUESTRA recordings ──")
        cols_rec = [c for c in ["fecha", "direccion_url_entrada_limpia", "direccion_url_entrada_tipo",
                      "duracion_sesion_segundos", "abandono_rapido", "nivel_engagement", "sesion_problematica"] if c in df_rec.columns]
        if cols_rec:
            print(df_rec[cols_rec].head(5).to_string())

    if not df_met.empty:
        print("\n── MUESTRA metrics ──")
        cols_met = [c for c in ["Url_limpia", "Url_tipo", "Device", "OS", "metricName", "categoria_metrica",
                      "sessionsCount", "sessionsWithMetricPercentage", "subTotal"] if c in df_met.columns]
        if cols_met:
            print(df_met[cols_met].head(5).to_string())
