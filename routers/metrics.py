"""
Endpoints for metrics and aggregated data.
"""
import logging
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta

from database import get_db
from models import DailyPerformance, Agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

# Burnout threshold: 88 hours per sprint (accumulated)
BURNOUT_THRESHOLD_HOURS = 88.0


@router.get(
    "/",
    summary="Get historical metrics"
)
async def get_metrics(
    limit: int = Query(1000, ge=1, le=10000, description="Maximum number of records to return"),
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    sprint_days: int = Query(10, ge=1, le=30, description="Number of days to calculate sprint burnout"),
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
    - is_burnout: Whether agent exceeded burnout threshold (88h accumulated in sprint)
    - accumulated_hours: Total hours accumulated in sprint period
    """
    logger.info(f"Getting metrics: limit={limit}, team_id={team_id}, sprint_days={sprint_days}")
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
        
        # Calculate sprint burnout based on accumulated hours over sprint_days
        today = date.today()
        sprint_start = today - timedelta(days=sprint_days)
        
        # Build agent accumulated hours map for the sprint period
        agent_accumulated_hours = {}
        for perf, agent in results:
            perf_date = perf.date if isinstance(perf.date, date) else datetime.strptime(str(perf.date), '%Y-%m-%d').date()
            if perf_date >= sprint_start:
                if agent.id not in agent_accumulated_hours:
                    agent_accumulated_hours[agent.id] = 0.0
                agent_accumulated_hours[agent.id] += perf.points_actual
        
        # Transform to frontend format
        metrics = []
        for perf, agent in results:
            # Burnout is based on accumulated sprint hours > 88
            accumulated = agent_accumulated_hours.get(agent.id, 0.0)
            is_burnout = accumulated > BURNOUT_THRESHOLD_HOURS
            
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
                "is_burnout": is_burnout,
                "accumulated_hours": accumulated  # Total hours in sprint period
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

