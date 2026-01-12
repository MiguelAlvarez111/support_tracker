"""
SQLAlchemy models for the support tracker application.
"""
from sqlalchemy import Column, Integer, String, Date, Float, Boolean
from datetime import date
from database import Base


class DailyMetric(Base):
    """
    Model representing daily metrics for support agents.
    
    Each record represents a single day's performance for an agent,
    including tickets processed, goals, and squadlinx points.
    """
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    tickets_processed = Column(Integer, nullable=False)
    ticket_goal = Column(Integer, nullable=False)
    squadlinx_points = Column(Float, nullable=False)
    squadlinx_goal = Column(Float, nullable=False)
    is_burnout = Column(Boolean, nullable=False, default=False, index=True)

    def __repr__(self):
        return (
            f"<DailyMetric(id={self.id}, agent_name='{self.agent_name}', "
            f"date={self.date}, tickets_processed={self.tickets_processed}, "
            f"ticket_goal={self.ticket_goal}, squadlinx_points={self.squadlinx_points}, "
            f"squadlinx_goal={self.squadlinx_goal}, is_burnout={self.is_burnout})>"
        )

    def calculate_burnout(self):
        """
        Calculate if agent is in burnout state.
        Burnout occurs when points > squadlinx_goal + 0.5
        """
        self.is_burnout = self.squadlinx_points > (self.squadlinx_goal + 0.5)
        return self.is_burnout

