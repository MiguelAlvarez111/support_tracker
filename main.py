"""
FastAPI application for Support Tracker.
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db, init_db
from models import Team, Agent, DailyPerformance
from schemas import (
    DailyPerformanceResponse,
    RawDataUpload
)
from services.parser import parse_raw_text
from routers import teams, agents, performances

# Initialize FastAPI app
app = FastAPI(
    title="Support Tracker API",
    description="API para seguimiento de tickets de soporte y métricas diarias",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure according to your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(teams.router)
app.include_router(agents.router)
app.include_router(performances.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup."""
    init_db()


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint."""
    return {
        "message": "Support Tracker API",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post(
    "/upload-raw-data",
    response_model=List[DailyPerformanceResponse],
    status_code=status.HTTP_200_OK,
    tags=["Upload"]
)
async def upload_raw_data(
    upload_data: RawDataUpload,
    db: Session = Depends(get_db)
):
    """
    Upload raw text data copied from Excel and parse it into DailyPerformance records.
    
    Expected format:
    WIEDER 1 ene. 2 ene.
    T. P M. A D.M T. P M. A D.M
    M. ALVAREZ 0 0 0 401 400 1
    J. ROMERO 0 0 0 200 200 0
    
    The endpoint will:
    - Require a team_id
    - Parse the raw text to extract agent excel_aliases, dates, tickets_actual, and tickets_goal
    - Lookup agents by excel_alias within the specified team
    - If any agents are not found, return an error with the list of missing excel_aliases
    - For each (agent_id, date) combination, update if exists, create if new (upsert)
    - Return all processed performance records
    
    Note: points_actual and points_goal are set to default values (0.0 and 8.0)
    as they are not present in the raw data format.
    """
    try:
        # Verify team exists
        team = db.query(Team).filter(Team.id == upload_data.team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team with id {upload_data.team_id} not found"
            )
        
        # Parse raw text into ParsedPerformance objects
        parsed_performances = parse_raw_text(
            raw_text=upload_data.raw_data,
            base_year=upload_data.base_year
        )
        
        if not parsed_performances:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid performance data could be parsed from the raw data"
            )
        
        # Collect unique excel_aliases from parsed data
        unique_excel_aliases = set(perf.excel_alias for perf in parsed_performances)
        
        # Lookup all agents by excel_alias in the specified team
        agents_by_alias = {
            agent.excel_alias: agent
            for agent in db.query(Agent).filter(
                Agent.team_id == upload_data.team_id,
                Agent.excel_alias.in_(unique_excel_aliases)
            ).all()
        }
        
        # Check for missing agents
        missing_aliases = unique_excel_aliases - set(agents_by_alias.keys())
        if missing_aliases:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The following agents were not found in team {team.name} (team_id: {upload_data.team_id}): {', '.join(sorted(missing_aliases))}. Please create these agents first."
            )
        
        # Apply global date and goals if provided
        # Group performances by agent_id and date for upsert
        performances_by_key = {}
        for perf in parsed_performances:
            agent = agents_by_alias[perf.excel_alias]
            # Use provided date or parsed date
            perf_date = upload_data.date if upload_data.date else perf.date
            # Use global goals if provided, otherwise use parsed values
            perf_tickets_goal = upload_data.tickets_goal if upload_data.tickets_goal is not None else perf.tickets_goal
            perf_points_goal = upload_data.points_goal if upload_data.points_goal is not None else perf.points_goal
            
            key = (agent.id, perf_date)
            if key not in performances_by_key:
                # Create a new performance with updated values
                performances_by_key[key] = {
                    'agent_id': agent.id,
                    'date': perf_date,
                    'tickets_actual': perf.tickets_actual,
                    'tickets_goal': perf_tickets_goal,
                    'points_actual': perf.points_actual,
                    'points_goal': perf_points_goal
                }
        
        # Upsert performances (update if exists, create if new)
        result_performances = []
        for key, perf_data in performances_by_key.items():
            agent_id, perf_date = key
            
            # Check if performance exists
            existing_perf = db.query(DailyPerformance).filter(
                DailyPerformance.agent_id == agent_id,
                DailyPerformance.date == perf_date
            ).first()
            
            if existing_perf:
                # Update existing performance
                existing_perf.tickets_actual = perf_data['tickets_actual']
                existing_perf.tickets_goal = perf_data['tickets_goal']
                existing_perf.points_actual = perf_data['points_actual']
                existing_perf.points_goal = perf_data['points_goal']
                result_performances.append(existing_perf)
            else:
                # Create new performance
                new_perf = DailyPerformance(
                    agent_id=agent_id,
                    date=perf_date,
                    tickets_actual=perf_data['tickets_actual'],
                    tickets_goal=perf_data['tickets_goal'],
                    points_actual=perf_data['points_actual'],
                    points_goal=perf_data['points_goal']
                )
                db.add(new_perf)
                result_performances.append(new_perf)
        
        db.commit()
        
        # Refresh all performances to get IDs
        for perf in result_performances:
            db.refresh(perf)
        
        return result_performances
    
    except HTTPException:
        raise
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
