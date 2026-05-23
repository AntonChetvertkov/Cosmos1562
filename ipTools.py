from flask import request
import requests
import os
import dotenv

dotenv.load_dotenv()
BASE_URL = 'https://ip-intelligence.abstractapi.com/v1?'
key = os.environ.get('ABSTRACT_IP')

def getIpData(IP):
    url = BASE_URL + 'api_key='+key+'&ip_address='+IP
    response = requests.get(url).json()
    return response


def checkIpTunneling(response):
    response = response.get('security')
    vpm = response.get('is_vpn')
    pr0xy = response.get('is_proxy')
    t0r = response.get('is_tor')
    if vpm or pr0xy or t0r:
        return True
    else:
        return False

def getCountry(response):
    location = response.get('location', {})
    return location.get('country')

def getLanguage(response):
    country = getCountry(response)
    if not country:
        return 'English'

    country = country.strip().lower()

    russian_countries = {
        'armenia',
        'azerbaijan',
        'belarus',
        'estonia',
        'georgia',
        'kazakhstan',
        'kyrgyzstan',
        'latvia',
        'lithuania',
        'moldova',
        'russia',
        'russian federation',
        'tajikistan',
        'turkmenistan',
        'ukraine',
        'uzbekistan'
    }

    if country in russian_countries:
        return 'ru'
    else:
        return 'en'

def getUserIp():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    else:
        return request.remote_addr
