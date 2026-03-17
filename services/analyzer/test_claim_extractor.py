#!/usr/bin/env python3
"""
Test manual del extractor de claims.
Ejecutar: python test_claim_extractor.py

Este script valida que el nuevo extractor con heurísticas estructurales
funciona correctamente, incluso cuando spaCy no detecta entidades.
"""

import sys
import os

# Agregamos el path del analyzer para importar el servicio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

import spacy
from app.services.claim_extractor import extract_claims

# Test cases - cada uno tiene una afirmación factual que debería detectarse
TEST_CASES = [
    {
        "name": "Caso del contexto - economía 5%",
        "text": "El gobierno anunció que la economía creció 5% este año según datos del banco central.",
        "expected_claims": 1,
        "should_contain": ["5%", "economía", "banco central"],
    },
    {
        "name": "Estadística sin entidades nombradas claras",
        "text": "La inflación del último trimestre alcanzó el 3.5% según el índice de precios al consumidor.",
        "expected_claims": 1,
        "should_contain": ["inflación", "3.5%"],
    },
    {
        "name": "Declaración oficial",
        "text": "El ministro de economía declaró que el déficit fiscal se redujo en el último semestre.",
        "expected_claims": 1,
        "should_contain": ["ministro", "déficit fiscal"],
    },
    {
        "name": "Múltiples afirmaciones",
        "text": "El PIB creció 2.8% en 2024. La tasa de desempleo bajó al 8.5%. El banco central mantuvo las tasas de interés.",
        "expected_claims": 3,
        "should_contain": ["pib", "desempleo", "banco central"],
    },
    {
        "name": "Reporte con fuente",
        "text": "Según el reporte del FMI, el país mostró una recuperación económica sostenida durante el último año.",
        "expected_claims": 1,
        "should_contain": ["FMI", "recuperación"],
    },
    {
        "name": "Sin afirmaciones factuales (opinión)",
        "text": "Creo que la economía va a mejorar pronto. Me parece que las medidas son buenas.",
        "expected_claims": 0,
        "should_contain": [],
    },
    {
        "name": "Datos cuantitativos sin entidades ORG/PERSON",
        "text": "Las exportaciones crecieron un 15% respecto al año anterior, alcanzando los 50 mil millones de dólares.",
        "expected_claims": 1,
        "should_contain": ["exportaciones", "15%", "50 mil millones"],
    },
]


def run_tests():
    """Ejecuta todos los tests y muestra resultados."""
    print("=" * 70)
    print("TEST DEL EXTRACTOR DE CLAIMS - TruthNet")
    print("=" * 70)
    
    # Cargamos spaCy (igual que en producción)
    print("\nCargando modelo spaCy...")
    try:
        nlp = spacy.load("es_core_news_md")
        print("Modelo cargado ✓\n")
    except OSError:
        print("ERROR: No se encontró el modelo es_core_news_md")
        print("Instálalo con: python -m spacy download es_core_news_md")
        sys.exit(1)
    
    passed: int = 0
    failed: int = 0
    
    for test in TEST_CASES:
        print(f"\n{'─' * 70}")
        print(f"Test: {test['name']}")
        print(f"Texto: \"{test['text'][:80]}...\"" if len(test['text']) > 80 else f"Texto: \"{test['text']}\"")
        print()
        
        # Ejecutamos el extractor
        result = extract_claims(test['text'], nlp)
        claims = result['claims']
        
        # Verificamos cantidad de claims
        claim_count_ok = len(claims) >= test['expected_claims']
        
        if not claim_count_ok:
            print(f"  ❌ FALLÓ: Esperaba {test['expected_claims']} claims, obtuve {len(claims)}")
            failed += 1
            continue
        
        print(f"  ✓ Cantidad: {len(claims)} claims extraídos")
        
        # Verificamos que los claims contengan los términos esperados
        terms_found: dict[str, bool] = {term: False for term in test['should_contain']}
        
        for claim in claims:
            claim_text_lower = claim.text.lower()
            entities_lower = [e.lower() for e in claim.entities]
            
            for term in test['should_contain']:
                if terms_found.get(term):
                    continue  # Ya encontrado, saltar
                    
                term_lower = term.lower()
                found_in_text = term_lower in claim_text_lower
                found_in_entities = any(term_lower in e for e in entities_lower)
                
                if found_in_text or found_in_entities:
                    terms_found[term] = True
        
        # Verificar si faltan términos
        all_terms_found = all(terms_found.values())
        for term, found in terms_found.items():
            if not found:
                print(f"  ❌ No se encontró el término esperado: '{term}'")
        
        if all_terms_found:
            print(f"  ✓ Todos los términos esperados encontrados")
        
        # Mostramos los claims extraídos
        for i, claim in enumerate(claims, 1):
            print(f"\n  Claim {i}:")
            print(f"    Texto: {claim.text[:100]}..." if len(claim.text) > 100 else f"    Texto: {claim.text}")
            print(f"    Tipo: {claim.claim_type}")
            print(f"    Verificable: {claim.verifiable}")
            print(f"    Entidades/Términos: {claim.entities[:5]}..." if len(claim.entities) > 5 else f"    Entidades/Términos: {claim.entities}")
        
        if claim_count_ok and all_terms_found:
            passed += 1
            print(f"\n  ✅ TEST PASADO")
        else:
            failed += 1
            print(f"\n  ❌ TEST FALLÓ")
    
    # Resumen
    print("\n" + "=" * 70)
    print("RESUMEN")
    print("=" * 70)
    print(f"Tests pasados: {passed}/{len(TEST_CASES)}")
    print(f"Tests fallidos: {failed}/{len(TEST_CASES)}")
    
    if failed == 0:
        print("\n🎉 Todos los tests pasaron. El extractor está funcionando correctamente.")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) fallaron. Revisar la implementación.")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
