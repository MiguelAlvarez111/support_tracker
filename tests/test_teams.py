"""
Tests for teams router.
"""
import pytest
from fastapi import status


def test_create_team(client, sample_team_data):
    """Test creating a team."""
    response = client.post("/api/teams", json=sample_team_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == sample_team_data["name"]
    assert "id" in data
    assert "created_at" in data


def test_create_team_duplicate_name(client, sample_team_data):
    """Test creating a team with duplicate name fails."""
    # Create first team
    client.post("/api/teams", json=sample_team_data)
    
    # Try to create duplicate
    response = client.post("/api/teams", json=sample_team_data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


def test_get_teams_empty(client):
    """Test getting teams when none exist."""
    response = client.get("/api/teams")
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_get_teams(client, sample_team_data):
    """Test getting all teams."""
    # Create a team
    create_response = client.post("/api/teams", json=sample_team_data)
    team_id = create_response.json()["id"]
    
    # Get all teams
    response = client.get("/api/teams")
    
    assert response.status_code == status.HTTP_200_OK
    teams = response.json()
    assert len(teams) == 1
    assert teams[0]["id"] == team_id
    assert teams[0]["name"] == sample_team_data["name"]


def test_get_team_by_id(client, sample_team_data):
    """Test getting a team by ID."""
    # Create a team
    create_response = client.post("/api/teams", json=sample_team_data)
    team_id = create_response.json()["id"]
    
    # Get team by ID
    response = client.get(f"/api/teams/{team_id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == team_id
    assert data["name"] == sample_team_data["name"]
    assert "agents" in data


def test_get_team_not_found(client):
    """Test getting non-existent team returns 404."""
    response = client.get("/api/teams/999")
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_team(client, sample_team_data):
    """Test updating a team."""
    # Create a team
    create_response = client.post("/api/teams", json=sample_team_data)
    team_id = create_response.json()["id"]
    
    # Update the team
    update_data = {"name": "Updated Team Name"}
    response = client.put(f"/api/teams/{team_id}", json=update_data)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["id"] == team_id


def test_delete_team(client, sample_team_data):
    """Test deleting a team."""
    # Create a team
    create_response = client.post("/api/teams", json=sample_team_data)
    team_id = create_response.json()["id"]
    
    # Delete the team
    response = client.delete(f"/api/teams/{team_id}")
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify team is deleted
    get_response = client.get(f"/api/teams/{team_id}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND

