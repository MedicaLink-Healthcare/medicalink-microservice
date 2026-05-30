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
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= 50:
                    break
                    
                query = row["Query"]
                expected = row["Expected_Specialty"]
                
                payload = json.dumps({"symptoms": query}).encode("utf-8")
                req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"})
                
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
                                    
                        print(f"[{i+1}/50] Expected: {expected} | Got: {top_names}")
                except Exception as e:
                    print(f"Error on API row {i}: {e}")
                
                total += 1
                time.sleep(1.0)  # Avoid rate limits
                
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
