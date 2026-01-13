"""
Tests for agents router.
"""
import pytest
from fastapi import status


def test_create_agent(client, sample_team_data, sample_agent_data):
    """Test creating an agent."""
    # Create team first
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    # Create agent
    agent_data = {**sample_agent_data, "team_id": team_id}
    response = client.post("/api/agents", json=agent_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["full_name"] == agent_data["full_name"]
    assert data["excel_alias"] == agent_data["excel_alias"]
    assert data["team_id"] == team_id
    assert "id" in data


def test_create_agent_team_not_found(client, sample_agent_data):
    """Test creating agent with non-existent team fails."""
    agent_data = {**sample_agent_data, "team_id": 999}
    response = client.post("/api/agents", json=agent_data)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_create_agent_duplicate_alias(client, sample_team_data, sample_agent_data):
    """Test creating agent with duplicate excel_alias fails."""
    # Create team
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    # Create first agent
    agent_data = {**sample_agent_data, "team_id": team_id}
    client.post("/api/agents", json=agent_data)
    
    # Try to create duplicate
    response = client.post("/api/agents", json=agent_data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


def test_get_agents(client, sample_team_data):
    """Test getting agents."""
    response = client.get("/api/agents")
    
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)


def test_get_agents_by_team(client, sample_team_data, sample_agent_data):
    """Test getting agents filtered by team."""
    # Create team
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    # Create agent
    agent_data = {**sample_agent_data, "team_id": team_id}
    client.post("/api/agents", json=agent_data)
    
    # Get agents by team
    response = client.get("/api/agents", params={"team_id": team_id})
    
    assert response.status_code == status.HTTP_200_OK
    agents = response.json()
    assert len(agents) == 1
    assert agents[0]["team_id"] == team_id


def test_get_agent_by_id(client, sample_team_data, sample_agent_data):
    """Test getting an agent by ID."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Get agent by ID
    response = client.get(f"/api/agents/{agent_id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == agent_id
    assert "team" in data


def test_update_agent(client, sample_team_data, sample_agent_data):
    """Test updating an agent."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Update agent
    update_data = {"full_name": "Updated Name"}
    response = client.put(f"/api/agents/{agent_id}", json=update_data)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == update_data["full_name"]


def test_delete_agent(client, sample_team_data, sample_agent_data):
    """Test deleting an agent."""
    # Create team and agent
    team_response = client.post("/api/teams", json=sample_team_data)
    team_id = team_response.json()["id"]
    
    agent_data = {**sample_agent_data, "team_id": team_id}
    agent_response = client.post("/api/agents", json=agent_data)
    agent_id = agent_response.json()["id"]
    
    # Delete agent
    response = client.delete(f"/api/agents/{agent_id}")
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify agent is deleted
    get_response = client.get(f"/api/agents/{agent_id}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND

