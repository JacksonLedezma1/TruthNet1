# Dockerfile para el microservicio Python de TruthNet
# Build: docker build -t truthnet-analyzer .
# Run: docker run -p 8000:8000 --env-file .env truthnet-analyzer

FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar extensiones C
# y para spaCy / sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero para aprovechar el cache de Docker
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Descargar el modelo de spaCy durante el build (no en runtime)
RUN python -m spacy download es_core_news_md

# Copiar el código de la aplicación
COPY . .

# Crear directorio para cache de modelos de sentence-transformers
RUN mkdir -p /root/.cache/torch/sentence_transformers

# Puerto expuesto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando por defecto para producción
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]