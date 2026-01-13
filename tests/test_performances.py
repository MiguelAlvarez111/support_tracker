"""
Tests for performances router.
"""
import pytest
from fastapi import status
from datetime import date


def test_bulk_create_performances(client, sample_team_data, sample_agent_data):
    """Test bulk creating performances."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Create performances
    performances_data = {
        "performances": [
            {
                "agent_id": agent_id,
                "date": date.today().isoformat(),
                "tickets_actual": 25,
                "tickets_goal": 30,
                "points_actual": 8.5,
                "points_goal": 8.0
            }
        ]
    }
    
    response = client.post("/api/performances/bulk", json=performances_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert len(data) == 1
    assert data[0]["agent_id"] == agent_id
    assert data[0]["tickets_actual"] == 25
    assert data[0]["tickets_goal"] == 30


def test_bulk_create_performances_agent_not_found(client):
    """Test bulk creating performances with non-existent agent fails."""
    performances_data = {
        "performances": [
            {
                "agent_id": 999,
                "date": date.today().isoformat(),
                "tickets_actual": 25,
                "tickets_goal": 30,
                "points_actual": 8.5,
                "points_goal": 8.0
            }
        ]
    }
    
    response = client.post("/api/performances/bulk", json=performances_data)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_bulk_create_performances_update_existing(client, sample_team_data, sample_agent_data):
    """Test bulk create updates existing performance."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    perf_date = date.today().isoformat()
    
    # Create first performance
    performances_data = {
        "performances": [
            {
                "agent_id": agent_id,
                "date": perf_date,
                "tickets_actual": 25,
                "tickets_goal": 30,
                "points_actual": 8.5,
                "points_goal": 8.0
            }
        ]
    }
    client.post("/api/performances/bulk", json=performances_data)
    
    # Update same performance
    performances_data["performances"][0]["tickets_actual"] = 35
    response = client.post("/api/performances/bulk", json=performances_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data[0]["tickets_actual"] == 35

