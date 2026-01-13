"""
Tests for the parser service.
"""
import pytest
from datetime import date
from services.parser import parse_raw_text, ParsedPerformance


def test_parse_raw_text_basic():
    """Test basic parsing of raw text."""
    raw_text = """WIEDER 1 ene.
T. P M. A D.M
M. ALVAREZ 25 30 5"""
    
    result = parse_raw_text(raw_text, base_year=2024)
    
    assert len(result) == 1
    assert result[0].excel_alias == "M. ALVAREZ"
    assert result[0].tickets_actual == 25
    assert result[0].tickets_goal == 30
    assert result[0].date == date(2024, 1, 1)


def test_parse_raw_text_multiple_days():
    """Test parsing text with multiple days."""
    raw_text = """WIEDER 1 ene. 2 ene.
T. P M. A D.M T. P M. A D.M
M. ALVAREZ 25 30 5 32 30 2
J. ROMERO 20 30 10 28 30 2"""
    
    result = parse_raw_text(raw_text, base_year=2024)
    
    assert len(result) == 4  # 2 agents * 2 days
    
    # Check first agent, first day
    perf1 = [p for p in result if p.excel_alias == "M. ALVAREZ" and p.date == date(2024, 1, 1)][0]
    assert perf1.tickets_actual == 25
    assert perf1.tickets_goal == 30
    
    # Check first agent, second day
    perf2 = [p for p in result if p.excel_alias == "M. ALVAREZ" and p.date == date(2024, 1, 2)][0]
    assert perf2.tickets_actual == 32
    assert perf2.tickets_goal == 30


def test_parse_raw_text_invalid_format():
    """Test parsing invalid format raises error."""
    raw_text = """Invalid format"""
    
    with pytest.raises(ValueError, match="Invalid format"):
        parse_raw_text(raw_text)


def test_parse_raw_text_empty_lines():
    """Test parsing text with empty lines."""
    raw_text = """WIEDER 1 ene.

T. P M. A D.M

M. ALVAREZ 25 30 5"""
    
    result = parse_raw_text(raw_text, base_year=2024)
    
    assert len(result) == 1
    assert result[0].excel_alias == "M. ALVAREZ"


def test_parse_raw_text_default_year():
    """Test parsing uses current year if base_year not provided."""
    from datetime import datetime
    raw_text = """WIEDER 1 ene.
T. P M. A D.M
M. ALVAREZ 25 30 5"""
    
    result = parse_raw_text(raw_text)
    
    assert len(result) == 1
    assert result[0].date.year == datetime.now().year


def test_parse_raw_text_skips_headers():
    """Test that header-like lines are skipped."""
    raw_text = """WIEDER 1 ene.
T. P M. A D.M
T. P M. A D.M
M. ALVAREZ 25 30 5"""
    
    result = parse_raw_text(raw_text, base_year=2024)
    
    assert len(result) == 1
    assert result[0].excel_alias == "M. ALVAREZ"

