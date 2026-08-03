from flask import request
import geoip2.database
import os
import requests

_DEBUG_COUNTRY = os.getenv('DEBUG_COUNTRY', '').upper().strip()
_ABSTRACT_IP_KEY = os.getenv('ABSTRACT_IP')

_DB_PATH = os.path.join(os.path.dirname(__file__), 'static', 'geolite', 'GeoLite2-Country.mmdb')
_reader = geoip2.database.Reader(_DB_PATH)

RUSSIAN_COUNTRIES = {
    'AM', 'AZ', 'BY', 'EE', 'GE', 'KZ', 'KG', 'LV', 'LT', 'MD',
    'RU', 'TJ', 'TM', 'UA', 'UZ'
}

def getUserIp():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def getCountryCode(ip):
    if _DEBUG_COUNTRY:
        return _DEBUG_COUNTRY
    try:
        return _reader.country(ip).country.iso_code or ''
    except Exception:
        return ''

def getLanguage(country_code):
    return 'ru' if country_code in RUSSIAN_COUNTRIES else 'en'

def getIpLocation(ip):
    if not _ABSTRACT_IP_KEY:
        return None
    try:
        resp = requests.get(
            'https://ipgeolocation.abstractapi.com/v1/',
            params={'api_key': _ABSTRACT_IP_KEY, 'ip_address': ip},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        lat = data.get('latitude')
        lon = data.get('longitude')
        if lat is None or lon is None:
            return None
        return {'lat': lat, 'lon': lon, 'city': data.get('city')}
    except Exception:
        return None
