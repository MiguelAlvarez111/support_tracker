"""
CRUD endpoints for Agent management.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Agent, Team
from schemas import AgentCreate, AgentUpdate, AgentResponse, AgentWithTeam

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agents", tags=["Agents"])


@router.post(
    "/",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new agent"
)
async def create_agent(
    agent: AgentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new agent within a team.
    
    - **team_id**: ID of the team this agent belongs to
    - **full_name**: Full name of the agent
    - **role**: Role of the agent (Agent/Leader)
    - **is_active**: Whether the agent is currently active (default: True)
    """
    logger.info(f"Creating agent: team_id={agent.team_id}, full_name='{agent.full_name}', role='{agent.role}'")
    # Verify team exists
    team = db.query(Team).filter(Team.id == agent.team_id).first()
    if not team:
        logger.warning(f"Team not found for agent creation: team_id={agent.team_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {agent.team_id} not found"
        )
    
    try:
        db_agent = Agent(**agent.model_dump())
        db.add(db_agent)
        db.commit()
        db.refresh(db_agent)
        logger.info(f"Agent created successfully: id={db_agent.id}, full_name='{db_agent.full_name}', role='{db_agent.role}'")
        return db_agent
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating agent: {str(e)}"
        )


@router.get(
    "/",
    response_model=List[AgentResponse],
    summary="Get all agents"
)
async def get_agents(
    skip: int = 0,
    limit: int = 100,
    team_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Get all agents with optional filters.
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **team_id**: Filter by team ID
    - **is_active**: Filter by active status
    """
    logger.debug(f"Getting agents: skip={skip}, limit={limit}, team_id={team_id}, is_active={is_active}")
    try:
        query = db.query(Agent)
        
        if team_id is not None:
            query = query.filter(Agent.team_id == team_id)
        
        if is_active is not None:
            query = query.filter(Agent.is_active == is_active)
        
        agents = query.order_by(Agent.full_name).offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(agents)} agents")
        return agents
    except Exception as e:
        logger.error(f"Error getting agents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving agents: {str(e)}"
        )


@router.get(
    "/{agent_id}",
    response_model=AgentWithTeam,
    summary="Get an agent by ID"
)
async def get_agent(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific agent by ID with team information."""
    logger.debug(f"Getting agent: id={agent_id}")
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not agent:
        logger.warning(f"Agent not found: id={agent_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found"
        )
    
    logger.info(f"Agent retrieved: id={agent.id}, full_name='{agent.full_name}', team_id={agent.team_id}")
    return agent


@router.put(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Update an agent"
)
async def update_agent(
    agent_id: int,
    agent_update: AgentUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing agent.
    
    Only provided fields will be updated.
    """
    logger.info(f"Updating agent: id={agent_id}, update_data={agent_update.model_dump(exclude_unset=True)}")
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not db_agent:
        logger.warning(f"Agent not found for update: id={agent_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found"
        )
    
    try:
        # Verify team exists if team_id is being updated
        if agent_update.team_id is not None:
            team = db.query(Team).filter(Team.id == agent_update.team_id).first()
            if not team:
                logger.warning(f"Team not found for agent update: team_id={agent_update.team_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Team with id {agent_update.team_id} not found"
                )
        
        # Update only provided fields
        update_data = agent_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_agent, key, value)
        
        db.commit()
        db.refresh(db_agent)
        logger.info(f"Agent updated successfully: id={db_agent.id}, full_name='{db_agent.full_name}'")
        return db_agent
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating agent: {str(e)}"
        )


@router.delete(
    "/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an agent"
)
async def delete_agent(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete an agent by ID.
    
    This will also delete all associated performance records
    due to cascade delete.
    """
    logger.info(f"Deleting agent: id={agent_id}")
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not db_agent:
        logger.warning(f"Agent not found for deletion: id={agent_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found"
        )
    
    try:
        agent_name = db_agent.full_name
        db.delete(db_agent)
        db.commit()
        logger.info(f"Agent deleted successfully: id={agent_id}, full_name='{agent_name}'")
        return None
    except Exception as e:
        logger.error(f"Error deleting agent: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting agent: {str(e)}"
        )
