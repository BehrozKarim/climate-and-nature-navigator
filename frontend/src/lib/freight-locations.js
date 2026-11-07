// Offline copy of the backend routing catalogue; connected mode loads the live catalogue.
export const REFERENCE_PLACES = [
  {
    "id": "helsinki",
    "name": "Helsinki",
    "lat": 60.17,
    "lon": 24.94,
    "group": "FI",
    "port": true,
    "aliases": []
  },
  {
    "id": "turku",
    "name": "Turku",
    "lat": 60.45,
    "lon": 22.27,
    "group": "FI",
    "port": true,
    "aliases": []
  },
  {
    "id": "naantali",
    "name": "Naantali port",
    "lat": 60.47,
    "lon": 22.03,
    "group": "FI",
    "port": true,
    "aliases": [
      "Naantali"
    ]
  },
  {
    "id": "tampere",
    "name": "Tampere",
    "lat": 61.5,
    "lon": 23.76,
    "group": "FI",
    "port": false,
    "aliases": []
  },
  {
    "id": "oulu",
    "name": "Oulu",
    "lat": 65.01,
    "lon": 25.47,
    "group": "FI",
    "port": true,
    "aliases": []
  },
  {
    "id": "sakyla",
    "name": "Säkylä plant",
    "lat": 61.0787,
    "lon": 22.2538,
    "group": "FI",
    "port": false,
    "aliases": [
      "Säkylä",
      "Sakyla"
    ]
  },
  {
    "id": "kantvik",
    "name": "Kantvik harbour",
    "lat": 60.084,
    "lon": 24.383,
    "group": "FI",
    "port": true,
    "aliases": [
      "Kantvik",
      "Kantvik mill"
    ]
  },
  {
    "id": "pudasjarvi",
    "name": "Pudasjärvi",
    "lat": 65.36,
    "lon": 26.99,
    "group": "FI",
    "port": false,
    "aliases": [
      "Pudasjarvi"
    ]
  },
  {
    "id": "riga",
    "name": "Port of Riga",
    "lat": 56.99,
    "lon": 24.07,
    "group": "BAL",
    "port": true,
    "aliases": [
      "Riga",
      "Riga port"
    ]
  },
  {
    "id": "tallinn",
    "name": "Tallinn",
    "lat": 59.44,
    "lon": 24.75,
    "group": "BAL",
    "port": true,
    "aliases": []
  },
  {
    "id": "muuga",
    "name": "Port of Muuga",
    "lat": 59.5,
    "lon": 24.95,
    "group": "BAL",
    "port": true,
    "aliases": [
      "Muuga"
    ]
  },
  {
    "id": "tartu",
    "name": "Tartu",
    "lat": 58.38,
    "lon": 26.72,
    "group": "BAL",
    "port": false,
    "aliases": []
  },
  {
    "id": "jelgava",
    "name": "Jelgava",
    "lat": 56.65,
    "lon": 23.71,
    "group": "BAL",
    "port": false,
    "aliases": []
  },
  {
    "id": "klaipeda",
    "name": "Klaipėda",
    "lat": 55.71,
    "lon": 21.13,
    "group": "BAL",
    "port": true,
    "aliases": []
  },
  {
    "id": "gdansk",
    "name": "Gdańsk",
    "lat": 54.6,
    "lon": 18.65,
    "group": "BAL",
    "port": true,
    "aliases": []
  },
  {
    "id": "stockholm",
    "name": "Stockholm",
    "lat": 59.33,
    "lon": 18.07,
    "group": "SE",
    "port": true,
    "aliases": []
  },
  {
    "id": "kapellskar",
    "name": "Kapellskär port",
    "lat": 59.72,
    "lon": 19.07,
    "group": "SE",
    "port": true,
    "aliases": [
      "Kapellskär"
    ]
  },
  {
    "id": "bjuv",
    "name": "Bjuv plant",
    "lat": 56.084,
    "lon": 12.92,
    "group": "SE",
    "port": false,
    "aliases": [
      "Bjuv"
    ]
  },
  {
    "id": "malmo",
    "name": "Malmö",
    "lat": 55.6,
    "lon": 13.0,
    "group": "SE",
    "port": true,
    "aliases": []
  },
  {
    "id": "helsingborg",
    "name": "Helsingborg",
    "lat": 56.05,
    "lon": 12.69,
    "group": "SE",
    "port": true,
    "aliases": []
  }
];

export function placeLookup(places) {
  const lookup = {};
  for (const p of places) {
    const value = [p.lon, p.lat, p.group, p.port ? 1 : 0];
    for (const name of [p.id, p.name, ...(p.aliases || [])]) lookup[name.trim().toLowerCase()] = value;
  }
  return lookup;
}
