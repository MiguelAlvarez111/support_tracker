"""
FastAPI application for Support Tracker.
"""
import logging
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db, init_db
from models import Team, Agent, DailyPerformance
from schemas import DailyPerformanceResponse
from routers import teams, agents, performances, metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# CORS configuration
# In production, set ALLOWED_ORIGINS environment variable with comma-separated origins
# Example: ALLOWED_ORIGINS=https://myapp.com,https://admin.myapp.com
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

# Check if running in development mode
IS_DEVELOPMENT = os.getenv("ENV", "development").lower() == "development"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the application.
    Handles startup and shutdown events.
    """
    # Startup
    # Skip database initialization during tests
    if os.getenv("TESTING") == "1":
        logger.info("Skipping database initialization (TESTING mode)")
    else:
        logger.info("Starting Support Tracker API")
        logger.info("Initializing database...")
        try:
            init_db()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}", exc_info=True)
            raise
    
    yield  # Application is running
    
    # Shutdown
    logger.info("Shutting down Support Tracker API")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Support Tracker API",
    description="API para seguimiento de tickets de soporte y métricas diarias",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware - more permissive in development, restricted in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if IS_DEVELOPMENT else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(teams.router)
app.include_router(agents.router)
app.include_router(performances.router)
app.include_router(metrics.router)


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint."""
    logger.info("Root endpoint accessed")
    return {
        "message": "Support Tracker API",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    logger.debug("Health check endpoint accessed")
    return {"status": "healthy"}
