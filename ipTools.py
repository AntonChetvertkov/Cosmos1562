from flask import request
import geoip2.database
import os

_DEBUG_COUNTRY = os.getenv('DEBUG_COUNTRY', '').upper().strip()

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
