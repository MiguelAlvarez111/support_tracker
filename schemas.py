"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field, field_validator
from datetime import date as date_type, datetime
from typing import Optional, List


# Team Schemas
class TeamBase(BaseModel):
    """Base schema with common fields for Team."""
    name: str = Field(..., description="Name of the team")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate team name is not empty."""
        if not v or not v.strip():
            raise ValueError('Team name cannot be empty')
        return v.strip()


class TeamCreate(TeamBase):
    """Schema for creating a new Team."""
    pass


class TeamUpdate(BaseModel):
    """Schema for updating an existing Team."""
    name: Optional[str] = Field(None, description="Name of the team")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate team name if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Team name cannot be empty')
            return v.strip()
        return v


class TeamResponse(TeamBase):
    """Schema for Team response."""
    id: int = Field(..., description="Unique identifier")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True


# Agent Schemas
class AgentBase(BaseModel):
    """Base schema with common fields for Agent."""
    full_name: str = Field(..., description="Full name of the agent")
    excel_alias: str = Field(..., description="Alias used in Excel files (e.g., 'M. ALVAREZ')")
    is_active: bool = Field(True, description="Whether the agent is currently active")

    @field_validator('full_name', 'excel_alias')
    @classmethod
    def validate_non_empty(cls, v):
        """Validate field is not empty."""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

    @field_validator('excel_alias')
    @classmethod
    def validate_excel_alias(cls, v):
        """Validate and normalize excel_alias."""
        return v.strip().upper()


class AgentCreate(AgentBase):
    """Schema for creating a new Agent."""
    team_id: int = Field(..., description="ID of the team this agent belongs to")


class AgentUpdate(BaseModel):
    """Schema for updating an existing Agent."""
    team_id: Optional[int] = Field(None, description="ID of the team")
    full_name: Optional[str] = Field(None, description="Full name of the agent")
    excel_alias: Optional[str] = Field(None, description="Alias used in Excel files")
    is_active: Optional[bool] = Field(None, description="Whether the agent is currently active")

    @field_validator('full_name', 'excel_alias')
    @classmethod
    def validate_non_empty(cls, v):
        """Validate field if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Field cannot be empty')
            return v.strip()
        return v

    @field_validator('excel_alias')
    @classmethod
    def validate_excel_alias(cls, v):
        """Validate and normalize excel_alias if provided."""
        if v is not None:
            return v.strip().upper()
        return v


class AgentResponse(AgentBase):
    """Schema for Agent response."""
    id: int = Field(..., description="Unique identifier")
    team_id: int = Field(..., description="ID of the team")

    class Config:
        from_attributes = True


# DailyPerformance Schemas
class DailyPerformanceBase(BaseModel):
    """Base schema with common fields for DailyPerformance."""
    date: date_type = Field(..., description="Date of the performance record")
    tickets_actual: int = Field(..., ge=0, description="Actual number of tickets processed")
    tickets_goal: int = Field(..., ge=0, description="Goal for tickets processed that day")
    points_actual: float = Field(..., ge=0.0, description="Actual squadlinx points registered")
    points_goal: float = Field(..., ge=0.0, description="Goal for squadlinx points")


class DailyPerformanceCreate(DailyPerformanceBase):
    """Schema for creating a new DailyPerformance."""
    agent_id: int = Field(..., description="ID of the agent")


class DailyPerformanceUpdate(BaseModel):
    """Schema for updating an existing DailyPerformance."""
    agent_id: Optional[int] = Field(None, description="ID of the agent")
    date: Optional[date_type] = Field(None, description="Date of the performance record")
    tickets_actual: Optional[int] = Field(None, ge=0, description="Actual number of tickets processed")
    tickets_goal: Optional[int] = Field(None, ge=0, description="Goal for tickets processed")
    points_actual: Optional[float] = Field(None, ge=0.0, description="Actual squadlinx points")
    points_goal: Optional[float] = Field(None, ge=0.0, description="Goal for squadlinx points")


class DailyPerformanceResponse(DailyPerformanceBase):
    """Schema for DailyPerformance response."""
    id: int = Field(..., description="Unique identifier")
    agent_id: int = Field(..., description="ID of the agent")

    class Config:
        from_attributes = True


# Response schemas with relationships
class AgentWithTeam(AgentResponse):
    """Agent response including team information."""
    team: Optional[TeamResponse] = None

    class Config:
        from_attributes = True


class DailyPerformanceWithAgent(DailyPerformanceResponse):
    """DailyPerformance response including agent information."""
    agent: Optional[AgentResponse] = None

    class Config:
        from_attributes = True


class TeamWithAgents(TeamResponse):
    """Team response including agents."""
    agents: List[AgentResponse] = []

    class Config:
        from_attributes = True


# Bulk operations
class DailyPerformanceBulkCreate(BaseModel):
    """Schema for bulk creating multiple DailyPerformances."""
    performances: List[DailyPerformanceCreate] = Field(..., min_length=1, description="List of performances to create")


# Raw data upload schema (updated to require team_id)
class RawDataUpload(BaseModel):
    """Schema for uploading raw text data from Excel."""
    raw_data: str = Field(..., description="Raw text data copied from Excel")
    team_id: int = Field(..., description="ID of the team for these metrics")
    date: Optional[date_type] = Field(None, description="Date for the report (overrides dates in Excel)")
    tickets_goal: Optional[int] = Field(None, ge=0, description="Global goal for tickets (applied to all agents)")
    points_goal: Optional[float] = Field(None, ge=0.0, description="Global goal for squadlinx points (applied to all agents)")
    base_year: Optional[int] = Field(None, description="Base year for dates (defaults to current year)")
