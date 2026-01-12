"""
Service for parsing raw text data from Excel copies into structured DailyMetric records.
"""
import re
from datetime import date, datetime
from typing import List, Optional

from models import DailyMetric
from schemas import DailyMetricCreate


def parse_raw_text(raw_text: str, base_year: int = None) -> List[DailyMetricCreate]:
    """
    Parse raw text copied from Excel into DailyMetric records.
    
    Expected format:
    WIEDER 1 ene. 2 ene.
    T. P M. A D.M T. P M. A D.M
    M. ALVAREZ 0 0 0 401 400 1
    J. ROMERO 0 0 0 200 200 0
    
    Args:
        raw_text: Raw text string copied from Excel
        base_year: Base year to use for dates (defaults to current year)
    
    Returns:
        List of DailyMetricCreate objects ready to be saved
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
    
    metrics = []
    
    for line in data_lines:
        line = line.strip()
        if not line:
            continue
        
        # Find where the numeric data starts (agent name ends)
        # Pattern: find first occurrence of a number (possibly after spaces)
        match = re.search(r'(\d+)', line)
        if not match:
            continue
        
        # Everything before the first number is the agent name
        numeric_start = match.start()
        agent_name = line[:numeric_start].strip().upper()
        
        # Skip lines that look like headers
        if not agent_name or agent_name in ['T.', 'P', 'M.', 'A', 'D.M', 'WIEDER', 'T. P', 'M. A']:
            continue
        
        # Extract numeric data
        numeric_part = line[numeric_start:]
        data_values = numeric_part.split()
        
        # Each day has 3 columns: T.P (tickets_processed), M.A (ticket_goal), D.M (difference)
        # Process each day's data
        day_index = 0
        col_index = 0
        
        while col_index + 2 < len(data_values) and day_index < len(dates):
            try:
                # Extract values for this day (3 columns per day)
                tickets_processed = _safe_int(data_values[col_index])
                ticket_goal = _safe_int(data_values[col_index + 1])
                # difference = data_values[col_index + 2]  # We don't use this
                
                metric_date = dates[day_index]
                
                # Create metric (squadlinx fields will need default values or be handled separately)
                # For now, we'll set default values for squadlinx fields
                metric = DailyMetricCreate(
                    agent_name=agent_name,
                    date=metric_date,
                    tickets_processed=tickets_processed,
                    ticket_goal=ticket_goal,
                    squadlinx_points=0.0,  # Default, can be updated later
                    squadlinx_goal=8.0  # Default, can be updated later
                )
                
                metrics.append(metric)
                
                col_index += 3  # Move to next day (3 columns per day)
                day_index += 1
            except (ValueError, IndexError, TypeError) as e:
                # Skip this day if there's an error
                col_index += 3
                day_index += 1
                continue
    
    return metrics


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


def upsert_metrics(metrics: List[DailyMetricCreate], db_session) -> List[DailyMetric]:
    """
    Upsert (insert or update) metrics in the database.
    
    If a metric with the same (agent_name, date) exists, it will be updated.
    Otherwise, a new record will be created.
    
    Args:
        metrics: List of DailyMetricCreate objects
        db_session: SQLAlchemy database session
    
    Returns:
        List of DailyMetric objects (inserted or updated)
    """
    result_metrics = []
    
    for metric_data in metrics:
        # Check if metric exists
        existing_metric = db_session.query(DailyMetric).filter(
            DailyMetric.agent_name == metric_data.agent_name.upper(),
            DailyMetric.date == metric_data.date
        ).first()
        
        if existing_metric:
            # Update existing metric
            existing_metric.tickets_processed = metric_data.tickets_processed
            existing_metric.ticket_goal = metric_data.ticket_goal
            existing_metric.squadlinx_points = metric_data.squadlinx_points
            existing_metric.squadlinx_goal = metric_data.squadlinx_goal
            existing_metric.calculate_burnout()
            result_metrics.append(existing_metric)
        else:
            # Create new metric
            new_metric = DailyMetric(**metric_data.model_dump())
            new_metric.calculate_burnout()
            db_session.add(new_metric)
            result_metrics.append(new_metric)
    
    db_session.commit()
    
    # Refresh all metrics to get IDs
    for metric in result_metrics:
        db_session.refresh(metric)
    
    return result_metrics

