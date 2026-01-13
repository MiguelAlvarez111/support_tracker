"""
CRUD endpoints for DailyPerformance management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import DailyPerformance, Agent
from schemas import DailyPerformanceCreate, DailyPerformanceBulkCreate, DailyPerformanceResponse

router = APIRouter(prefix="/api/performances", tags=["Performances"])


@router.post(
    "/bulk",
    response_model=List[DailyPerformanceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create/update daily performances"
)
async def bulk_create_performances(
    bulk_data: DailyPerformanceBulkCreate,
    db: Session = Depends(get_db)
):
    """
    Create or update multiple daily performances in bulk.
    
    If a performance with the same (agent_id, date) exists, it will be updated.
    Otherwise, a new record will be created.
    """
    result_performances = []
    
    for perf_data in bulk_data.performances:
        # Verify agent exists
        agent = db.query(Agent).filter(Agent.id == perf_data.agent_id).first()
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent with id {perf_data.agent_id} not found"
            )
        
        # Check if performance exists
        existing_perf = db.query(DailyPerformance).filter(
            DailyPerformance.agent_id == perf_data.agent_id,
            DailyPerformance.date == perf_data.date
        ).first()
        
        if existing_perf:
            # Update existing performance
            existing_perf.tickets_actual = perf_data.tickets_actual
            existing_perf.tickets_goal = perf_data.tickets_goal
            existing_perf.points_actual = perf_data.points_actual
            existing_perf.points_goal = perf_data.points_goal
            result_performances.append(existing_perf)
        else:
            # Create new performance
            new_perf = DailyPerformance(**perf_data.model_dump())
            db.add(new_perf)
            result_performances.append(new_perf)
    
    db.commit()
    
    # Refresh all performances to get IDs
    for perf in result_performances:
        db.refresh(perf)
    
    return result_performances

