"""
Pytest configuration and shared fixtures.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set testing environment variable before importing main
os.environ["TESTING"] = "1"

from database import Base, get_db
from main import app

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with a database session override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_team_data():
    """Sample team data for testing."""
    return {"name": "Test Team"}


@pytest.fixture
def sample_agent_data():
    """Sample agent data for testing."""
    return {
        "team_id": 1,
        "full_name": "Test Agent",
        "excel_alias": "T. AGENT",
        "is_active": True
    }


@pytest.fixture
def sample_performance_data():
    """Sample performance data for testing."""
    from datetime import date
    return {
        "agent_id": 1,
        "date": date.today().isoformat(),
        "tickets_actual": 25,
        "tickets_goal": 30,
        "points_actual": 8.5,
        "points_goal": 8.0
    }

