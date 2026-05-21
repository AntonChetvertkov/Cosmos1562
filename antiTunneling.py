from flask import request
import requests
import os
import dotenv

dotenv.load_dotenv()
BASE_URL = 'https://ip-intelligence.abstractapi.com/v1?'
key = os.environ.get('ABSTRACT_IP')

def checkIpTunneling(IP):
    url = BASE_URL + 'api_key='+key+'&ip_address='+IP
    response = requests.get(url).json()
    response = response.get('security')
    vpm = response.get('is_vpn')
    pr0xy = response.get('is_proxy')
    t0r = response.get('is_tor')
    if vpm or pr0xy or t0r:
        return True
    else:
        return False

def getUserIp():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    else:
        return request.remote_addr