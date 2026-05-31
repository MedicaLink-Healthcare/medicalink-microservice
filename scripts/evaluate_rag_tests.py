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

    total = 0
    correct_top1 = 0
    correct_top3 = 0
    
    try:
        total_rows = sum(1 for _ in open(file_path, "r", encoding="utf-8-sig")) - 1
        
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                query = row["Query"]
                expected = row["Expected_Specialty"]
                
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
                            
                            if top_names and expected.lower() in top_names[0].lower():
                                correct_top1 += 1
                                correct_top3 += 1
                            else:
                                for name in top_names[:3]:
                                    if expected.lower() in name.lower():
                                        correct_top3 += 1
                                        break
                                        
                            # Print only every 10th row to reduce spam, or if it's the last few
                            if (i + 1) % 10 == 0 or (i + 1) == total_rows:
                                print(f"[{i+1}/{total_rows}] Expected: {expected} | Got: {top_names}")
                        break  # Success, exit retry loop
                    except urllib.error.HTTPError as e:
                        if e.code == 429:
                            print(f"Rate limited on row {i}. Waiting {backoff} seconds (Attempt {attempt+1}/{max_retries})...")
                            time.sleep(backoff)
                            backoff *= 2  # Exponential backoff
                        else:
                            print(f"HTTP Error on row {i}: {e}")
                            break
                    except Exception as e:
                        print(f"Error on API row {i}: {e}")
                        break
                
                total += 1
                time.sleep(4.5)  # Strict delay to avoid 15 RPM rate limits
                
        if total > 0:
            print(f"\n--- EVALUATION RESULTS ---")
            print(f"Total Test Cases: {total}")
            print(f"Top-1 Accuracy: {correct_top1/total:.2%}")
            print(f"Top-3 Accuracy: {correct_top3/total:.2%}")
        else:
            print("No rows processed.")
    except Exception as e:
        print(f"File reading error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    evaluate()
