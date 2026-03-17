#!/bin/bash
# Script para iniciar el microservicio de análisis en desarrollo
# Uso: ./dev.sh

set -e

# Verificar que estamos en el directorio correcto
cd "$(dirname "$0")"

# Crear entorno virtual si no existe
if [ ! -d ".venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv .venv
fi

# Activar entorno virtual
source .venv/bin/activate

# Instalar dependencias
echo "Instalando dependencias..."
pip install --quiet -r requirements.txt

# Descargar modelo de spaCy si no está instalado
if ! python -c "import spacy; spacy.load('es_core_news_md')" 2>/dev/null; then
    echo "Descargando modelo de spaCy..."
    python -m spacy download es_core_news_md
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando .env.example..."
    cp .env.example .env
    echo "⚠️  Por favor, configura GROQ_API_KEY en .env"
fi

# Iniciar servidor
echo ""
echo "🚀 Iniciando servidor en http://localhost:8000"
echo "📚 Documentación: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload