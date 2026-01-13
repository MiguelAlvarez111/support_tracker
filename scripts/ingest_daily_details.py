import sys
import os
import re
from datetime import datetime, date

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal
from models import Agent, DailyPerformance

MONTHS = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
    'ene.': 1, 'feb.': 2, 'mar.': 3, 'abr.': 4, 'may.': 5, 'jun.': 6,
    'jul.': 7, 'ago.': 8, 'sep.': 9, 'oct.': 10, 'nov.': 11, 'dic.': 12
}

def parse_header_date(date_str):
    # Expected format: "1 ene." or "1 ene"
    parts = date_str.strip().split()
    if len(parts) != 2:
        return None
    day_str, month_str = parts
    try:
        day = int(day_str)
        month = MONTHS.get(month_str.lower())
        if not month: return None
        year = datetime.now().year
        return date(year, month, day)
    except:
        return None

def find_agent(db: Session, raw_name: str, agent_map: dict):
    # raw_name example: "A. ACEVEDO" or "M. ALVAREZ"
    # agent_map keys: "ANGIE SANTOS", "ASTRID ACEVEDO"...
    
    clean_raw = raw_name.strip().upper()
    
    # 1. Exact match (unlikely if formatted differently)
    if clean_raw in agent_map:
        return agent_map[clean_raw]
    
    # 2. Initial + Lastname match
    # "A. ACEVEDO" -> match "ASTRID ACEVEDO"
    if '.' in clean_raw:
        initial, lastname = clean_raw.split('.', 1)
        lastname = lastname.strip()
        initial = initial.strip()
        
        for full_name, agent_id in agent_map.items():
            db_parts = full_name.split()
            # Assuming format "FIRSTNAME LASTNAME"
            if len(db_parts) >= 2:
                db_lastname = db_parts[-1] # Simple assumption
                db_initial = db_parts[0][0]
                
                # Check if lastname matches matches and initial matches
                if lastname in full_name and initial == db_initial:
                     return agent_id
                     
    # 3. Lastname match only (risky if duplicates)
    for full_name, agent_id in agent_map.items():
         # Remove dots and extra spaces
         if clean_raw.replace('.', '') in full_name.replace('.', ''):
             return agent_id
             
    return None

def process_file(file_path):
    print(f"Reading {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]

    # 1. Parse Header Row for Dates
    # The header row starts with "WIEDER" and contains dates like "1 ene."
    date_map = {} # start_index -> date_obj
    header_indices = []
    
    header_line_idx = -1
    for i, line in enumerate(lines):
        if "WIEDER" in line or "1 ene" in line.lower():
            header_line_idx = i
            break
            
    if header_line_idx == -1:
        print("Could not find header row with dates.")
        return

    # Split header line by tab or multiple spaces
    header_parts = re.split(r'\t+', lines[header_line_idx])
    
    # Map column index to date
    # Format: WIEDER [tab] 1 ene. [tab] [tab] [tab] 2 ene. ...
    # Each date typically covers 3 columns (TP, MA, DM)
    # We need to match the data columns to these dates.
    
    # Let's try a strict column position approach if tab separated
    # The data seems to allow empty columns.
    
    # Heuristic: The dates are headers for blocks of columns.
    # "1 ene." is at index 1 (0-based)
    # "2 ene." is at index 4?
    # Let's clean the parts
    
    dates = []
    for part in header_parts:
        d = parse_header_date(part)
        if d:
            dates.append(d)
    
    print(f"Found {len(dates)} dates: {dates[0]} to {dates[-1]}")
    
    db = SessionLocal()
    try:
        agents = db.query(Agent).all()
        agent_map = {a.full_name.upper(): a.id for a in agents}
        print(f"Loaded {len(agents)} agents from DB.")
        
        total_updates = 0
        
        # Iterate over agent rows
        # Agent rows start after "T.P M.A D.M" line
        start_data_idx = header_line_idx + 1
        
        # Skip description lines if present
        while start_data_idx < len(lines):
             line = lines[start_data_idx]
             if "T. P" in line or "M.A" in line or "D.M" in line or "M. A" in line:
                 start_data_idx += 1
                 continue
             if "TOTAL" in line: # Skip total lines
                 start_data_idx += 1
                 continue
             # Assuming agent row starts now
             break
             
        for line in lines[start_data_idx:]:
            if "TOTAL" in line: continue 
            
            parts = re.split(r'\t+', line)
            if not parts: continue
            
            raw_name = parts[0].strip()
            if not raw_name: continue
            
            agent_id = find_agent(db, raw_name, agent_map)
            if not agent_id:
                # print(f"Skipping unknown agent: {raw_name}")
                continue
            
            # Data columns start at index 1
            # We assume triplets: TP, MA, DM per date
            # But we must be careful with empty columns if string split logic collapsed them?
            # Using re.split(r'\t+') collapses empty fields if not careful? 
            # Actually standard input usually has repeated tabs for empty cells. 
            # Ideally we'd use csv module with delimiter='\t'
            pass 
        
    finally:
        db.close()

def process_file_csv(file_path):
    print(f"Reading {file_path}...")
    
    db = SessionLocal()
    try:
        agents = db.query(Agent).all()
        # Map: "FULL NAME" -> Agent Object
        agent_map = {a.full_name.upper(): a for a in agents}
        
        processed_count = 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = [line.rstrip() for line in f if line.strip()]
            
        # 1. Find Date Header
        header_line = None
        header_idx = -1
        for i, line in enumerate(lines):
            if "1 ene" in line.lower():
                header_line = line
                header_idx = i
                break
        
        if not header_line:
            print("Date header not found")
            return

        # 2. Determine Delimiter (Tab or Multiple Spaces)
        # We'll rely on re.split to handle both scenarios dynamically
        
        # Split header
        header_parts = re.split(r'\t+| {2,}', header_line)
        header_parts = [p.strip() for p in header_parts if p.strip()] # Clean
        
        # Map Column Index to Date
        # Since we are splitting by regex, the indices might be compressed (no empty strings for multiple tabs)
        # This makes mapping by index tricky if there are empty columns in the original.
        # BUT, looking at the user data, "1 ene." is followed by T.P, M.A data in subsequent rows.
        # The header row itself usually has sparse dates: "1 ene. [GAP] 2 ene. [GAP]"
        # Let's try to map by "finding" the dates in the cleaned list.
        
        # Actually, simpler approach for this specific messy format:
        # The dates strictly define the blocks.
        # "1 ene." marks the start of the block. The next columns correspond to it until "2 ene."
        
        dates_in_order = []
        for part in header_parts:
            d = parse_header_date(part)
            if d:
                dates_in_order.append(d)
                
        print(f"Found {len(dates_in_order)} dates.")

        # 3. Process Agent Rows
        # Skip sub-header rows
        start_row = header_idx + 1
        while start_row < len(lines):
            line = lines[start_row]
            if "T. P" in line or "M. A" in line or "TOTAL" in line:
                start_row += 1
            else:
                break
        
        for line in lines[start_row:]:
            if "TOTAL" in line or "CONTINGENCIA" in line: continue
            
            # Split line
            parts = re.split(r'\t+| {2,}', line) # Split by tab or 2+ spaces
            parts = [p.strip() for p in parts if p.strip()]
            
            if not parts: continue
            
            raw_name = parts[0]
            
            # Find Agent
            agent_id = find_agent(db, raw_name, {k: v.id for k,v in agent_map.items()})
            if not agent_id:
                # print(f"Skipping agent: {raw_name}")
                continue
                
            print(f"Processing {raw_name} (ID: {agent_id})...")
            
            # Data values start at index 1
            # We assume triplets: TP, MA, DM
            # So index 1 = Date 1 TP, index 2 = Date 1 MA, index 3 = Date 1 DM
            # index 4 = Date 2 TP...
            
            # Check length match
            # Expected data columns = len(dates_in_order) * 3
            # parts includes name at 0, so total len should be 1 + (dates * 3)
            
            date_idx = 0
            val_idx = 1
            
            while val_idx < len(parts) and date_idx < len(dates_in_order):
                # Retrieve Date Object
                date_obj = dates_in_order[date_idx]
                
                # Get Values (TP, MA) - DM is ignored
                # Need at least 2 values (TP, MA) to proceed safe
                if val_idx + 1 >= len(parts): break
                
                try:
                    tp_str = parts[val_idx].replace('.', '').replace(',', '')
                    ma_str = parts[val_idx+1].replace('.', '').replace(',', '')
                    
                    # Handle empty or dash
                    tickets_processed = int(tp_str) if tp_str.isdigit() else 0
                    tickets_goal = int(ma_str) if ma_str.isdigit() else 0
                    
                    # Upsert
                    perf = db.query(DailyPerformance).filter_by(
                        agent_id=agent_id,
                        date=date_obj
                    ).first()
                    
                    if perf:
                        perf.tickets_actual = tickets_processed
                        perf.tickets_goal = tickets_goal
                    else:
                        perf = DailyPerformance(
                            agent_id=agent_id,
                            date=date_obj,
                            tickets_actual=tickets_processed,
                            tickets_goal=tickets_goal,
                            points_actual=0.0,
                            points_goal=0.0
                        )
                        db.add(perf)
                    
                    processed_count += 1
                except Exception as e:
                    print(f"Error parsing values for {date_obj}: {e}")
                    
                # Advancing index: 3 columns per date (TP, MA, DM)
                # But wait, maybe the split consumed empty columns? 
                # If the file had "82 [tab] 3 [tab] 200", split gives [82, 3, 200].
                # If there were empty columns "0 [tab] 0 [tab] 0", split gives [0, 0, 0].
                # This logic relies on every column being populated or present.
                # If the user copy-paste has "0" for empty values, we are good.
                # User data has "0" in most places.
                
                val_idx += 3 
                date_idx += 1
            
            db.commit() # Commit per agent
            
        print(f"Done. Processed {processed_count} records.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/ingest_daily_details.py <path_to_txt>")
    else:
        process_file_csv(sys.argv[1])
