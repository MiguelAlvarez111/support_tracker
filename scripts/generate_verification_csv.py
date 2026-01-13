import sys
import os
import csv
from datetime import datetime, date

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from sqlalchemy.orm import Session
from database import SessionLocal
from models import Agent

MONTHS = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
    'ene.': 1, 'feb.': 2, 'mar.': 3, 'abr.': 4, 'may.': 5, 'jun.': 6,
    'jul.': 7, 'ago.': 8, 'sep.': 9, 'oct.': 10, 'nov.': 11, 'dic.': 12
}

def parse_header_date(date_str):
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

def main(file_path):
    print(f"Generating verification CSV from {file_path}...")
    
    db = SessionLocal()
    output_rows = []
    
    try:
        agents = db.query(Agent).all()
        # Map: "FULL NAME" -> Agent Object
        agent_map = {a.full_name.upper(): a for a in agents}
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)
            
        # 1. HEADER PARSING
        header_row = None
        header_idx = -1
        for i, row in enumerate(rows):
            line_str = " ".join(row)
            if "1 ene" in line_str.lower():
                header_row = row
                header_idx = i
                break
        
        if not header_row:
            print("Date header not found")
            return
        
        # Map column index to date
        dates_map = {}
        for c_idx, cell in enumerate(header_row):
            d = parse_header_date(cell)
            if d:
                dates_map[c_idx] = d
                
        print(f"Found {len(dates_map)} dates.")
        
        # 2. DATA PARSING
        start_row = header_idx + 1
        
        for row in rows[start_row:]:
            line_str = "".join(row)
            if "T. P" in line_str or "M. A" in line_str or "TOTAL" in line_str or "CONTINGENCIA" in line_str or not line_str.strip():
                continue
                
            raw_name = row[0].strip()
            if not raw_name: continue
            
            agent = None
            clean_raw = raw_name.strip().upper()
            
            # Agent matching
            if clean_raw in agent_map:
                agent = agent_map[clean_raw]
            elif '.' in clean_raw:
                initial, lastname = clean_raw.split('.', 1)
                lastname = lastname.strip()
                initial = initial.strip()
                for full_name, ag in agent_map.items():
                    if lastname in full_name and full_name.startswith(initial):
                        agent = ag
                        break
            
            if not agent:
                continue
                
            team_name = agent.team.name if agent.team else "No Team"
            
            # Extract Data
            for col_idx, date_obj in dates_map.items():
                try:
                    # Assumed structure: Date (TP), Date+1 (MA), Date+2 (DM)
                    if col_idx + 1 >= len(row): break
                    
                    tp_str = row[col_idx].strip().replace('.', '').replace(',', '')
                    ma_str = row[col_idx+1].strip().replace('.', '').replace(',', '')
                    
                    tickets_processed = tp_str if tp_str and tp_str.isdigit() else "0"
                    tickets_goal = ma_str if ma_str and ma_str.isdigit() else "0"
                    
                    output_rows.append({
                        "Date": date_obj.strftime("%Y-%m-%d"),
                        "Agent": agent.full_name,
                        "Team": team_name,
                        "Tickets Parsed": tickets_processed,
                        "Goal Parsed": tickets_goal
                    })
                except:
                    pass
        
        # Write to CSV
        outfile = "verification_report.csv"
        with open(outfile, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ["Date", "Agent", "Team", "Tickets Parsed", "Goal Parsed"]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for row in output_rows:
                writer.writerow(row)
                
        print(f"Generated {outfile} with {len(output_rows)} rows.")
        
    finally:
        db.close()

if __name__ == "__main__":
    main(sys.argv[1])
