"""
FastAPI application for Support Tracker.
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from database import get_db, init_db
from models import DailyMetric
from schemas import (
    DailyMetricCreate,
    DailyMetricUpdate,
    DailyMetricResponse,
    DailyMetricBulkCreate,
    RawDataUpload
)
from services.parser import parse_raw_text, upsert_metrics

# Initialize FastAPI app
app = FastAPI(
    title="Support Tracker API",
    description="API para seguimiento de tickets de soporte y métricas diarias",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure according to your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup."""
    init_db()


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint."""
    return {
        "message": "Support Tracker API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post(
    "/api/metrics",
    response_model=DailyMetricResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Metrics"]
)
async def create_metric(
    metric: DailyMetricCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new daily metric.
    
    The is_burnout field will be automatically calculated based on:
    squadlinx_points > squadlinx_goal + 0.5
    """
    # Create new metric
    db_metric = DailyMetric(**metric.model_dump())
    
    # Calculate burnout status
    db_metric.calculate_burnout()
    
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    
    return db_metric


@app.post(
    "/api/metrics/bulk",
    response_model=List[DailyMetricResponse],
    status_code=status.HTTP_201_CREATED,
    tags=["Metrics"]
)
async def create_metrics_bulk(
    bulk_data: DailyMetricBulkCreate,
    db: Session = Depends(get_db)
):
    """
    Create multiple daily metrics in bulk.
    
    Useful for loading large datasets at once.
    """
    db_metrics = []
    
    for metric_data in bulk_data.metrics:
        db_metric = DailyMetric(**metric_data.model_dump())
        db_metric.calculate_burnout()
        db_metrics.append(db_metric)
    
    db.add_all(db_metrics)
    db.commit()
    
    # Refresh all metrics
    for db_metric in db_metrics:
        db.refresh(db_metric)
    
    return db_metrics


@app.get(
    "/api/metrics",
    response_model=List[DailyMetricResponse],
    tags=["Metrics"]
)
async def get_metrics(
    skip: int = 0,
    limit: int = 100,
    agent_name: str = None,
    start_date: date = None,
    end_date: date = None,
    is_burnout: bool = None,
    db: Session = Depends(get_db)
):
    """
    Get all daily metrics with optional filters.
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **agent_name**: Filter by agent name
    - **start_date**: Filter metrics from this date onwards
    - **end_date**: Filter metrics up to this date
    - **is_burnout**: Filter by burnout status
    """
    query = db.query(DailyMetric)
    
    if agent_name:
        query = query.filter(DailyMetric.agent_name == agent_name.upper())
    
    if start_date:
        query = query.filter(DailyMetric.date >= start_date)
    
    if end_date:
        query = query.filter(DailyMetric.date <= end_date)
    
    if is_burnout is not None:
        query = query.filter(DailyMetric.is_burnout == is_burnout)
    
    metrics = query.order_by(DailyMetric.date.desc()).offset(skip).limit(limit).all()
    
    return metrics


@app.get(
    "/api/metrics/{metric_id}",
    response_model=DailyMetricResponse,
    tags=["Metrics"]
)
async def get_metric(
    metric_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific metric by ID."""
    metric = db.query(DailyMetric).filter(DailyMetric.id == metric_id).first()
    
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric with id {metric_id} not found"
        )
    
    return metric


@app.put(
    "/api/metrics/{metric_id}",
    response_model=DailyMetricResponse,
    tags=["Metrics"]
)
async def update_metric(
    metric_id: int,
    metric_update: DailyMetricUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing metric.
    
    Only provided fields will be updated.
    The is_burnout field will be recalculated if squadlinx_points or squadlinx_goal are updated.
    """
    db_metric = db.query(DailyMetric).filter(DailyMetric.id == metric_id).first()
    
    if not db_metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric with id {metric_id} not found"
        )
    
    # Update only provided fields
    update_data = metric_update.model_dump(exclude_unset=True)
    
    # Check if points or goal are being updated (need to recalculate burnout)
    needs_recalc = 'squadlinx_points' in update_data or 'squadlinx_goal' in update_data
    
    for key, value in update_data.items():
        setattr(db_metric, key, value)
    
    # Recalculate burnout if needed
    if needs_recalc:
        db_metric.calculate_burnout()
    
    db.commit()
    db.refresh(db_metric)
    
    return db_metric


@app.delete(
    "/api/metrics/{metric_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Metrics"]
)
async def delete_metric(
    metric_id: int,
    db: Session = Depends(get_db)
):
    """Delete a metric by ID."""
    db_metric = db.query(DailyMetric).filter(DailyMetric.id == metric_id).first()
    
    if not db_metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric with id {metric_id} not found"
        )
    
    db.delete(db_metric)
    db.commit()
    
    return None


@app.post(
    "/upload-raw-data",
    response_model=List[DailyMetricResponse],
    status_code=status.HTTP_200_OK,
    tags=["Upload"]
)
async def upload_raw_data(
    upload_data: RawDataUpload,
    db: Session = Depends(get_db)
):
    """
    Upload raw text data copied from Excel and parse it into DailyMetric records.
    
    Expected format:
    WIEDER 1 ene. 2 ene.
    T. P M. A D.M T. P M. A D.M
    M. ALVAREZ 0 0 0 401 400 1
    J. ROMERO 0 0 0 200 200 0
    
    The endpoint will:
    - Parse the raw text to extract agent names, dates, tickets_processed, and ticket_goal
    - For each (agent_name, date) combination, update if exists, create if new (upsert)
    - Return all processed metrics
    
    Note: squadlinx_points and squadlinx_goal are set to default values (0.0 and 8.0)
    as they are not present in the raw data format.
    """
    try:
        # Parse raw text into DailyMetricCreate objects
        metrics = parse_raw_text(
            raw_text=upload_data.raw_data,
            base_year=upload_data.base_year
        )
        
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid metrics could be parsed from the raw data"
            )
        
        # Upsert metrics (update if exists, create if new)
        result_metrics = upsert_metrics(metrics, db)
        
        return result_metrics
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing raw data: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing data: {str(e)}"
        )

