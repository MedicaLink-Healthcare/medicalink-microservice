import json
import subprocess
import codecs

# Query all necessary fields from PostgreSQL
sql = """
SELECT json_agg(
    json_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'aliases', aliases,
        'common_symptoms', common_symptoms,
        'common_conditions', common_conditions,
        'keywords', keywords,
        'expertise', expertise,
        'description', description,
        'icon_url', icon_url,
        'is_active', is_active
    )
) FROM specialties;
"""

result = subprocess.run(
    ["docker", "exec", "-i", "medicalink-db", "psql", "-U", "postgres", "-d", "medicalink_provider", "-t", "-c", sql],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

output_json_str = result.stdout.strip()
if not output_json_str:
    print("Error: Empty result from DB")
    exit(1)

# The result is a JSON array string. Load it.
try:
    specialties_data = json.loads(output_json_str)
except Exception as e:
    print("Error parsing JSON:", e)
    # Sometimes psql output might have wrapped lines or extra spacing, let's just write to file
    exit(1)

# Write to specialties_cleaned.json
with codecs.open('specialties_cleaned.json', 'w', 'utf-8') as f:
    json.dump({'specialties': specialties_data}, f, ensure_ascii=False, indent=2)

# Copy it to AI service as well
with codecs.open('../medicalink-ai-service/data/specialties_cleaned.json', 'w', 'utf-8') as f:
    json.dump({'specialties': specialties_data}, f, ensure_ascii=False, indent=2)

print(f"Successfully dumped {len(specialties_data)} specialties to JSON!")
