"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional


class DailyMetricBase(BaseModel):
    """Base schema with common fields for DailyMetric."""
    agent_name: str = Field(..., description="Name of the agent (e.g., 'M. ALVAREZ')")
    date: date = Field(..., description="Date of the metric record")
    tickets_processed: int = Field(..., ge=0, description="Number of tickets processed")
    ticket_goal: int = Field(..., ge=0, description="Goal for tickets processed that day")
    squadlinx_points: float = Field(..., ge=0.0, description="Squadlinx points registered")
    squadlinx_goal: float = Field(..., ge=0.0, description="Goal for squadlinx points (usually 8.0 or 9.0)")

    @field_validator('agent_name')
    @classmethod
    def validate_agent_name(cls, v):
        """Validate agent name is not empty."""
        if not v or not v.strip():
            raise ValueError('Agent name cannot be empty')
        return v.strip().upper()


class DailyMetricCreate(DailyMetricBase):
    """Schema for creating a new DailyMetric."""
    pass


class DailyMetricUpdate(BaseModel):
    """Schema for updating an existing DailyMetric."""
    agent_name: Optional[str] = Field(None, description="Name of the agent")
    date: Optional[date] = Field(None, description="Date of the metric record")
    tickets_processed: Optional[int] = Field(None, ge=0, description="Number of tickets processed")
    ticket_goal: Optional[int] = Field(None, ge=0, description="Goal for tickets processed")
    squadlinx_points: Optional[float] = Field(None, ge=0.0, description="Squadlinx points registered")
    squadlinx_goal: Optional[float] = Field(None, ge=0.0, description="Goal for squadlinx points")

    @field_validator('agent_name')
    @classmethod
    def validate_agent_name(cls, v):
        """Validate agent name if provided."""
        if v is not None:
            if not v.strip():
                raise ValueError('Agent name cannot be empty')
            return v.strip().upper()
        return v


class DailyMetricResponse(DailyMetricBase):
    """Schema for DailyMetric response."""
    id: int = Field(..., description="Unique identifier")
    is_burnout: bool = Field(..., description="Whether agent is in burnout state (points > goal + 0.5)")

    class Config:
        from_attributes = True


class DailyMetricBulkCreate(BaseModel):
    """Schema for bulk creating multiple DailyMetrics."""
    metrics: list[DailyMetricCreate] = Field(..., min_length=1, description="List of metrics to create")


class RawDataUpload(BaseModel):
    """Schema for uploading raw text data from Excel."""
    raw_data: str = Field(..., description="Raw text data copied from Excel")
    base_year: Optional[int] = Field(None, description="Base year for dates (defaults to current year)")

