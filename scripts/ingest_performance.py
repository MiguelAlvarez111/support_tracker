import sys
import os
import csv
from datetime import datetime, date

# Add parent directory to path to allow importing app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Agent, DailyPerformance

# Mapping spanish months to integers
MONTHS = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
}

def parse_date(date_str):
    """
    Parses a date string like '01-ene' to a date object.
    Assumes the current year.
    """
    try:
        day_str, month_str = date_str.split('-')
        month = MONTHS.get(month_str.lower())
        if not month:
            raise ValueError(f"Unknown month: {month_str}")
        
        year = datetime.now().year
        return date(year, month, int(day_str))
    except Exception as e:
        print(f"Error parsing date '{date_str}': {e}")
        return None

def ingest_data(file_path):
    print(f"Starting ingestion from {file_path}...")
    db = SessionLocal()
    try:
        # 1. Load all agents into a map for quick lookup
        # Map: "NAME" -> agent_id
        agents = db.query(Agent).all()
        agent_map = {agent.full_name.strip().upper(): agent.id for agent in agents}
        
        print(f"Found {len(agents)} agents in database.")
        if not agents:
            print("WARNING: No agents found in DB. converting CSV headers to agents might fail if names don't match exactly.")

        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            
            # Read Headers
            headers = next(reader, None)
            if not headers:
                print("Error: Empty CSV file")
                return

            # Map column indices to agent IDs
            # Header format: "Día, A. SANTOS, A. ACEVEDO..."
            col_agent_map = {}
            for idx, col_name in enumerate(headers):
                if idx == 0: continue # Skip 'Día' column
                
                agent_name = col_name.strip().upper()
                if agent_name in agent_map:
                    col_agent_map[idx] = agent_map[agent_name]
                    print(f"Mapped column '{col_name}' to Agent ID {agent_map[agent_name]}")
                else:
                    print(f"WARNING: Agent '{agent_name}' in CSV not found in Database. Data for this column will be SKIPPED.")
            
            if not col_agent_map:
                print("Error: No columns could be mapped to existing agents. Aborting.")
                return

            # Process Rows
            rows_processed = 0
            for row in reader:
                if not row: continue
                
                date_str = row[0]
                performance_date = parse_date(date_str)
                if not performance_date:
                    continue

                for idx, val in enumerate(row):
                    # Skip if column is not mapped to an agent
                    if idx not in col_agent_map: continue
                    
                    agent_id = col_agent_map[idx]
                    
                    # Parse value (assuming it's tickets_actual)
                    try:
                        val_str = val.strip()
                        if val_str == '' or val_str == '-':
                            val_num = 0
                        else:
                            val_num = int(float(val_str))
                    except ValueError:
                        print(f"Warning: Invalid number '{val}' for agent {agent_id} on {date_str}. Using 0.")
                        val_num = 0

                    # Check if record exists
                    perf = db.query(DailyPerformance).filter_by(
                        agent_id=agent_id, 
                        date=performance_date
                    ).first()
                    
                    if perf:
                        # Update existing
                        perf.tickets_actual = val_num
                        # We don't touch other fields (goals/points) to avoid overwriting them if they exist
                    else:
                        # Create new
                        perf = DailyPerformance(
                            agent_id=agent_id,
                            date=performance_date,
                            tickets_actual=val_num,
                            tickets_goal=0,   # Default
                            points_actual=0.0, # Default
                            points_goal=0.0   # Default
                        )
                        db.add(perf)
                
                rows_processed += 1
                # Commit every few rows or at the end? 
                # Committing per row is safer for debugging but slower. 
                # Let's commit per row group or just at the end.
            
            db.commit()
            print(f"Successfully processed {rows_processed} rows.")

    except Exception as e:
        db.rollback()
        print(f"An error occurred during ingestion: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/ingest_performance.py <path_to_csv>")
    else:
        file_path = sys.argv[1]
        if os.path.exists(file_path):
            ingest_data(file_path)
        else:
            print(f"File not found: {file_path}")
