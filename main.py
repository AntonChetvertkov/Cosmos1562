from flask import Flask, render_template, request, redirect, jsonify, session, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from dbFuncs import init_db, add_user, get_all_users, get_user_by_email, get_or_create_user_oauth
from antiTunneling import checkIpTunneling, getUserIp
import sqlite3
import requests
import json
import os
import time
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
YANDEX_CLIENT_ID = os.getenv('YANDEX_CLIENT_ID')
YANDEX_CLIENT_SECRET = os.getenv('YANDEX_CLIENT_SECRET')

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-change-in-production')

oauth = OAuth(app)

google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

yandex = oauth.register(
    name='yandex',
    client_id=os.getenv('YANDEX_CLIENT_ID'),
    client_secret=os.getenv('YANDEX_CLIENT_SECRET'),
    authorize_url='https://oauth.yandex.com/authorize',
    access_token_url='https://oauth.yandex.com/token',
    userinfo_endpoint='https://login.yandex.ru/info',
    client_kwargs={'scope': 'login:email'}
)

GNSS_CACHE_PATH = "dynamic/sats/gnss_sats.json"
CUBESATS_CACHE_PATH = "dynamic/sats/cube_sats.json"
STATIONS_CACHE_PATH = "dynamic/sats/stations.json"
STARLINK_CACHE_PATH = "dynamic/sats/starlink.json"
CACHE_MAX_AGE = 72 * 3600

CELESTRAK_GNSS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=json"
CELESTRAK_CUBESAT_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=json"
CELESTRAK_STATIONS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json"
CELESTRAK_STARLINK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json"

def get_satellite_data(PATH, URL):
    if os.path.exists(PATH) and os.path.getsize(PATH) > 0:
        age = time.time() - os.path.getmtime(PATH)
        if age < CACHE_MAX_AGE:
            try:
                with open(PATH, "r") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                print(f"Cache file corrupted: {PATH}")
    
    try:
        print(f"Fetching {URL}...")
        response = requests.get(URL, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"✓ Got {len(data)} satellites")

        os.makedirs(os.path.dirname(PATH), exist_ok=True)
        with open(PATH, "w") as f:
            json.dump(data, f, indent=4, sort_keys=True)

        return data
    except Exception as e:
        print(f"✗ Error fetching {URL}: {type(e).__name__}: {e}")
        if os.path.exists(PATH) and os.path.getsize(PATH) > 0:
            try:
                with open(PATH, "r") as f:
                    cached = json.load(f)
                    print(f"  Using cached data ({len(cached)} satellites)")
                    return cached
            except:
                pass
        print(f"  Returning empty list")
        return []

@app.route('/', methods=['GET', 'POST'])
def index():
    IP = getUserIp()
    tunnelling = checkIpTunneling(IP)
    if tunnelling:
        return redirect('/error451')
    else:   
        if request.method == 'POST':
            email = request.form.get('email')
            password = request.form.get('password')
            user = get_user_by_email(email)
            if user and check_password_hash(user['password'], password):
                session['authenticated'] = True
                session['user_email'] = email
                return redirect('/home')
            else:
                return render_template('welcome.html', error="Invalid email or password")
        return render_template('welcome.html')

@app.route('/home')
def home():
    if 'authenticated' not in session:
        return redirect('/')
    return render_template('home.html')

@app.route('/AUP')
def AUP():
    return render_template('AUP.html')

@app.route('/error451')
def error451():
    return render_template('error451.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        password_repeat = request.form.get('password_repeat')
        if len(password) < 8:
            return render_template('register.html', error='Password must be at least 8 characters')
        elif password != password_repeat:
            return render_template('register.html', error="Passwords don't match!")
        else:
            tryAdd = add_user(email, password)
            if tryAdd:
                return redirect('/')
            else:
                return render_template('register.html', error='Email already exists')
    return render_template('register.html')

@app.route('/dynamic/gnss_sats')
def gnss_sats():
    return jsonify(get_satellite_data(GNSS_CACHE_PATH, CELESTRAK_GNSS_URL))

@app.route('/dynamic/stations')
def stations():
    return jsonify(get_satellite_data(STATIONS_CACHE_PATH, CELESTRAK_STATIONS_URL))

@app.route('/dynamic/cubesats')
def cubesats():
    return jsonify(get_satellite_data(CUBESATS_CACHE_PATH, CELESTRAK_CUBESAT_URL))

@app.route('/dynamic/starlink')
def starlink():
    return jsonify(get_satellite_data(STARLINK_CACHE_PATH, CELESTRAK_STARLINK_URL))

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    session.pop('user_email', None)
    return redirect('/')

@app.route('/auth/login/google')
def login_google():
    redirect_uri = url_for('auth_callback_google', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/login/yandex')
def login_yandex():
    redirect_uri = url_for('auth_callback_yandex', _external=True)
    return yandex.authorize_redirect(redirect_uri)

@app.route('/auth/callback/google')
def auth_callback_google():
    token = google.authorize_access_token()
    user = token.get('userinfo')
    
    if not user:
        return redirect('/?error=Failed to get user info from Google')
    
    email = user.get('email')
    name = user.get('name', 'Unknown')
    google_id = user.get('sub')
    
    db_user = get_or_create_user_oauth(email, google_id, name, 'google')
    
    if db_user:
        session['authenticated'] = True
        session['user_email'] = email
        session['user_name'] = name
        return redirect('/home')
    else:
        return redirect('/?error=Failed to create user account')

@app.route('/auth/callback/yandex')
def auth_callback_yandex():
    token = yandex.authorize_access_token()
    headers = {'Authorization': f'OAuth {token["access_token"]}'}
    resp = requests.get('https://login.yandex.ru/info', headers=headers)
    user = resp.json()
    
    if not user:
        return redirect('/?error=Failed to get user info from Yandex')
    
    email = user.get('default_email')
    name = user.get('real_name', 'Unknown')
    yandex_id = user.get('id')
    
    db_user = get_or_create_user_oauth(email, yandex_id, name, 'yandex')
    
    if db_user:
        session['authenticated'] = True
        session['user_email'] = email
        session['user_name'] = name
        return redirect('/home')
    else:
        return redirect('/?error=Failed to create user account')

if __name__ == '__main__':
    init_db()
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug_mode)