"""
Endpoints for metrics and aggregated data.
"""
import logging
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models import DailyPerformance, Agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


@router.get(
    "/",
    summary="Get historical metrics"
)
async def get_metrics(
    limit: int = Query(1000, ge=1, le=10000, description="Maximum number of records to return"),
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    db: Session = Depends(get_db)
):
    """
    Get historical performance metrics with agent information.
    
    Returns metrics in a format compatible with SprintHeatmap and SprintStats components.
    Each metric includes:
    - agent_name: Full name of the agent
    - date: Date of the performance record
    - tickets_processed: Actual tickets processed (tickets_actual)
    - ticket_goal: Goal for tickets (tickets_goal)
    - squadlinx_points: Actual squadlinx points (points_actual)
    - squadlinx_goal: Goal for squadlinx points (points_goal)
    - is_burnout: Whether agent exceeded burnout threshold (points_actual > 8.0)
    """
    logger.info(f"Getting metrics: limit={limit}, team_id={team_id}")
    try:
        # Build query
        query = db.query(
            DailyPerformance,
            Agent
        ).join(
            Agent, DailyPerformance.agent_id == Agent.id
        )
        
        # Filter by team if provided
        if team_id is not None:
            query = query.filter(Agent.team_id == team_id)
        
        # Order by date descending and limit
        results = query.order_by(
            DailyPerformance.date.desc(),
            Agent.full_name
        ).limit(limit).all()
        
        # Transform to frontend format
        metrics = []
        for perf, agent in results:
            # Calculate burnout: points_actual > 8.0 indicates burnout risk
            is_burnout = perf.points_actual > 8.0
            
            metric = {
                "id": perf.id,
                "agent_id": agent.id,
                "agent_name": agent.full_name,
                "date": perf.date.isoformat() if isinstance(perf.date, date) else str(perf.date),
                "tickets_processed": perf.tickets_actual,
                "tickets_actual": perf.tickets_actual,  # Alias for compatibility
                "ticket_goal": perf.tickets_goal,
                "tickets_goal": perf.tickets_goal,  # Alias for compatibility
                "squadlinx_points": perf.points_actual,
                "points_actual": perf.points_actual,  # Alias for compatibility
                "squadlinx_goal": perf.points_goal,
                "points_goal": perf.points_goal,  # Alias for compatibility
                "is_burnout": is_burnout
            }
            metrics.append(metric)
        
        logger.info(f"Retrieved {len(metrics)} metrics")
        return metrics
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving metrics: {str(e)}"
        )

