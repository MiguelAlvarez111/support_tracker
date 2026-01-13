"""
SQLAlchemy models for the support tracker application.
"""
from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import date, datetime
from database import Base


class Team(Base):
    """
    Model representing a team of support agents.
    """
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    agents = relationship("Agent", back_populates="team", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Team(id={self.id}, name='{self.name}', created_at={self.created_at})>"


class Agent(Base):
    """
    Model representing a support agent.
    """
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    full_name = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False, default="Agent", index=True)  # 'Agent' or 'Leader'
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Relationships
    team = relationship("Team", back_populates="agents")
    daily_performances = relationship("DailyPerformance", back_populates="agent", cascade="all, delete-orphan")

    def __repr__(self):
        return (
            f"<Agent(id={self.id}, team_id={self.team_id}, full_name='{self.full_name}', "
            f"role='{self.role}', is_active={self.is_active})>"
        )


class DailyPerformance(Base):
    """
    Model representing daily performance metrics for support agents.
    
    Each record represents a single day's performance for an agent,
    including tickets processed, goals, and squadlinx points.
    """
    __tablename__ = "daily_performances"
    
    # Unique constraint to prevent duplicate records for same agent and date
    __table_args__ = (
        UniqueConstraint('agent_id', 'date', name='uq_agent_date'),
    )

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    tickets_actual = Column(Integer, nullable=False)
    tickets_goal = Column(Integer, nullable=False)
    points_actual = Column(Float, nullable=False)
    points_goal = Column(Float, nullable=False)

    # Relationships
    agent = relationship("Agent", back_populates="daily_performances")

    def __repr__(self):
        return (
            f"<DailyPerformance(id={self.id}, agent_id={self.agent_id}, "
            f"date={self.date}, tickets_actual={self.tickets_actual}, "
            f"tickets_goal={self.tickets_goal}, points_actual={self.points_actual}, "
            f"points_goal={self.points_goal})>"
        )

