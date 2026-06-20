from flask import Flask, render_template, request, redirect, jsonify, session, url_for, send_from_directory
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from werkzeug.security import check_password_hash
from dbFuncs import init_db, add_user, get_user_by_email, get_or_create_user_oauth
from ipTools import getCountryCode, getLanguage, getUserIp
from functools import wraps
import requests
import json
import os
import time
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
from aiFuncs import aiInteract

load_dotenv()

DEBUG_MODE = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
YANDEX_CLIENT_ID = os.getenv('YANDEX_CLIENT_ID')
YANDEX_CLIENT_SECRET = os.getenv('YANDEX_CLIENT_SECRET')

app = Flask(__name__)

# A weak/default secret key lets attackers forge session cookies. Require a
# strong value in production; only fall back to a dev key when debugging.
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY or SECRET_KEY == 'dev-key-change-in-production':
    if DEBUG_MODE:
        SECRET_KEY = 'dev-key-change-in-production'
    else:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong random value in production. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
app.secret_key = SECRET_KEY

# Harden the session cookie for production.
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=not DEBUG_MODE,
)

oauth = OAuth(app)
csrf = CSRFProtect(app)

# Rate limiting keyed on the real client IP (respects X-Forwarded-For via
# getUserIp). Note: memory:// is per-process; use Redis when running multiple
# workers/instances.
limiter = Limiter(
    key_func=getUserIp,
    app=app,
    default_limits=["2000 per day", "300 per hour"],
    storage_uri="memory://",
)

# Shared burst cap for the public satellite-data proxy routes.
SAT_DATA_LIMIT = "60 per minute"


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'authenticated' not in session:
            # JSON 401 for API/AJAX endpoints, redirect for page routes.
            if request.path.startswith('/ai/') or request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect('/')
        return f(*args, **kwargs)
    return decorated

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
WEATHER_CACHE_PATH = "dynamic/sats/weather.json"
RESOURCE_CACHE_PATH = "dynamic/sats/resource.json"
ACTIVE_PATH = "dynamic/sats/active.json"
CACHE_MAX_AGE = 72 * 3600

CELESTRAK_GNSS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=json"
CELESTRAK_CUBESAT_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=json"
CELESTRAK_STATIONS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json"
CELESTRAK_STARLINK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json"
CELESTRACK_WEATHER_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json"
CELESTRACK_RESOURCE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=json"
ACTIVE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"

def get_satellite_data(PATH, URL):
    if os.path.exists(PATH) and os.path.getsize(PATH) > 0:
        age = time.time() - os.path.getmtime(PATH)
        if age < CACHE_MAX_AGE:
            try:
                with open(PATH, "r") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                print(f"file corrupted: {PATH}")
    
    try:
        print(f"Fetching {URL}")
        response = requests.get(URL, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        response.raise_for_status()
        data = response.json()

        os.makedirs(os.path.dirname(PATH), exist_ok=True)
        with open(PATH, "w") as f:
            json.dump(data, f, indent=4, sort_keys=True)

        return data
    except Exception as e:
        print(f"Error fetching {URL}: {type(e).__name__}: {e}")
        if os.path.exists(PATH) and os.path.getsize(PATH) > 0:
            try:
                with open(PATH, "r") as f:
                    cached = json.load(f)
                    print(f"Using cached data ({len(cached)} sats)")
                    return cached
            except:
                pass
        return []

def get_template(name, lang):
    return f"{lang}/{name}"

@app.route('/', methods=['GET', 'POST'])
def index():
    IP = getUserIp()
    country_code = getCountryCode(IP)
    auto_lang = getLanguage(country_code)

    lang = request.args.get('lang', auto_lang)
    if lang not in ['en', 'ru']:
        lang = auto_lang

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = get_user_by_email(email)
        if user and check_password_hash(user['password'], password):
            session['authenticated'] = True
            session['user_email'] = email
            session['user_lang'] = lang
            return redirect('/home')
        else:
            return render_template(get_template('welcome.html', lang), error="Invalid email or password", lang=lang)
    return render_template(get_template('welcome.html', lang), lang=lang)

@app.route('/home')
@login_required
def home():
    IP = getUserIp()
    lang = getLanguage(getCountryCode(IP))
    session['pastResponses'] = []
    return render_template(get_template('home.html', lang))

@app.route('/ai/chat', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def chatInteract():
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt')
    if not prompt or not isinstance(prompt, str) or not prompt.strip():
        return jsonify({'error': 'A non-empty prompt is required'}), 400
    aiResponse, session['pastResponses'] = aiInteract(prompt, session.get('pastResponses', []))
    return aiResponse

@app.route('/ai/clear', methods=['POST'])
@login_required
def clear():
    session.pop('pastResponses', None)
    return jsonify({'status': 'ok'})

@app.route('/register', methods=['GET', 'POST'])
def register():
    IP = getUserIp()
    lang = getLanguage(getCountryCode(IP))
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        password_repeat = request.form.get('password_repeat')
        if len(password) < 8:
            return render_template(get_template('register.html', lang), error='Password must be at least 8 characters')
        elif password != password_repeat:
            return render_template(get_template('register.html', lang), error="Passwords don't match!")
        else:
            tryAdd = add_user(email, password)
            if tryAdd:
                return redirect('/')
            else:
                return render_template(get_template('register.html', lang), error='Email already exists')
    return render_template(get_template('register.html', lang))

@app.route('/robots.txt')
def robots():
    return send_from_directory(app.static_folder, 'robots.txt')

@app.route('/AUP')
def AUP():
    IP = getUserIp()
    lang = getLanguage(getCountryCode(IP))
    return render_template(get_template('AUP.html', lang))

@app.route('/error451')
def error451():
    IP = getUserIp()
    lang = getLanguage(getCountryCode(IP))
    return render_template(get_template('error451.html', lang))

@app.route('/dynamic/gnss_sats')
@limiter.limit(SAT_DATA_LIMIT)
def gnss_sats():
    return jsonify(get_satellite_data(GNSS_CACHE_PATH, CELESTRAK_GNSS_URL))

@app.route('/dynamic/stations')
@limiter.limit(SAT_DATA_LIMIT)
def stations():
    return jsonify(get_satellite_data(STATIONS_CACHE_PATH, CELESTRAK_STATIONS_URL))

@app.route('/dynamic/cubesats')
@limiter.limit(SAT_DATA_LIMIT)
def cubesats():
    return jsonify(get_satellite_data(CUBESATS_CACHE_PATH, CELESTRAK_CUBESAT_URL))

@app.route('/dynamic/starlink')
@limiter.limit(SAT_DATA_LIMIT)
def starlink():
    return jsonify(get_satellite_data(STARLINK_CACHE_PATH, CELESTRAK_STARLINK_URL))

@app.route('/dynamic/weather')
@limiter.limit(SAT_DATA_LIMIT)
def weather():
    return jsonify(get_satellite_data(WEATHER_CACHE_PATH, CELESTRACK_WEATHER_URL))

@app.route('/dynamic/resource')
@limiter.limit(SAT_DATA_LIMIT)
def resource():
    return jsonify(get_satellite_data(RESOURCE_CACHE_PATH, CELESTRACK_RESOURCE_URL))

@app.route('/dynamic/active')
@limiter.limit(SAT_DATA_LIMIT)
def active():
    return jsonify(get_satellite_data(ACTIVE_PATH, ACTIVE_URL))

@app.route('/logout', methods = ['POST'])
def logout():
    session.pop('authenticated', None)
    session.pop('user_email', None)
    session.pop('pastResponses', None)
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
    app.run(host="0.0.0.0", port=5000)