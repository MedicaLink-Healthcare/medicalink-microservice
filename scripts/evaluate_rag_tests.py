import csv
import json
import urllib.request
import urllib.error
import time
import sys
import traceback
import os

sys.stdout.reconfigure(encoding='utf-8')

def evaluate():
    file_path = "d:/Personal_Project/medicalink-microservice/data/rag_test_cases_ai.csv"
    specs_path = "d:/Personal_Project/medicalink-microservice/data/specialties_cleaned.json"
    api_url = "http://localhost:3000/api/ai/suggest-specialties"
    
    # Load specialties map
    id_to_name = {}
    if os.path.exists(specs_path):
        with open(specs_path, 'r', encoding='utf-8') as sf:
            specs = json.load(sf)
            for s in specs.get("specialties", []):
                id_to_name[s["id"]] = s["name"]
    else:
        print("Specialties JSON not found!")
        return

    exact_hit = 0
    acceptable = 0
    dangerous_miss = 0
    total = 0
    
    try:
        total_rows = sum(1 for _ in open(file_path, "r", encoding="utf-8-sig")) - 1
        
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                query = row["Query"]
                primary = row.get("Primary_Specialty", "").strip()
                acceptable_str = row.get("Acceptable_Specialties", "")
                acceptable_list = [x.strip().lower() for x in acceptable_str.split(";") if x.strip()]
                
                payload = json.dumps({"symptoms": query}).encode("utf-8")
                req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"})
                
                max_retries = 5
                backoff = 10
                for attempt in range(max_retries):
                    try:
                        with urllib.request.urlopen(req) as response:
                            res_data = json.loads(response.read().decode("utf-8"))
                            
                            data = res_data.get("data", {})
                            if "response" in res_data:
                                data = res_data["response"]
                                
                            spec_ids = data.get("specialty_ids", [])
                            top_names = [id_to_name.get(sid, sid) for sid in spec_ids]
                            
                            equivalence_map = {
                                "bác sĩ gia đình": ["bác sĩ gia đình", "nội tổng quát"],
                                "nội tổng quát": ["nội tổng quát", "bác sĩ gia đình", "tim mạch", "hô hấp", "tiêu hóa - gan mật", "lồng ngực - mạch máu", "nội khoa"],
                                "sản phụ khoa": ["sản phụ khoa", "hiếm muộn - hỗ trợ sinh sản", "sản"],
                                "nhi khoa": ["nhi khoa", "bác sĩ gia đình", "nội tổng quát", "nhi"],
                                "nội khoa": ["nội tổng quát", "bác sĩ gia đình", "nội khoa"],
                                "ngoại khoa": ["ngoại tổng quát", "ngoại khoa"],
                                "tiêu hóa": ["tiêu hóa - gan mật", "tiêu hóa"],
                                "gan mật": ["tiêu hóa - gan mật", "gan mật", "tiêu hóa"],
                                "cơ xương khớp": ["cơ xương khớp", "chấn thương chỉnh hình"],
                                "chấn thương chỉnh hình": ["cơ xương khớp", "chấn thương chỉnh hình"],
                            }
                            
                            def is_match(target, predicted):
                                target_clean = target.lower().strip()
                                predicted_clean = predicted.lower().strip()
                                
                                if target_clean in predicted_clean or predicted_clean in target_clean:
                                    return True
                                    
                                allowed = equivalence_map.get(target_clean, [target_clean])
                                if predicted_clean in allowed:
                                    return True
                                    
                                for key, vals in equivalence_map.items():
                                    if (target_clean == key or target_clean in vals) and (predicted_clean == key or predicted_clean in vals):
                                        return True
                                
                                return False
                            
                            is_exact = False
                            is_acceptable = False
                            
                            # Check Top 1 for Exact Hit
                            if top_names and is_match(primary, top_names[0]):
                                is_exact = True
                                is_acceptable = True
                                exact_hit += 1
                                acceptable += 1
                            else:
                                # Check Top 3 for Acceptable
                                for t in top_names[:3]:
                                    if is_match(primary, t) or any(is_match(acc, t) for acc in acceptable_list):
                                        is_acceptable = True
                                        acceptable += 1
                                        break
                                        
                                if not is_acceptable:
                                    dangerous_miss += 1
                                        
                            # Print only every 10th row to reduce spam, or if it's the last few
                            if (i + 1) % 10 == 0 or (i + 1) == total_rows:
                                status = "EXACT" if is_exact else ("ACCEPTABLE" if is_acceptable else "MISS")
                                print(f"[{i+1}/{total_rows}] [{status}] Primary: {primary} | Acceptable: {acceptable_list} | Got: {top_names[:3]}")
                        break  # Success, exit retry loop
                    except urllib.error.HTTPError as e:
                        if e.code == 429:
                            print(f"Rate limited. Retrying in {backoff} seconds...")
                            time.sleep(backoff)
                            backoff *= 2
                        else:
                            print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
                            break
                    except Exception as e:
                        print(f"Error calling API: {e}")
                        time.sleep(5)
                
                total += 1
                time.sleep(4.5)  # Strict delay to avoid 15 RPM rate limits
                
        if total > 0:
            print(f"\n--- MEDICAL TRIAGE EVALUATION RESULTS ---")
            print(f"Total Test Cases: {total}")
            print(f"Exact Hit Rate (Top-1 Primary): {exact_hit/total:.2%} ({exact_hit}/{total})")
            print(f"Clinically Acceptable Rate (Top-3): {acceptable/total:.2%} ({acceptable}/{total})")
            print(f"Dangerous Misrouting Rate (Miss): {dangerous_miss/total:.2%} ({dangerous_miss}/{total})")
        else:
            print("No rows processed.")
    except Exception as e:
        print(f"File reading error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    evaluate()
