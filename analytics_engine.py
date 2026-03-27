"""
=====================================================================
 MÓDULO 2 - MOTOR ANALÍTICO
 Hackathon Talentotech - Análisis de comportamiento web
=====================================================================
Este módulo recibe los DataFrames ya limpios (de data_loader.py)
y genera todas las métricas e insights necesarios.
"""

import pandas as pd
import numpy as np

# ═════════════════════════════════════════════════════════════════════
#  ① PÁGINAS MÁS VISITADAS
# ═════════════════════════════════════════════════════════════════════
def paginas_mas_visitadas(df_rec: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    if df_rec.empty or "direccion_url_entrada_limpia" not in df_rec.columns:
        return pd.DataFrame()

    agrupado = (
        df_rec
        .groupby(["direccion_url_entrada_limpia", "direccion_url_entrada_tipo"], observed=True)
        .agg(
            total_visitas          = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
            duracion_promedio_seg  = ("duracion_sesion_segundos", "mean") if "duracion_sesion_segundos" in df_rec.columns else ("direccion_url_entrada_limpia", "size"),
            tasa_abandono_rapido   = ("abandono_rapido", "mean") if "abandono_rapido" in df_rec.columns else ("direccion_url_entrada_limpia", "size"),
            engagement_promedio    = ("standarized_engagement_score", "mean") if "standarized_engagement_score" in df_rec.columns else ("direccion_url_entrada_limpia", "size"),
        )
        .reset_index()
        .rename(columns={
            "direccion_url_entrada_limpia": "pagina",
            "direccion_url_entrada_tipo"  : "tipo_pagina",
        })
    )

    total = agrupado["total_visitas"].sum()
    agrupado["pct_del_total"]          = (agrupado["total_visitas"] / total * 100).round(2) if total > 0 else 0
    
    if "duracion_promedio_seg" in agrupado.columns:
        agrupado["duracion_promedio_seg"]  = agrupado["duracion_promedio_seg"].round(1)
    if "tasa_abandono_rapido" in agrupado.columns:
        agrupado["tasa_abandono_rapido"]   = (agrupado["tasa_abandono_rapido"] * 100).round(1)
    if "engagement_promedio" in agrupado.columns:
        agrupado["engagement_promedio"]    = agrupado["engagement_promedio"].round(3)

    return (
        agrupado
        .sort_values("total_visitas", ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )

# ═════════════════════════════════════════════════════════════════════
#  ② PUNTOS CRÍTICOS DE ABANDONO
# ═════════════════════════════════════════════════════════════════════
def puntos_criticos_abandono(df_rec: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    if df_rec.empty or "direccion_url_salida_limpia" not in df_rec.columns:
        return pd.DataFrame()

    agrupado = (
        df_rec
        .groupby(["direccion_url_salida_limpia", "direccion_url_salida_tipo"], observed=True)
        .agg(
            total_salidas          = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
            duracion_promedio_seg  = ("duracion_sesion_segundos", "mean") if "duracion_sesion_segundos" in df_rec.columns else ("direccion_url_salida_limpia", "size"),
            tasa_abandono_rapido   = ("abandono_rapido", "mean") if "abandono_rapido" in df_rec.columns else ("direccion_url_salida_limpia", "size"),
            sesiones_problematicas = ("sesion_problematica", "sum") if "sesion_problematica" in df_rec.columns else ("direccion_url_salida_limpia", "size"),
            frustracion_detectada  = ("posible_frustracion", "sum") if "posible_frustracion" in df_rec.columns else ("direccion_url_salida_limpia", "size"),
        )
        .reset_index()
        .rename(columns={
            "direccion_url_salida_limpia": "pagina_salida",
            "direccion_url_salida_tipo"  : "tipo_pagina",
        })
    )

    if "tasa_abandono_rapido" in agrupado.columns:
        agrupado["tasa_abandono_rapido"]  = (agrupado["tasa_abandono_rapido"] * 100).round(1)
        # Índice de impacto: cuántas sesiones se pierden de forma abrupta
        agrupado["impacto_abandono"] = (
            agrupado["total_salidas"] * agrupado["tasa_abandono_rapido"] / 100
        ).round(0).fillna(0).astype(int)
    else:
        agrupado["impacto_abandono"] = 0

    if "duracion_promedio_seg" in agrupado.columns:
        agrupado["duracion_promedio_seg"] = agrupado["duracion_promedio_seg"].round(1)

    return (
        agrupado
        .sort_values("impacto_abandono", ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )

# ═════════════════════════════════════════════════════════════════════
#  ③ PATRONES DE CONVERSIÓN / ENGAGEMENT
# ═════════════════════════════════════════════════════════════════════
def patrones_conversion(df_rec: pd.DataFrame) -> dict:
    if df_rec.empty:
        return {"resumen_general": {"total_sesiones": 0}}
        
    df_rec = df_rec.copy()
    
    # Definir "usuario comprometido" = engagement score > 0 y > 2 páginas vistas
    if "standarized_engagement_score" in df_rec.columns and "recuento_paginas" in df_rec.columns:
        df_rec["usuario_comprometido"] = (
            (df_rec["standarized_engagement_score"] > 0) &
            (df_rec["recuento_paginas"] > 2)
        ).astype(int)
    else:
        df_rec["usuario_comprometido"] = 0

    total = len(df_rec)
    comprometidos = df_rec["usuario_comprometido"].sum()
    
    clic_mean = round(df_rec["clics_sesion"].mean(), 2) if "clics_sesion" in df_rec.columns else 0
    tasa_abandono = round(df_rec["abandono_rapido"].mean() * 100, 1) if "abandono_rapido" in df_rec.columns else 0
    duracion = round(df_rec["duracion_sesion_segundos"].mean(), 1) if "duracion_sesion_segundos" in df_rec.columns else 0
    pag_media = round(df_rec["recuento_paginas"].mean(), 2) if "recuento_paginas" in df_rec.columns else 0

    resumen = {
        "total_sesiones"         : total,
        "sesiones_comprometidas" : int(comprometidos),
        "tasa_conversion_pct"    : round(comprometidos / total * 100, 2) if total > 0 else 0,
        "duracion_media_global"  : duracion,
        "paginas_media_global"   : pag_media,
        "clics_media_global"     : clic_mean,
        "tasa_abandono_rapido_pct": tasa_abandono,
    }

    # ── Por origen de tráfico ────────────────────────────────────────
    if "origen_trafico" in df_rec.columns:
        por_origen = (
            df_rec.groupby("origen_trafico", observed=True)
            .agg(
                sesiones               = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
                engagement_promedio    = ("standarized_engagement_score", "mean") if "standarized_engagement_score" in df_rec.columns else ("origen_trafico", "size"),
                tasa_comprometidos_pct = ("usuario_comprometido", "mean"),
                duracion_promedio_seg  = ("duracion_sesion_segundos", "mean") if "duracion_sesion_segundos" in df_rec.columns else ("origen_trafico", "size"),
            )
            .round(3)
            .reset_index()
        )
        por_origen["tasa_comprometidos_pct"] = (por_origen["tasa_comprometidos_pct"] * 100).round(1)
    else:
        por_origen = pd.DataFrame()

    # ── Por dispositivo ──────────────────────────────────────────────
    if "dispositivo" in df_rec.columns:
        por_dispositivo = (
            df_rec.groupby("dispositivo", observed=True)
            .agg(
                sesiones               = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
                engagement_promedio    = ("standarized_engagement_score", "mean") if "standarized_engagement_score" in df_rec.columns else ("dispositivo", "size"),
                tasa_abandono_rapido   = ("abandono_rapido", "mean") if "abandono_rapido" in df_rec.columns else ("dispositivo", "size"),
                tasa_comprometidos_pct = ("usuario_comprometido", "mean"),
                duracion_promedio_seg  = ("duracion_sesion_segundos", "mean") if "duracion_sesion_segundos" in df_rec.columns else ("dispositivo", "size"),
            )
            .round(3)
            .reset_index()
        )
        if "tasa_abandono_rapido" in por_dispositivo.columns:
            por_dispositivo["tasa_abandono_rapido"]   = (por_dispositivo["tasa_abandono_rapido"] * 100).round(1)
        por_dispositivo["tasa_comprometidos_pct"] = (por_dispositivo["tasa_comprometidos_pct"] * 100).round(1)
    else:
        por_dispositivo = pd.DataFrame()

    # ── Por página de entrada ────────────────────────────────────────
    if "direccion_url_entrada_tipo" in df_rec.columns:
        por_pagina = (
            df_rec.groupby("direccion_url_entrada_tipo", observed=True)
            .agg(
                sesiones               = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
                engagement_promedio    = ("standarized_engagement_score", "mean") if "standarized_engagement_score" in df_rec.columns else ("direccion_url_entrada_tipo", "size"),
                tasa_comprometidos_pct = ("usuario_comprometido", "mean"),
            )
            .round(3)
            .reset_index()
            .rename(columns={"direccion_url_entrada_tipo": "tipo_pagina_entrada"})
            .sort_values("tasa_comprometidos_pct", ascending=False)
        )
        por_pagina["tasa_comprometidos_pct"] = (por_pagina["tasa_comprometidos_pct"] * 100).round(1)
    else:
        por_pagina = pd.DataFrame()

    return {
        "resumen_general"    : resumen,
        "por_origen_trafico" : por_origen,
        "por_dispositivo"    : por_dispositivo,
        "por_pagina_entrada" : por_pagina,
    }

# ═════════════════════════════════════════════════════════════════════
#  ④ FLUJOS DE NAVEGACIÓN
# ═════════════════════════════════════════════════════════════════════
def flujos_navegacion(df_rec: pd.DataFrame, top_n: int = 15) -> pd.DataFrame:
    if df_rec.empty or "direccion_url_entrada_tipo" not in df_rec.columns or "direccion_url_salida_tipo" not in df_rec.columns:
        return pd.DataFrame()

    flujos = (
        df_rec
        .groupby([
            "direccion_url_entrada_tipo",
            "direccion_url_salida_tipo"
        ], observed=True)
        .agg(
            total_sesiones         = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
            duracion_promedio_seg  = ("duracion_sesion_segundos", "mean") if "duracion_sesion_segundos" in df_rec.columns else ("direccion_url_entrada_tipo", "size"),
            tasa_abandono_rapido   = ("abandono_rapido", "mean") if "abandono_rapido" in df_rec.columns else ("direccion_url_entrada_tipo", "size"),
        )
        .reset_index()
        .rename(columns={
            "direccion_url_entrada_tipo": "pagina_inicio",
            "direccion_url_salida_tipo" : "pagina_fin",
        })
    )

    if "duracion_promedio_seg" in flujos.columns:
        flujos["duracion_promedio_seg"] = flujos["duracion_promedio_seg"].round(1)
    if "tasa_abandono_rapido" in flujos.columns:
        flujos["tasa_abandono_rapido"]  = (flujos["tasa_abandono_rapido"] * 100).round(1)

    flujos["tipo_flujo"] = np.where(
        flujos["pagina_inicio"] == flujos["pagina_fin"],
        "Sin avance (misma página)",
        np.where(
            flujos["pagina_fin"].str.contains("error|404", na=False, case=False),
            "Terminó en error",
            "Navegación normal"
        )
    )

    return (
        flujos
        .sort_values("total_sesiones", ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )

# ═════════════════════════════════════════════════════════════════════
#  ⑤ INTERACCIÓN PROMEDIO
# ═════════════════════════════════════════════════════════════════════
def interaccion_promedio(df_rec: pd.DataFrame, df_met: pd.DataFrame) -> dict:
    desde_sessions = {
        "clics_promedio_sesion"     : round(df_rec["clics_sesion"].mean(), 2) if not df_rec.empty and "clics_sesion" in df_rec.columns else 0,
        "paginas_promedio_sesion"   : round(df_rec["recuento_paginas"].mean(), 2) if not df_rec.empty and "recuento_paginas" in df_rec.columns else 0,
        "tiempo_promedio_pag_seg"   : round(df_rec["tiempo_por_pagina"].mean(), 1) if not df_rec.empty and "tiempo_por_pagina" in df_rec.columns else 0,
        "interaccion_total_promedio": round(df_rec["interaccion_total"].mean(), 2) if not df_rec.empty and "interaccion_total" in df_rec.columns else 0,
        "pct_sesiones_sin_clics"    : round((df_rec["clics_sesion"] == 0).mean() * 100, 1) if not df_rec.empty and "clics_sesion" in df_rec.columns else 0,
    }

    scroll_por_pagina = pd.DataFrame()
    clics_por_pagina = pd.DataFrame()

    if not df_met.empty and "metricName" in df_met.columns:
        scroll = df_met[df_met["metricName"] == "ScrollDepth"]
        if not scroll.empty and "Url_tipo" in scroll.columns:
            scroll_por_pagina = (
                scroll.groupby("Url_tipo", observed=True)
                .agg(scroll_promedio=("averageScrollDepth", "mean") if "averageScrollDepth" in scroll.columns else ("Url_tipo", "size"))
                .round(1)
                .reset_index()
                .sort_values("scroll_promedio" if "averageScrollDepth" in scroll.columns else "Url_tipo", ascending=False)
            )

        clics_problema = df_met[df_met["metricName"].isin(["DeadClickCount", "RageClickCount"])]
        if not clics_problema.empty and "Url_tipo" in clics_problema.columns:
            clics_por_pagina = (
                clics_problema
                .groupby(["Url_tipo", "metricName"], observed=True)
                .agg(
                    sesiones_afectadas = ("sessionsCount", "sum") if "sessionsCount" in clics_problema.columns else ("Url_tipo", "size"),
                    pct_usuarios       = ("sessionsWithMetricPercentage", "mean") if "sessionsWithMetricPercentage" in clics_problema.columns else ("Url_tipo", "size"),
                    total_clics        = ("subTotal", "sum") if "subTotal" in clics_problema.columns else ("Url_tipo", "size"),
                )
                .round(2)
                .reset_index()
                .sort_values("sesiones_afectadas" if "sessionsCount" in clics_problema.columns else "Url_tipo", ascending=False)
            )

    return {
        "resumen_sesiones"   : desde_sessions,
        "scroll_por_pagina"  : scroll_por_pagina,
        "clics_problematicos": clics_por_pagina,
    }

# ═════════════════════════════════════════════════════════════════════
#  ⑥ ÍNDICE DE FRUSTRACIÓN POR PÁGINA
# ═════════════════════════════════════════════════════════════════════
def indice_frustracion_pagina(df_rec: pd.DataFrame, df_met: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    if df_rec.empty or "direccion_url_entrada_tipo" not in df_rec.columns:
        return pd.DataFrame()

    frustracion_rec = (
        df_rec.groupby("direccion_url_entrada_tipo", observed=True)
        .agg(
            total_sesiones          = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
            frustracion_directa_pct = ("posible_frustracion", "mean") if "posible_frustracion" in df_rec.columns else ("direccion_url_entrada_tipo", "size"),
            abandono_rapido_pct     = ("abandono_rapido", "mean") if "abandono_rapido" in df_rec.columns else ("direccion_url_entrada_tipo", "size"),
            sesiones_sin_clics_pct  = ("clics_sesion", lambda x: (x == 0).mean()) if "clics_sesion" in df_rec.columns else ("direccion_url_entrada_tipo", "size"),
        )
        .reset_index()
        .rename(columns={"direccion_url_entrada_tipo": "tipo_pagina"})
    )

    if not df_met.empty and "metricName" in df_met.columns and "Url_tipo" in df_met.columns:
        clics_neg = df_met[df_met["metricName"].isin(["RageClickCount", "DeadClickCount"])]
        if not clics_neg.empty:
            frustracion_met = (
                clics_neg.groupby("Url_tipo", observed=True)
                .agg(pct_usuarios_clics_negativos=("sessionsWithMetricPercentage", "mean") if "sessionsWithMetricPercentage" in clics_neg.columns else ("Url_tipo", "size"))
                .reset_index()
                .rename(columns={"Url_tipo": "tipo_pagina"})
            )
            merged = pd.merge(frustracion_rec, frustracion_met, on="tipo_pagina", how="left")
        else:
            merged = frustracion_rec.copy()
            merged["pct_usuarios_clics_negativos"] = 0
    else:
        merged = frustracion_rec.copy()
        merged["pct_usuarios_clics_negativos"] = 0

    merged["pct_usuarios_clics_negativos"] = merged.get("pct_usuarios_clics_negativos", 0).fillna(0)
    
    for c in ["frustracion_directa_pct", "abandono_rapido_pct", "sesiones_sin_clics_pct", "pct_usuarios_clics_negativos"]:
        if c not in merged.columns:
            merged[c] = 0

    merged["indice_frustracion"] = (
        merged["frustracion_directa_pct"] * 30 +
        merged["abandono_rapido_pct"]     * 25 +
        merged["sesiones_sin_clics_pct"]  * 20 +
        merged["pct_usuarios_clics_negativos"] / 100 * 25
    ).round(3) * 100

    for col in ["frustracion_directa_pct", "abandono_rapido_pct", "sesiones_sin_clics_pct"]:
        merged[col] = (merged[col] * 100).round(1)

    return (
        merged
        .sort_values("indice_frustracion", ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )

# ═════════════════════════════════════════════════════════════════════
#  ⑦ PERFIL DEL USUARIO DE ALTO VALOR
# ═════════════════════════════════════════════════════════════════════
def perfil_usuario_alto_valor(df_rec: pd.DataFrame) -> dict:
    if df_rec.empty or "standarized_engagement_score" not in df_rec.columns:
        return {"total_usuarios_alto_valor": 0}

    umbral = df_rec["standarized_engagement_score"].quantile(0.75)
    if pd.isna(umbral):
        # Fallback if quantile can't be computed
        umbral = 0.5 
        
    alto_valor = df_rec[df_rec["standarized_engagement_score"] >= umbral]
    resto      = df_rec[df_rec["standarized_engagement_score"] < umbral]

    def distribucion(serie):
        if serie is None or serie.empty:
            return {}
        return serie.value_counts(normalize=True).mul(100).round(1).to_dict()

    perfil = {
        "umbral_engagement"        : round(umbral, 4),
        "total_usuarios_alto_valor": len(alto_valor),
        "pct_del_total"            : round(len(alto_valor) / len(df_rec) * 100, 1) if len(df_rec) > 0 else 0,

        "duracion_media_seg"       : round(alto_valor["duracion_sesion_segundos"].mean(), 1) if "duracion_sesion_segundos" in alto_valor.columns else 0,
        "paginas_media"            : round(alto_valor["recuento_paginas"].mean(), 2) if "recuento_paginas" in alto_valor.columns else 0,
        "clics_media"              : round(alto_valor["clics_sesion"].mean(), 2) if "clics_sesion" in alto_valor.columns else 0,
        "pct_trafico_externo"      : round(alto_valor["trafico_externo"].mean() * 100, 1) if "trafico_externo" in alto_valor.columns else 0,

        "distribucion_dispositivo" : distribucion(alto_valor["dispositivo"]) if "dispositivo" in alto_valor.columns else {},
        "distribucion_pais"        : distribucion(alto_valor["pais"]) if "pais" in alto_valor.columns else {},
        "distribucion_os"          : distribucion(alto_valor["sistema_operativo"]) if "sistema_operativo" in alto_valor.columns else {},
        "paginas_entrada_top"      : distribucion(alto_valor["direccion_url_entrada_tipo"]) if "direccion_url_entrada_tipo" in alto_valor.columns else {},

        "comparacion": {
            "duracion_alto_valor"  : round(alto_valor["duracion_sesion_segundos"].mean(), 1) if "duracion_sesion_segundos" in alto_valor.columns else 0,
            "duracion_resto"       : round(resto["duracion_sesion_segundos"].mean(), 1) if "duracion_sesion_segundos" in resto.columns else 0,
            "paginas_alto_valor"   : round(alto_valor["recuento_paginas"].mean(), 2) if "recuento_paginas" in alto_valor.columns else 0,
            "paginas_resto"        : round(resto["recuento_paginas"].mean(), 2) if "recuento_paginas" in resto.columns else 0,
        }
    }
    return perfil

# ═════════════════════════════════════════════════════════════════════
#  ⑧ ANÁLISIS DE PÉRDIDAS POR DISPOSITIVO/OS
# ═════════════════════════════════════════════════════════════════════
def perdidas_por_dispositivo(df_rec: pd.DataFrame, df_met: pd.DataFrame) -> pd.DataFrame:
    if df_rec.empty or "dispositivo" not in df_rec.columns or "sistema_operativo" not in df_rec.columns:
        return pd.DataFrame()

    por_dispositivo_os = (
        df_rec.groupby(["dispositivo", "sistema_operativo"], observed=True)
        .agg(
            total_sesiones         = ("id_usuario_clarity", "count" if "id_usuario_clarity" in df_rec.columns else "size"),
            tasa_abandono_rapido   = ("abandono_rapido", "mean") if "abandono_rapido" in df_rec.columns else ("dispositivo", "size"),
            engagement_promedio    = ("standarized_engagement_score", "mean") if "standarized_engagement_score" in df_rec.columns else ("dispositivo", "size"),
            duracion_media_seg     = ("duracion_sesion_segundos", "mean") if "duracion_sesion_segundos" in df_rec.columns else ("dispositivo", "size"),
            frustracion_pct        = ("posible_frustracion", "mean") if "posible_frustracion" in df_rec.columns else ("dispositivo", "size"),
            sesiones_problematicas = ("sesion_problematica", "sum") if "sesion_problematica" in df_rec.columns else ("dispositivo", "size"),
        )
        .reset_index()
    )

    if not df_met.empty and "metricName" in df_met.columns and "Device" in df_met.columns and "OS" in df_met.columns:
        errores = df_met[df_met["metricName"].isin(["JavascriptErrorCount", "ErrorClickCount", "RageClickCount"])]
        if not errores.empty:
            errores_agg = (
                errores.groupby(["Device", "OS"], observed=True)
                .agg(pct_sesiones_con_error=("sessionsWithMetricPercentage", "mean") if "sessionsWithMetricPercentage" in errores.columns else ("Device", "size"))
                .reset_index()
                .rename(columns={"Device": "dispositivo", "OS": "sistema_operativo"})
            )
            # Unificar nombres
            errores_agg["dispositivo"]      = errores_agg["dispositivo"].str.title()
            errores_agg["sistema_operativo"] = errores_agg["sistema_operativo"].str.strip()
            por_dispositivo_os = pd.merge(
                por_dispositivo_os, errores_agg, on=["dispositivo", "sistema_operativo"], how="left"
            ).fillna(0)
        else:
            por_dispositivo_os["pct_sesiones_con_error"] = 0
    else:
        por_dispositivo_os["pct_sesiones_con_error"] = 0

    if "tasa_abandono_rapido" in por_dispositivo_os.columns:
        por_dispositivo_os["tasa_abandono_rapido"] = (por_dispositivo_os["tasa_abandono_rapido"] * 100).round(1)
    if "frustracion_pct" in por_dispositivo_os.columns:
        por_dispositivo_os["frustracion_pct"]      = (por_dispositivo_os["frustracion_pct"] * 100).round(1)
    if "engagement_promedio" in por_dispositivo_os.columns:
        por_dispositivo_os["engagement_promedio"]  = por_dispositivo_os["engagement_promedio"].round(3)
    if "duracion_media_seg" in por_dispositivo_os.columns:
        por_dispositivo_os["duracion_media_seg"]   = por_dispositivo_os["duracion_media_seg"].round(1)

    tasa = por_dispositivo_os.get("tasa_abandono_rapido", 0)
    frust = por_dispositivo_os.get("frustracion_pct", 0)
    pct_err = por_dispositivo_os.get("pct_sesiones_con_error", 0)
    
    por_dispositivo_os["score_riesgo_perdida"] = (
        tasa * 0.4 +
        frust * 0.3 +
        pct_err * 0.3
    ).round(2)

    return (
        por_dispositivo_os
        .sort_values("score_riesgo_perdida", ascending=False)
        .reset_index(drop=True)
    )

def generar_resumen_para_ia(df_rec: pd.DataFrame, df_met: pd.DataFrame) -> str:
    visitadas    = paginas_mas_visitadas(df_rec, top_n=5)
    abandono     = puntos_criticos_abandono(df_rec, top_n=5)
    conversion   = patrones_conversion(df_rec)
    flujos       = flujos_navegacion(df_rec, top_n=8)
    interaccion  = interaccion_promedio(df_rec, df_met)
    frustracion  = indice_frustracion_pagina(df_rec, df_met, top_n=5)
    alto_valor   = perfil_usuario_alto_valor(df_rec)
    perdidas     = perdidas_por_dispositivo(df_rec, df_met)

    r = conversion.get("resumen_general", {})
    s = interaccion.get("resumen_sesiones", {})
    av = alto_valor

    if not r:
        return "No hay datos para generar el resumen."

    def df_to_string(df, cols):
        if df.empty: return "Sin datos"
        present_cols = [c for c in cols if c in df.columns]
        return df[present_cols].to_string(index=False) if present_cols else "Sin columnas necesarias"

    resumen = f"""
=== RESUMEN DE ANÁLISIS WEB - cloudlabslearning.com ===

[MÉTRICAS GLOBALES]
- Total sesiones analizadas: {r.get('total_sesiones', 0):,}
- Tasa de conversión/engagement: {r.get('tasa_conversion_pct', 0)}%
- Tasa de abandono rápido global: {r.get('tasa_abandono_rapido_pct', 0)}%
- Duración media de sesión: {r.get('duracion_media_global', 0)}s
- Páginas promedio por sesión: {r.get('paginas_media_global', 0)}
- Clics promedio por sesión: {s.get('clics_promedio_sesion', 0)}
- Sesiones sin ningún clic: {s.get('pct_sesiones_sin_clics', 0)}%

[① PÁGINAS MÁS VISITADAS]
{df_to_string(visitadas, ['pagina','tipo_pagina','total_visitas','pct_del_total','tasa_abandono_rapido'])}

[② PUNTOS CRÍTICOS DE ABANDONO]
{df_to_string(abandono, ['pagina_salida','tipo_pagina','total_salidas','tasa_abandono_rapido','impacto_abandono'])}

[③ PATRONES DE CONVERSIÓN POR DISPOSITIVO]
{df_to_string(conversion.get('por_dispositivo', pd.DataFrame()), ['dispositivo', 'sesiones', 'engagement_promedio', 'tasa_abandono_rapido', 'tasa_comprometidos_pct', 'duracion_promedio_seg'])}

[③ PATRONES DE CONVERSIÓN POR ORIGEN]
{df_to_string(conversion.get('por_origen_trafico', pd.DataFrame()), ['origen_trafico', 'sesiones', 'engagement_promedio', 'tasa_comprometidos_pct', 'duracion_promedio_seg'])}

[④ FLUJOS DE NAVEGACIÓN PRINCIPALES]
{df_to_string(flujos, ['pagina_inicio','pagina_fin','total_sesiones','tasa_abandono_rapido','tipo_flujo'])}

[⑤ INTERACCIÓN PROMEDIO]
- Clics por sesión: {s.get('clics_promedio_sesion', 0)}
- Páginas por sesión: {s.get('paginas_promedio_sesion', 0)}
- Tiempo por página: {s.get('tiempo_promedio_pag_seg', 0)}s

[⑥ ÍNDICE DE FRUSTRACIÓN POR PÁGINA]
{df_to_string(frustracion, ['tipo_pagina','total_sesiones','indice_frustracion','abandono_rapido_pct','frustracion_directa_pct'])}

[⑦ PERFIL USUARIO ALTO VALOR]
- Umbral engagement: {av.get('umbral_engagement', 0)}
- Representa el {av.get('pct_del_total', 0)}% de usuarios
- Duración media: {av.get('duracion_media_seg', 0)}s vs {av.get('comparacion', {}).get('duracion_resto', 0)}s del resto
- Páginas vistas: {av.get('comparacion', {}).get('paginas_alto_valor', 0)} vs {av.get('comparacion', {}).get('paginas_resto', 0)} del resto

[⑧ RIESGO DE PÉRDIDA POR DISPOSITIVO/OS]
{df_to_string(perdidas.head(6) if not perdidas.empty else perdidas, ['dispositivo','sistema_operativo','total_sesiones','tasa_abandono_rapido','score_riesgo_perdida'])}
"""
    return resumen.strip()

if __name__ == "__main__":
    from data_loader import cargar_todo
    try:
        datos  = cargar_todo()
        df_rec = datos.get("recordings", pd.DataFrame())
        df_met = datos.get("metrics", pd.DataFrame())

        print("\n📊 Generando resumen para IA...")
        resumen = generar_resumen_para_ia(df_rec, df_met)
        print(resumen)
    except Exception as e:
        print(f"Error executing logic: {e}")
