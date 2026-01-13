"""
CRUD endpoints for Team management.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Team
from schemas import TeamCreate, TeamUpdate, TeamResponse, TeamWithAgents

logger = logging.getLogger(__name__)
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
    logger.info(f"Creating team: name='{team.name}'")
    # Check if team with same name already exists
    existing_team = db.query(Team).filter(Team.name == team.name).first()
    if existing_team:
        logger.warning(f"Team with name '{team.name}' already exists (id: {existing_team.id})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team with name '{team.name}' already exists"
        )
    
    try:
        db_team = Team(**team.model_dump())
        db.add(db_team)
        db.commit()
        db.refresh(db_team)
        logger.info(f"Team created successfully: id={db_team.id}, name='{db_team.name}'")
        return db_team
    except Exception as e:
        logger.error(f"Error creating team: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating team: {str(e)}"
        )


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
    logger.debug(f"Getting teams: skip={skip}, limit={limit}")
    try:
        teams = db.query(Team).order_by(Team.name).offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(teams)} teams")
        return teams
    except Exception as e:
        logger.error(f"Error getting teams: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving teams: {str(e)}"
        )


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
    logger.debug(f"Getting team: id={team_id}")
    team = db.query(Team).filter(Team.id == team_id).first()
    
    if not team:
        logger.warning(f"Team not found: id={team_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found"
        )
    
    logger.info(f"Team retrieved: id={team.id}, name='{team.name}', agents_count={len(team.agents)}")
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
    logger.info(f"Updating team: id={team_id}, update_data={team_update.model_dump(exclude_unset=True)}")
    db_team = db.query(Team).filter(Team.id == team_id).first()
    
    if not db_team:
        logger.warning(f"Team not found for update: id={team_id}")
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
            logger.warning(f"Team name conflict: '{team_update.name}' already exists (id: {existing_team.id})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team with name '{team_update.name}' already exists"
            )
    
    try:
        # Update only provided fields
        update_data = team_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_team, key, value)
        
        db.commit()
        db.refresh(db_team)
        logger.info(f"Team updated successfully: id={db_team.id}, name='{db_team.name}'")
        return db_team
    except Exception as e:
        logger.error(f"Error updating team: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating team: {str(e)}"
        )


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
    logger.info(f"Deleting team: id={team_id}")
    db_team = db.query(Team).filter(Team.id == team_id).first()
    
    if not db_team:
        logger.warning(f"Team not found for deletion: id={team_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with id {team_id} not found"
        )
    
    try:
        team_name = db_team.name
        agents_count = len(db_team.agents) if hasattr(db_team, 'agents') else 0
        db.delete(db_team)
        db.commit()
        logger.info(f"Team deleted successfully: id={team_id}, name='{team_name}', agents_count={agents_count}")
        return None
    except Exception as e:
        logger.error(f"Error deleting team: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting team: {str(e)}"
        )

