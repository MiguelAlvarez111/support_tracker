"""
CRUD endpoints for DailyPerformance management.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import DailyPerformance, Agent
from schemas import DailyPerformanceCreate, DailyPerformanceBulkCreate, DailyPerformanceResponse

logger = logging.getLogger(__name__)
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
    logger.info(f"Bulk create/update performances: count={len(bulk_data.performances)}")
    result_performances = []
    created_count = 0
    updated_count = 0
    
    try:
        for perf_data in bulk_data.performances:
            # Verify agent exists
            agent = db.query(Agent).filter(Agent.id == perf_data.agent_id).first()
            if not agent:
                logger.warning(f"Agent not found for performance: agent_id={perf_data.agent_id}")
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
                logger.debug(f"Updating performance: agent_id={perf_data.agent_id}, date={perf_data.date}")
                existing_perf.tickets_actual = perf_data.tickets_actual
                existing_perf.tickets_goal = perf_data.tickets_goal
                existing_perf.points_actual = perf_data.points_actual
                existing_perf.points_goal = perf_data.points_goal
                result_performances.append(existing_perf)
                updated_count += 1
            else:
                # Create new performance
                logger.debug(f"Creating performance: agent_id={perf_data.agent_id}, date={perf_data.date}")
                new_perf = DailyPerformance(**perf_data.model_dump())
                db.add(new_perf)
                result_performances.append(new_perf)
                created_count += 1
        
        logger.info(f"Committing {len(result_performances)} performances (created: {created_count}, updated: {updated_count})")
        db.commit()
        
        # Refresh all performances to get IDs
        for perf in result_performances:
            db.refresh(perf)
        
        logger.info(f"Bulk create/update completed successfully: {len(result_performances)} records")
        return result_performances
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk_create_performances: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing bulk performances: {str(e)}"
        )


@router.delete("/{performance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_performance(
    performance_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific daily performance record by ID.
    """
    perf = db.query(DailyPerformance).filter(DailyPerformance.id == performance_id).first()
    if not perf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Performance with id {performance_id} not found"
        )
    
    db.delete(perf)
    db.commit()
    logger.info(f"Deleted performance {performance_id}")
    return None

