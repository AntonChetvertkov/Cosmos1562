from flask import Flask, render_template, request, redirect, jsonify, session, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from dbFuncs import init_db, add_user, get_all_users, get_user_by_email, get_or_create_user_oauth
import sqlite3
import requests
import json
import os
import time
import dotenv
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth

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