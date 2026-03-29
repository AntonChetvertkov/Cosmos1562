import zipfile
import requests
import io
import json

# Download GeoNames cities1000 dataset
url = "https://download.geonames.org/export/dump/cities1000.zip"
response = requests.get(url)

z = zipfile.ZipFile(io.BytesIO(response.content))
file = z.open("cities1000.txt")

cities = []

for line in file:
    parts = line.decode("utf-8").strip().split("\t")
    
    name = parts[1]
    lat = float(parts[4])
    lon = float(parts[5])
    population = int(parts[14])
    
    cities.append({
        "name": name,
        "lat": lat,
        "lon": lon,
        "population": population
    })

# Sort by population (descending)
cities_sorted = sorted(cities, key=lambda x: x["population"], reverse=True)

# Take top 1000 and remove population field
top_1000 = [
    {"name": c["name"], "lat": c["lat"], "lon": c["lon"]}
    for c in cities_sorted[:1000]
]

# Save to JSON
with open("top_1000_cities.json", "w", encoding="utf-8") as f:
    json.dump(top_1000, f, indent=2, ensure_ascii=False)

print("Done! File saved as top_1000_cities.json")