"""
Service for parsing raw text data from Excel copies into structured performance records.
"""
import re
from datetime import date, datetime
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class ParsedPerformance:
    """Simple data class for parsed performance data."""
    excel_alias: str
    date: date
    tickets_actual: int
    tickets_goal: int
    points_actual: float = 0.0
    points_goal: float = 8.0


def parse_raw_text(raw_text: str, base_year: int = None) -> List[ParsedPerformance]:
    """
    Parse raw text copied from Excel into performance records.
    
    Expected format:
    WIEDER 1 ene. 2 ene.
    T. P M. A D.M T. P M. A D.M
    M. ALVAREZ 0 0 0 401 400 1
    J. ROMERO 0 0 0 200 200 0
    
    Args:
        raw_text: Raw text string copied from Excel
        base_year: Base year to use for dates (defaults to current year)
    
    Returns:
        List of ParsedPerformance objects with parsed data
    """
    if base_year is None:
        base_year = datetime.now().year
    
    lines = [line.strip() for line in raw_text.strip().split('\n') if line.strip()]
    
    if len(lines) < 3:
        raise ValueError("Invalid format: text must have at least 3 lines")
    
    # Parse first line to extract dates
    first_line = lines[0]
    dates = _extract_dates(first_line, base_year)
    
    # Skip header lines (first two lines: dates and column headers)
    data_lines = lines[2:]
    
    performances = []
    
    for line in data_lines:
        line = line.strip()
        if not line:
            continue
        
        # Find where the numeric data starts (agent name ends)
        # Pattern: find first occurrence of a number (possibly after spaces)
        match = re.search(r'(\d+)', line)
        if not match:
            continue
        
        # Everything before the first number is the agent name (excel_alias)
        numeric_start = match.start()
        excel_alias = line[:numeric_start].strip().upper()
        
        # Skip lines that look like headers
        if not excel_alias or excel_alias in ['T.', 'P', 'M.', 'A', 'D.M', 'WIEDER', 'T. P', 'M. A']:
            continue
        
        # Extract numeric data
        numeric_part = line[numeric_start:]
        data_values = numeric_part.split()
        
        # Each day has 3 columns: T.P (tickets_actual), M.A (tickets_goal), D.M (difference)
        # Process each day's data
        day_index = 0
        col_index = 0
        
        while col_index + 2 < len(data_values) and day_index < len(dates):
            try:
                # Extract values for this day (3 columns per day)
                tickets_actual = _safe_int(data_values[col_index])
                tickets_goal = _safe_int(data_values[col_index + 1])
                # difference = data_values[col_index + 2]  # We don't use this
                
                performance_date = dates[day_index]
                
                # Create performance record (points have default values)
                performance = ParsedPerformance(
                    excel_alias=excel_alias,
                    date=performance_date,
                    tickets_actual=tickets_actual,
                    tickets_goal=tickets_goal,
                    points_actual=0.0,  # Default, can be updated later
                    points_goal=8.0  # Default, can be updated later
                )
                
                performances.append(performance)
                
                col_index += 3  # Move to next day (3 columns per day)
                day_index += 1
            except (ValueError, IndexError, TypeError) as e:
                # Skip this day if there's an error
                col_index += 3
                day_index += 1
                continue
    
    return performances


def _extract_dates(first_line: str, base_year: int) -> List[date]:
    """
    Extract dates from the first line of the text.
    
    Example: "WIEDER 1 ene. 2 ene." -> [date(2024, 1, 1), date(2024, 1, 2)]
    """
    dates = []
    
    # Pattern to match date formats like "1 ene.", "2 ene.", "15 dic.", etc.
    # Spanish month abbreviations
    month_map = {
        'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
    }
    
    # Pattern: number + space + 3 letter month abbreviation + optional period
    pattern = r'(\d+)\s+([a-z]{3})\.?'
    
    matches = re.findall(pattern, first_line.lower())
    
    for day_str, month_abbr in matches:
        try:
            day = int(day_str)
            month = month_map.get(month_abbr)
            
            if month:
                metric_date = date(base_year, month, day)
                dates.append(metric_date)
        except (ValueError, TypeError):
            continue
    
    return dates


def _safe_int(value: str) -> int:
    """Safely convert string to int, handling empty strings and invalid values."""
    try:
        # Convert to string and strip whitespace
        value_str = str(value).strip()
        if not value_str:
            return 0
        # Try direct conversion first
        return int(value_str)
    except (ValueError, TypeError):
        # If that fails, try to extract numbers
        try:
            value_str = str(value).strip()
            cleaned = re.sub(r'[^\d-]', '', value_str)
            if cleaned:
                return int(cleaned)
            return 0
        except (ValueError, TypeError):
            return 0
