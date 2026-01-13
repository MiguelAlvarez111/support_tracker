"""
Tests for metrics router.
"""
import pytest
from fastapi import status
from datetime import date


def test_get_metrics_empty(client):
    """Test getting metrics when none exist."""
    response = client.get("/api/metrics")
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_get_metrics(client, sample_team_data, sample_agent_data):
    """Test getting metrics."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Create performance
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
    client.post("/api/performances/bulk", json=performances_data)
    
    # Get metrics
    response = client.get("/api/metrics")
    
    assert response.status_code == status.HTTP_200_OK
    metrics = response.json()
    assert len(metrics) == 1
    assert "agent_name" in metrics[0]
    assert "tickets_processed" in metrics[0]
    assert "ticket_goal" in metrics[0]
    assert "squadlinx_points" in metrics[0]
    assert "is_burnout" in metrics[0]
    assert metrics[0]["agent_name"] == sample_agent_data["full_name"]


def test_get_metrics_with_limit(client, sample_team_data, sample_agent_data):
    """Test getting metrics with limit parameter."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Create performance
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
    client.post("/api/performances/bulk", json=performances_data)
    
    # Get metrics with limit
    response = client.get("/api/metrics", params={"limit": 500})
    
    assert response.status_code == status.HTTP_200_OK
    metrics = response.json()
    assert len(metrics) <= 500


def test_get_metrics_burnout_flag(client, sample_team_data, sample_agent_data):
    """Test that is_burnout flag is set correctly."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Create performance with burnout (points_actual > 8.0)
    performances_data = {
        "performances": [
            {
                "agent_id": agent_id,
                "date": date.today().isoformat(),
                "tickets_actual": 25,
                "tickets_goal": 30,
                "points_actual": 9.5,  # > 8.0, should be burnout
                "points_goal": 8.0
            }
        ]
    }
    client.post("/api/performances/bulk", json=performances_data)
    
    # Get metrics
    response = client.get("/api/metrics")
    
    assert response.status_code == status.HTTP_200_OK
    metrics = response.json()
    assert len(metrics) == 1
    assert metrics[0]["is_burnout"] is True
    assert metrics[0]["squadlinx_points"] == 9.5

