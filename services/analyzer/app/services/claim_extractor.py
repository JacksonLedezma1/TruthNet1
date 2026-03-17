import spacy
import uuid
import re
from ..schemas.analysis import Claim

# Palabras que indican sesgo emocional o carga ideológica
BIAS_LEXICON = {
    "es": [
        "nunca", "siempre", "jamás", "absolutamente", "totalmente",
        "devastador", "catastrófico", "glorioso", "brillante", "terrible",
        "increíble", "asombroso", "ridículo", "absurdo", "impresionante",
        "desastroso", "perfecto", "horrible", "fantástico", "nefasto",
        "indignante", "escandaloso", "vergonzoso", "inadmisible", "intolerable",
    ]
}

# Términos económicos que indican afirmaciones verificables
ECONOMIC_TERMS = {
    "inflación", "deflación", "pib", "producto interno bruto",
    "deuda", "déficit", "superávit", "recaudación", "impuestos",
    "exportaciones", "importaciones", "balanza comercial", "reservas",
    "tipo de cambio", "moneda", "dólar", "euro", "peso",
    "tasa de interés", "tasa", "desempleo", "empleo", "trabajo",
    "salario", "sueldo", "mínimo", "ipc", "índice de precios",
    "crecimiento", "contracción", "recesión", "expansión", "crisis",
    "bono", "bonos", "mercado", "bolsa", "financiero", "económico",
    "banco central", "bancos", "sector financiero", "sector público",
    "sector privado", "inversión", "inversión extranjera", "ied",
    "comercio", "industria", "producción", "manufactura", "agricultura",
}

# Verbos de declaración oficial o reporte
DECLARATION_VERBS = [
    "dijo", "afirmó", "declaró", "anunció", "señaló", "indicó",
    "comunicó", "informó", "reportó", "presentó", "explicó",
    "manifestó", "aseveró", "sostuvo", "argumentó", "precisó",
    "aclaró", "subrayó", "enfatizó", "advirtió", "reveló",
    "confirmó", "desmintió", "negó", "rechazó", "aceptó",
    "reconoció", "aseguró", "prometió", "garantizó", "comprometió",
    "ordenó", "mandó", "instruyó", "dirigió", "encabezó",
]

# Verbos de reporte periodístico o institucional
REPORT_VERBS = [
    "según", "reporta", "informa", "indica", "muestra", "revela",
    "destaca", "señala", "menciona", "documenta", "registra",
    "consta", "figura", "aparece", "publicó", "difundió",
    "emitió", "difundió", "transmitió", "publicó", "reportó",
]

# Patrones numéricos para estadísticas
NUMERIC_PATTERNS = [
    r'\d+\s*%',                    # Porcentajes: 5%, 12.5%
    r'\d+\s*(?:millones?|miles?|billones?)',  # Cantidades: 5 millones, 2 mil millones
    r'\$\s*\d+',                   # Montos: $500, $ 1 millón
    r'\d+\s*(?:usd|eur|mxn|cop|ars)',  # Monedas: 100 USD, 50 EUR
    r'\d{1,3}(?:\.\d{3})+',        # Números con separadores: 1.000, 50.000.000
    r'(?:año|mes|día)\s+\d{4}',    # Fechas: año 2024, mes 5
]

# Términos institucionales y gubernamentales
INSTITUTIONAL_TERMS = {
    "gobierno", "estado", "ministerio", "secretaría", "presidencia",
    "congreso", "senado", "cámara", "diputados", "parlamento",
    "corte", "tribunal", "suprema", "juzgado", "fiscalía",
    "agencia", "instituto", "organismo", "dependencia", "entidad",
    "administración", "ejecutivo", "legislativo", "judicial",
    "oficial", "oficialmente", "formalmente", "públicamente",
}


def extract_claims(text: str, nlp: spacy.Language) -> dict:
    """
    Extrae afirmaciones verificables de un texto usando heurísticas estructurales
    complementadas con NER de spaCy.
    
    El proceso:
    1. Divide el texto en oraciones
    2. Aplica heurísticas estructurales para detectar afirmaciones factuales
    3. Usa spaCy NER como complemento (no como filtro obligatorio)
    4. Calcula el sesgo lingüístico
    
    Las heurísticas detectan:
    - Estadísticas y datos numéricos
    - Declaraciones oficiales o institucionales
    - Afirmaciones económicas
    - Reportes periodísticos
    """
    doc = nlp(text)
    claims = []
    
    for sent in doc.sents:
        sent_text = sent.text.strip()
        sent_lower = sent_text.lower()
        
        # Skip oraciones muy cortas o interrogativas
        if len(sent_text) < 15 or sent_text.endswith("?"):
            continue
        
        # Extraemos entidades de spaCy (como referencia, no filtro)
        entities = [ent.text for ent in sent.ents]
        
        # Detectar si la oración es una afirmación factual usando heurísticas
        is_factual = _is_factual_statement(sent_text, sent_lower, entities)
        
        if not is_factual:
            continue
        
        # Clasificar el tipo de claim
        claim_type = _classify_claim_type(sent_text, sent_lower, entities)
        
        # Un claim es verificable si tiene contenido factual
        verifiable = claim_type in ["estadística", "declaración", "evento", "reporte"]
        
        claims.append(Claim(
            id=str(uuid.uuid4()),
            text=sent_text,
            entities=list(set(entities)) if entities else _extract_key_terms(sent_lower),
            claim_type=claim_type,
            verifiable=verifiable,
        ))
    
    # Calculamos el score de sesgo lingüístico
    bias_score, bias_indicators = _calculate_bias(text)
    
    return {
        "claims": claims,
        "total": len(claims),
        "language_bias_score": bias_score,
        "bias_indicators": bias_indicators,
    }


def _is_factual_statement(text: str, text_lower: str, entities: list[str]) -> bool:
    """
    Determina si una oración es una afirmación factual verificable
    usando heurísticas estructurales.
    
    No depende exclusivamente de entidades spaCy.
    """
    # Heurística 1: Contiene números o patrones estadísticos
    if _has_statistical_pattern(text):
        return True
    
    # Heurística 2: Contiene términos económicos
    if _has_economic_terms(text_lower):
        return True
    
    # Heurística 3: Contiene verbos de declaración/reporte
    if _has_declaration_pattern(text_lower):
        return True
    
    # Heurística 4: Es una afirmación con fuente citada ("según X")
    if _has_source_citation(text_lower):
        return True
    
    # Heurística 5: Contiene términos institucionales + entidades
    if _has_institutional_claim(text_lower, entities):
        return True
    
    # Heurística 6: Estructura de reporte periodístico
    if _is_news_report_structure(text_lower, entities):
        return True
    
    # Fallback: Si tiene entidades nombradas considerables, puede ser factual
    if len(entities) >= 2:
        return True
    
    return False


def _has_statistical_pattern(text: str) -> bool:
    """Detecta si el texto contiene patrones estadísticos o numéricos."""
    for pattern in NUMERIC_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _has_economic_terms(text_lower: str) -> bool:
    """Detecta si el texto contiene términos económicos relevantes."""
    for term in ECONOMIC_TERMS:
        if term in text_lower:
            return True
    return False


def _has_declaration_pattern(text_lower: str) -> bool:
    """Detecta verbos de declaración o reporte."""
    all_report_verbs = DECLARATION_VERBS + REPORT_VERBS
    for verb in all_report_verbs:
        if verb in text_lower:
            return True
    return False


def _has_source_citation(text_lower: str) -> bool:
    """Detecta si la oración cita una fuente."""
    # Patrones como "según X", "de acuerdo con X", "X reportó"
    source_patterns = [
        r'\bsegún\s+\w+',
        r'\bde\s+acuerdo\s+con\s+\w+',
        r'\bconforme\s+a\s+\w+',
        r'\bsegún\s+lo\s+reportado\s+por',
        r'\bfuentes?\s+(?:de|del|of)',
    ]
    for pattern in source_patterns:
        if re.search(pattern, text_lower):
            return True
    return False


def _has_institutional_claim(text_lower: str, entities: list[str]) -> bool:
    """Detecta afirmaciones institucionales."""
    # Verifica si hay términos institucionales + alguna entidad
    has_institutional = any(term in text_lower for term in INSTITUTIONAL_TERMS)
    return has_institutional and len(entities) >= 1


def _is_news_report_structure(text_lower: str, entities: list[str]) -> bool:
    """Detecta estructura típica de reporte noticioso."""
    # Estructura: [Entidad] [verbo de reporte] [afirmación]
    has_report_verb = any(verb in text_lower for verb in REPORT_VERBS)
    return has_report_verb and len(entities) >= 1


def _extract_key_terms(text_lower: str) -> list[str]:
    """
    Extrae términos clave cuando spaCy no detecta entidades.
    Usa heurísticas simples para identificar sustantivos importantes.
    """
    key_terms = []
    
    # Busca términos económicos
    for term in ECONOMIC_TERMS:
        if term in text_lower:
            key_terms.append(term)
    
    # Busca términos institucionales
    for term in INSTITUTIONAL_TERMS:
        if term in text_lower:
            key_terms.append(term)
    
    # Extrae porcentajes y números como términos clave
    number_matches = re.findall(r'\d+(?:\.\d+)?\s*%', text_lower)
    key_terms.extend(number_matches)
    
    return list(set(key_terms))


def _classify_claim_type(text: str, text_lower: str, entities: list[str]) -> str:
    """
    Clasificación basada en patrones estructurales:
    - estadística: tiene números/datos cuantitativos
    - declaración: verbos de declaración oficial
    - reporte: estructura periodística con fuentes
    - evento: acciones pasadas con entidades
    - opinion: expresiones de opinión
    """
    # Verificar primero si es opinión (para descartar)
    opinion_markers = [
        "creo que", "pienso que", "opino que", "me parece que",
        "considero que", "desde mi punto de vista", "en mi opinión",
        "yo diría", "a mi juicio", "personalmente",
    ]
    if any(marker in text_lower for marker in opinion_markers):
        return "opinion"
    
    # Estadística: patrones numéricos
    if _has_statistical_pattern(text):
        return "estadística"
    
    # Reporte: cita fuentes o usa verbos de reporte periodístico
    if _has_source_citation(text_lower) or _is_news_report_structure(text_lower, entities):
        return "reporte"
    
    # Declaración: verbos de declaración oficial
    if any(verb in text_lower for verb in DECLARATION_VERBS):
        return "declaración"
    
    # Evento: por defecto si tiene entidades y estructura pasiva
    if entities:
        return "evento"
    
    return "afirmación general"


def _calculate_bias(text: str) -> tuple[float, list[str]]:
    """
    Score de sesgo: cuenta palabras del lexicon de sesgo / total de palabras.
    Devuelve el score normalizado entre 0 y 1, y las palabras detectadas.
    """
    words = text.lower().split()
    if not words:
        return 0.0, []
    
    bias_words_found = [w for w in words if w in BIAS_LEXICON["es"]]
    
    # Normalizamos: máximo 1.0 aunque haya muchas palabras de sesgo
    score = min(len(bias_words_found) / max(len(words) * 0.1, 1.0), 1.0)
    
    return round(float(score), 3), list(set(bias_words_found))