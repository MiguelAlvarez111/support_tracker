"""
CRUD endpoints for Agent management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Agent, Team
from schemas import AgentCreate, AgentUpdate, AgentResponse, AgentWithTeam

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
    - **excel_alias**: Alias used in Excel files (e.g., 'M. ALVAREZ')
    - **is_active**: Whether the agent is currently active (default: True)
    """
    # Verify team exists
    team = db.query(Team).filter(Team.id == agent.team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {agent.team_id} not found"
        )
    
    # Check if agent with same excel_alias in the same team already exists
    existing_agent = db.query(Agent).filter(
        Agent.team_id == agent.team_id,
        Agent.excel_alias == agent.excel_alias
    ).first()
    if existing_agent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent with excel_alias '{agent.excel_alias}' already exists in this team"
        )
    
    db_agent = Agent(**agent.model_dump())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    
    return db_agent


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
    query = db.query(Agent)
    
    if team_id is not None:
        query = query.filter(Agent.team_id == team_id)
    
    if is_active is not None:
        query = query.filter(Agent.is_active == is_active)
    
    agents = query.order_by(Agent.full_name).offset(skip).limit(limit).all()
    return agents


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
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found"
        )
    
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
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not db_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found"
        )
    
    # Verify team exists if team_id is being updated
    if agent_update.team_id is not None:
        team = db.query(Team).filter(Team.id == agent_update.team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team with id {agent_update.team_id} not found"
            )
        
        # Check if excel_alias conflicts with another agent in the new team
        if agent_update.excel_alias is None:
            excel_alias = db_agent.excel_alias
        else:
            excel_alias = agent_update.excel_alias
        
        existing_agent = db.query(Agent).filter(
            Agent.team_id == agent_update.team_id,
            Agent.excel_alias == excel_alias,
            Agent.id != agent_id
        ).first()
        if existing_agent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent with excel_alias '{excel_alias}' already exists in this team"
            )
    
    # Check excel_alias conflict in current team if only excel_alias is being updated
    if agent_update.excel_alias is not None and agent_update.team_id is None:
        existing_agent = db.query(Agent).filter(
            Agent.team_id == db_agent.team_id,
            Agent.excel_alias == agent_update.excel_alias,
            Agent.id != agent_id
        ).first()
        if existing_agent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent with excel_alias '{agent_update.excel_alias}' already exists in this team"
            )
    
    # Update only provided fields
    update_data = agent_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_agent, key, value)
    
    db.commit()
    db.refresh(db_agent)
    
    return db_agent


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
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not db_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found"
        )
    
    db.delete(db_agent)
    db.commit()
    
    return None

