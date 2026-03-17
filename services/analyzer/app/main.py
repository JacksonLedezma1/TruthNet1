from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import spacy
from sentence_transformers import SentenceTransformer

from app.routers import claims, sources, verdict

# Cargar variables de entorno desde .env
load_dotenv()

# Variables globales para modelos — se cargan una vez al arrancar
nlp = None
embedding_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan: código que corre al arrancar y al apagar la app.
    Es el reemplazo moderno de @app.on_event("startup").
    Cargamos spaCy y el modelo de embeddings aquí para no repetirlo en cada request.
    """
    global nlp, embedding_model
    print("Cargando modelo de spaCy...")
    nlp = spacy.load("es_core_news_md")
    app.state.nlp = nlp
    print("Modelo spaCy cargado ✓")

    print("Cargando modelo de embeddings...")
    embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    app.state.embedding_model = embedding_model
    print("Modelo de embeddings cargado ✓")

    yield  # La app corre aquí

    # Cleanup al apagar (opcional pero buena práctica)
    print("Apagando microservicio...")

app = FastAPI(
    title="TruthNet Analyzer",
    description="Microservicio de análisis de desinformación",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Solo acepta requests de NestJS — no está expuesto al público
    allow_origins=["http://localhost:3001"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Registramos los routers — cada uno maneja una etapa del pipeline
app.include_router(claims.router,  prefix="/claims",  tags=["claims"])
app.include_router(sources.router, prefix="/sources", tags=["sources"])
app.include_router(verdict.router, prefix="/verdict", tags=["verdict"])

@app.get("/health")
def health():
    """NestJS llama este endpoint para verificar que el microservicio está vivo."""
    return {
        "status": "ok",
        "spacy_loaded": app.state.nlp is not None,
        "embedding_model_loaded": app.state.embedding_model is not None,
    }