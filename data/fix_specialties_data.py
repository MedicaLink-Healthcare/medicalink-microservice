import json
import subprocess
import codecs

def capitalize_first(s):
    if not s:
        return s
    return s[0].upper() + s[1:]

def fix_data():
    # 1. Fetch current data from DB
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
    specialties_data = json.loads(output_json_str)

    updates = []
    
    for spec in specialties_data:
        # Case normalization for all fields
        for field in ['common_symptoms', 'common_conditions', 'keywords', 'expertise', 'aliases']:
            if spec.get(field):
                spec[field] = [capitalize_first(x) for x in spec[field] if x]
        
        # 1. Critical Semantic Contamination
        # Nội tổng quát
        if spec['name'] == 'Nội tổng quát':
            if 'Nội tiết' in spec['aliases']:
                spec['aliases'].remove('Nội tiết')
        
        # Ngoại thần kinh
        if spec['name'] == 'Ngoại thần kinh':
            if 'Nội thần kinh' in spec['aliases']:
                spec['aliases'].remove('Nội thần kinh')
                
            # 2. Semantic Overlapping Spec
            # Change conditions to be surgical
            spec['common_conditions'] = [
                'Phẫu thuật u não', 
                'Phẫu thuật chấn thương sọ não', 
                'Phẫu thuật thoát vị đĩa đệm', 
                'Can thiệp ngoại khoa thần kinh',
                'Mổ chấn thương sọ não'
            ]
            spec['keywords'] = [
                'Ngoại thần kinh',
                'Phẫu thuật thần kinh',
                'Phẫu thuật u não',
                'Mổ chấn thương sọ não',
                'Can thiệp ngoại khoa'
            ]
        
        # Tiêu hóa - Gan mật: just relying on the capitalize_first we did above.
        
        # Build UPDATE query
        def array_to_pg(arr):
            if not arr: return "'{}'"
            escaped = [x.replace("'", "''") for x in arr]
            return "ARRAY['" + "', '".join(escaped) + "']"
        
        update_sql = f"""
        UPDATE specialties 
        SET 
            aliases = {array_to_pg(spec['aliases'])},
            common_symptoms = {array_to_pg(spec['common_symptoms'])},
            common_conditions = {array_to_pg(spec['common_conditions'])},
            keywords = {array_to_pg(spec['keywords'])},
            expertise = {array_to_pg(spec['expertise'])}
        WHERE id = '{spec['id']}';
        """
        updates.append(update_sql)

    # Apply updates
    for sql_stmt in updates:
        subprocess.run(
            ["docker", "exec", "-i", "medicalink-db", "psql", "-U", "postgres", "-d", "medicalink_provider", "-c", sql_stmt],
            capture_output=True
        )
        
    print("Postgres update completed. Re-dumping to JSON...")
    
    # Dump again to get final state
    result2 = subprocess.run(
        ["docker", "exec", "-i", "medicalink-db", "psql", "-U", "postgres", "-d", "medicalink_provider", "-t", "-c", sql],
        capture_output=True,
        text=True,
        encoding='utf-8'
    )
    final_data = json.loads(result2.stdout.strip())
    
    # Save to JSON
    with codecs.open('specialties_cleaned.json', 'w', 'utf-8') as f:
        json.dump({'specialties': final_data}, f, ensure_ascii=False, indent=2)
        
    with codecs.open('../../medicalink-ai-service/data/specialties_cleaned.json', 'w', 'utf-8') as f:
        json.dump({'specialties': final_data}, f, ensure_ascii=False, indent=2)

    print("Data fixed and dumped successfully.")

if __name__ == '__main__':
    fix_data()
