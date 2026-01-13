"""
CRUD endpoints for Team management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Team
from schemas import TeamCreate, TeamUpdate, TeamResponse, TeamWithAgents

router = APIRouter(prefix="/api/teams", tags=["Teams"])


@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team"
)
async def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new team.
    
    - **name**: Name of the team (must be unique)
    """
    # Check if team with same name already exists
    existing_team = db.query(Team).filter(Team.name == team.name).first()
    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team with name '{team.name}' already exists"
        )
    
    db_team = Team(**team.model_dump())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    
    return db_team


@router.get(
    "/",
    response_model=List[TeamResponse],
    summary="Get all teams"
)
async def get_teams(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all teams with optional pagination.
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    """
    teams = db.query(Team).order_by(Team.name).offset(skip).limit(limit).all()
    return teams


@router.get(
    "/{team_id}",
    response_model=TeamWithAgents,
    summary="Get a team by ID"
)
async def get_team(
    team_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific team by ID with its agents."""
    team = db.query(Team).filter(Team.id == team_id).first()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found"
        )
    
    return team


@router.put(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Update a team"
)
async def update_team(
    team_id: int,
    team_update: TeamUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing team.
    
    Only provided fields will be updated.
    """
    db_team = db.query(Team).filter(Team.id == team_id).first()
    
    if not db_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found"
        )
    
    # Check if new name conflicts with existing team
    if team_update.name is not None:
        existing_team = db.query(Team).filter(
            Team.name == team_update.name,
            Team.id != team_id
        ).first()
        if existing_team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team with name '{team_update.name}' already exists"
            )
    
    # Update only provided fields
    update_data = team_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_team, key, value)
    
    db.commit()
    db.refresh(db_team)
    
    return db_team


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team"
)
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a team by ID.
    
    This will also delete all associated agents and their performance records
    due to cascade delete.
    """
    db_team = db.query(Team).filter(Team.id == team_id).first()
    
    if not db_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found"
        )
    
    db.delete(db_team)
    db.commit()
    
    return None

