import urllib.request
import json
import codecs

resp = urllib.request.urlopen('http://localhost:3000/api/specialties/public?limit=100')
data = json.loads(resp.read().decode('utf-8'))
with codecs.open('specialties_cleaned.json', 'w', 'utf-8') as f:
    json.dump({'specialties': data['data']}, f, ensure_ascii=False, indent=2)
