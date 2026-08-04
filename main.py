import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, redirect, jsonify, session, url_for, send_from_directory, send_file, Response
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from werkzeug.security import check_password_hash
from dbFuncs import (init_db, add_user, get_user_by_email, get_or_create_user_oauth,
                     get_ai_usage, increment_ai_count, update_user_name, update_user_email,
                     update_user_password, delete_user, get_admin_stats, set_user_tier,
                     get_user_station, set_user_station, list_favorite_satellites,
                     add_favorite_satellite, remove_favorite_satellite, set_favorite_notify,
                     add_push_subscription, get_users_with_alerts, get_favorites_for_user_id,
                     get_push_subscriptions_for_user_id, remove_push_subscription)
from datetime import datetime, timedelta
from ipTools import getCountryCode, getLanguage, getUserIp, getIpLocation
from functools import wraps
import requests
import json
import time
import math
from authlib.integrations.flask_client import OAuth
from aiFuncs import aiInteract
from sgp4.api import Satrec, jday as sgp4_jday
from sgp4 import omm as sgp4_omm
from pywebpush import webpush, WebPushException
from apscheduler.schedulers.background import BackgroundScheduler

DEBUG_MODE = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY')
VAPID_CLAIMS_EMAIL = os.getenv('VAPID_CLAIMS_EMAIL', 'mailto:admin@example.com')

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
YANDEX_CLIENT_ID = os.getenv('YANDEX_CLIENT_ID')
YANDEX_CLIENT_SECRET = os.getenv('YANDEX_CLIENT_SECRET')

app = Flask(__name__)

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

app.permanent_session_lifetime = timedelta(days=30)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=not DEBUG_MODE,
)

oauth = OAuth(app)
csrf = CSRFProtect(app)
init_db()

limiter = Limiter(
    key_func=getUserIp,
    app=app,
    default_limits=["2000 per day", "300 per hour"],
    storage_uri="memory://",
)

SAT_DATA_LIMIT = "600 per minute"


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'authenticated' not in session:
            if request.path.startswith('/ai/') or request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('index', next=request.path))
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

ACTIVE_PATH = "dynamic/sats/active.json"
ACTIVE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"
AMATEUR_TLE_URL = "http://r4uab.ru/satonline.txt"
AMATEUR_TLE_PATH = "dynamic/sats/amateur.json"
CACHE_MAX_AGE = 72 * 3600

_CATEGORIES = {
    'gnss':       ['GPS', 'GLONASS', 'BEIDOU', 'GALILEO', 'NAVIC', 'IRNSS', 'QZSS'],
    'weather':    ['METEOR', 'ELEKTRO', 'ELECTRO', 'ARKTIKA', 'DMSP', 'NOAA', 'JPSS', 'GOES',
                   'SUOMI', 'CYGFM', 'FENGYUN', 'TIANMU', 'METEOSAT', 'METOP', 'INSAT', 'HIMAWARI'],
    'stations':   ['ISS (', 'CSS ('],
    'resource':   ['LANDSAT', 'SENTINEL', 'WORLDVIEW', 'GEOEYE', 'SKYSAT', 'TERRASAR', 'TANDEM-X',
                   'COSMO-SKY', 'RADARSAT', 'RESOURCESAT', 'FORMOSAT', 'CARTOSAT', 'OCEANSAT',
                   'GAOFEN', 'YAOGAN', 'ZIYUAN', 'HAIYANG', 'HUANJING', 'KANOPUS', 'RESURS',
                   'KOMPSAT', 'ARIRANG', 'DEIMOS', 'CBERS', 'PLEIADES', 'FLOCK', 'PELICAN',
                   'TERRA', 'AQUA', 'AURA'],
    'starlink':   ['STARLINK'],
    'commercial': ['ONEWEB', 'IRIDIUM', 'KUIPER', 'QIANFAN'],
}
_ALL_PATTERNS = [p for pats in _CATEGORIES.values() for p in pats]

_SAT_FIELDS = {'OBJECT_NAME','NORAD_CAT_ID','EPOCH','MEAN_MOTION_DOT','MEAN_MOTION_DDOT',
               'BSTAR','INCLINATION','RA_OF_ASC_NODE','ECCENTRICITY','ARG_OF_PERICENTER',
               'MEAN_ANOMALY','MEAN_MOTION'}

_mem_cache = {}

def _cat_match(name, patterns):
    n = name.upper()
    return any(p in n for p in patterns)

def _slim(sat):
    return {k: sat[k] for k in _SAT_FIELDS if k in sat}

def _split_and_cache(data):
    os.makedirs("dynamic/sats", exist_ok=True)
    for cat, pats in _CATEGORIES.items():
        filtered = [_slim(s) for s in data if _cat_match(s['OBJECT_NAME'], pats)]
        path = f"dynamic/sats/{cat}.json"
        with open(path, "w") as f:
            json.dump(filtered, f)
        _mem_cache[cat] = filtered
    other = [_slim(s) for s in data if not _cat_match(s['OBJECT_NAME'], _ALL_PATTERNS)]
    with open("dynamic/sats/other.json", "w") as f:
        json.dump(other, f)
    _mem_cache['other'] = other

def _load_category(category):
    if category in _mem_cache:
        return _mem_cache[category]
    path = f"dynamic/sats/{category}.json"
    if os.path.exists(path) and os.path.getsize(path) > 0:
        active_age = time.time() - os.path.getmtime(ACTIVE_PATH) if os.path.exists(ACTIVE_PATH) else 999999
        if active_age < CACHE_MAX_AGE:
            try:
                with open(path, "r") as f:
                    data = json.load(f)
                _mem_cache[category] = data
                return data
            except json.JSONDecodeError:
                pass
    return None

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
            json.dump(data, f)

        _mem_cache.clear()
        _split_and_cache(data)
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

def _parse_tle_text(text):
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    sats = []
    i = 0
    while i + 2 < len(lines):
        name, line1, line2 = lines[i], lines[i+1], lines[i+2]
        if line1.startswith('1 ') and line2.startswith('2 '):
            sats.append({'name': name, 'line1': line1, 'line2': line2})
        i += 3
    return sats

def get_amateur_tle_data():
    if os.path.exists(AMATEUR_TLE_PATH) and os.path.getsize(AMATEUR_TLE_PATH) > 0:
        age = time.time() - os.path.getmtime(AMATEUR_TLE_PATH)
        if age < CACHE_MAX_AGE:
            try:
                with open(AMATEUR_TLE_PATH, "r") as f:
                    return json.load(f)
            except json.JSONDecodeError:
                print(f"file corrupted: {AMATEUR_TLE_PATH}")

    try:
        print(f"Fetching {AMATEUR_TLE_URL}")
        response = requests.get(AMATEUR_TLE_URL, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        response.raise_for_status()
        sats = _parse_tle_text(response.text)

        os.makedirs(os.path.dirname(AMATEUR_TLE_PATH), exist_ok=True)
        with open(AMATEUR_TLE_PATH, "w") as f:
            json.dump(sats, f)
        return sats
    except Exception as e:
        print(f"Error fetching {AMATEUR_TLE_URL}: {type(e).__name__}: {e}")
        if os.path.exists(AMATEUR_TLE_PATH) and os.path.getsize(AMATEUR_TLE_PATH) > 0:
            try:
                with open(AMATEUR_TLE_PATH, "r") as f:
                    cached = json.load(f)
                    print(f"Using cached data ({len(cached)} sats)")
                    return cached
            except Exception:
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

    show_google = country_code != 'RU'
    next_url = request.args.get('next', '').strip()
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = bool(request.form.get('remember_me'))
        next_url = request.form.get('next', '').strip()
        user = get_user_by_email(email)
        if user and check_password_hash(user['password'], password):
            session.permanent = remember
            session['authenticated'] = True
            session['user_email'] = email
            session['user_lang'] = lang
            if next_url and next_url.startswith('/') and not next_url.startswith('//'):
                return redirect(next_url)
            return redirect('/home')
        else:
            return render_template(get_template('welcome.html', lang), error="Invalid email or password",
                                   lang=lang, show_google=show_google, next_url=next_url)
    if 'authenticated' in session:
        return redirect('/tracker')
    return render_template(get_template('welcome.html', lang), lang=lang, show_google=show_google, next_url=next_url)

FREE_AI_LIMIT = 15

@app.route('/home')
def home_redirect():
    return redirect('/globe')

@app.route('/globe')
def globe_view():
    IP = getUserIp()
    country_code = getCountryCode(IP)
    lang = request.args.get('lang', getLanguage(country_code))
    if lang not in ['en', 'ru']:
        lang = getLanguage(country_code)
    show_google = country_code != 'RU'

    if 'authenticated' not in session:
        return render_template(
            get_template('home.html', lang),
            is_authenticated=False,
            is_paid=False,
            ai_remaining=0,
            user_name='',
            user_email='',
            user_since='—',
            has_password=False,
            google_linked=False,
            yandex_linked=False,
            show_google=show_google,
        )

    session['pastResponses'] = []
    email = session.get('user_email')
    user = get_user_by_email(email)
    count, acc_type = get_ai_usage(email)
    is_paid = acc_type == 'PAID'
    ai_remaining = None if is_paid else max(0, FREE_AI_LIMIT - count)
    created_at = user['created_at'] if user and user['created_at'] else None
    user_since = datetime.strptime(created_at[:10], '%Y-%m-%d').strftime('%d %b %Y') if created_at else '—'
    return render_template(
        get_template('home.html', lang),
        is_authenticated=True,
        ai_remaining=ai_remaining,
        is_paid=is_paid,
        user_name=user['name'] or '' if user else '',
        user_email=email,
        user_since=user_since,
        has_password=bool(user and user['password']),
        google_linked=bool(user and user['google_id']),
        yandex_linked=bool(user and user['yandex_id']),
        show_google=show_google,
    )

def _resolve_tier():
    if 'authenticated' not in session:
        return 'anon'
    _, acc_type = get_ai_usage(session.get('user_email'))
    return 'pro' if acc_type == 'PAID' else 'free'

@app.route('/tracker')
def tracker():
    IP = getUserIp()
    country_code = getCountryCode(IP)
    lang = request.args.get('lang', getLanguage(country_code))
    if lang not in ['en', 'ru']:
        lang = getLanguage(country_code)
    show_google = country_code != 'RU'
    tier = _resolve_tier()
    return render_template(
        get_template('tracker.html', lang),
        is_authenticated='authenticated' in session,
        show_google=show_google,
        tier=tier,
        lang=lang,
        vapid_public_key=VAPID_PUBLIC_KEY or '',
    )

@app.route('/ai/chat', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def chatInteract():
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt')
    if not prompt or not isinstance(prompt, str) or not prompt.strip():
        return jsonify({'error': 'A non-empty prompt is required'}), 400
    email = session.get('user_email')
    count, acc_type = get_ai_usage(email)
    if acc_type != 'PAID' and count >= FREE_AI_LIMIT:
        return jsonify({'error': 'daily_limit', 'message': 'You\'ve used all 15 free messages today. Upgrade for unlimited access.'}), 429
    aiResponse, session['pastResponses'] = aiInteract(prompt, session.get('pastResponses', []))
    increment_ai_count(email)
    return aiResponse

@app.route('/ai/clear', methods=['POST'])
@login_required
def clear():
    session.pop('pastResponses', None)
    return jsonify({'status': 'ok'})

@app.route('/account/update-name', methods=['POST'])
@login_required
def account_update_name():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name cannot be empty'}), 400
    update_user_name(session['user_email'], name)
    return jsonify({'status': 'ok'})

@app.route('/account/update-email', methods=['POST'])
@login_required
def account_update_email():
    data = request.get_json(silent=True) or {}
    new_email = data.get('email', '').strip()
    if not new_email or '@' not in new_email:
        return jsonify({'error': 'Invalid email address'}), 400
    if get_user_by_email(new_email):
        return jsonify({'error': 'Email already in use'}), 400
    update_user_email(session['user_email'], new_email)
    session.clear()
    return jsonify({'status': 'ok'})

@app.route('/account/update-password', methods=['POST'])
@login_required
def account_update_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    user = get_user_by_email(session['user_email'])
    if not user or not user['password'] or not check_password_hash(user['password'], current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    update_user_password(session['user_email'], new_password)
    return jsonify({'status': 'ok'})

@app.route('/account/delete', methods=['POST'])
@login_required
def account_delete():
    delete_user(session['user_email'])
    session.clear()
    return jsonify({'status': 'ok'})

@app.route('/account/export')
@login_required
def account_export():
    user = get_user_by_email(session['user_email'])
    export = {
        'email': user['email'],
        'name': user['name'],
        'account_type': user['acc_type'],
        'created_at': user['created_at'],
        'google_linked': user['google_id'] is not None,
        'yandex_linked': user['yandex_id'] is not None,
    }
    return Response(
        json.dumps(export, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=cosmos1562_data.json'}
    )

@app.route('/account/station', methods=['GET', 'POST'])
@login_required
def account_station():
    email = session['user_email']
    if request.method == 'GET':
        return jsonify(get_user_station(email) or {})
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or 'My Station').strip()
    try:
        lat = float(data['lat'])
        lon = float(data['lon'])
        alt = float(data.get('alt') or 0)
    except (KeyError, TypeError, ValueError):
        return jsonify({'error': 'Invalid station data'}), 400
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        return jsonify({'error': 'Latitude/longitude out of range'}), 400
    set_user_station(email, name, lat, lon, alt)
    return jsonify({'status': 'ok'})

@app.route('/account/favorites', methods=['GET', 'POST'])
@login_required
def account_favorites():
    email = session['user_email']
    if request.method == 'GET':
        return jsonify(list_favorite_satellites(email))
    data = request.get_json(silent=True) or {}
    sat_name = (data.get('sat_name') or '').strip()
    sat_source = data.get('sat_source')
    if not sat_name or sat_source not in ('tle', 'omm'):
        return jsonify({'error': 'Invalid favorite data'}), 400
    try:
        min_elevation = float(data.get('min_elevation') or 10)
    except (TypeError, ValueError):
        min_elevation = 10
    ok = add_favorite_satellite(
        email, sat_name, sat_source,
        line1=data.get('line1'), line2=data.get('line2'),
        norad_id=str(data.get('norad_id')) if data.get('norad_id') else None,
        min_elevation=min_elevation,
    )
    if not ok:
        return jsonify({'error': 'Could not add favorite'}), 400
    return jsonify({'status': 'ok'})

@app.route('/account/favorites/<int:favorite_id>', methods=['DELETE'])
@login_required
def account_favorite_delete(favorite_id):
    remove_favorite_satellite(session['user_email'], favorite_id)
    return jsonify({'status': 'ok'})

@app.route('/account/favorites/<int:favorite_id>/notify', methods=['POST'])
@login_required
def account_favorite_notify(favorite_id):
    data = request.get_json(silent=True) or {}
    set_favorite_notify(session['user_email'], favorite_id, bool(data.get('notify_push')))
    return jsonify({'status': 'ok'})

@app.route('/api/station-ip-location')
def station_ip_location():
    loc = getIpLocation(getUserIp())
    if not loc:
        return jsonify({'error': 'unavailable'}), 404
    return jsonify(loc)

@app.route('/push/vapid-public-key')
def push_vapid_public_key():
    return jsonify({'key': VAPID_PUBLIC_KEY or ''})

@app.route('/api/push/subscribe', methods=['POST'])
@login_required
def push_subscribe():
    data = request.get_json(silent=True) or {}
    sub = data.get('subscription') or {}
    endpoint = sub.get('endpoint')
    keys = sub.get('keys') or {}
    if not endpoint or not keys.get('p256dh') or not keys.get('auth'):
        return jsonify({'error': 'Invalid subscription'}), 400
    timezone = data.get('timezone')
    add_push_subscription(session['user_email'], endpoint, keys['p256dh'], keys['auth'], timezone)
    return jsonify({'status': 'ok'})

@app.route('/register', methods=['GET', 'POST'])
def register():
    IP = getUserIp()
    country_code = getCountryCode(IP)
    lang = request.args.get('lang', getLanguage(country_code))
    if lang not in ['en', 'ru']:
        lang = getLanguage(country_code)
    show_google = country_code != 'RU'
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        password_repeat = request.form.get('password_repeat')
        if len(password) < 8:
            return render_template(get_template('register.html', lang), error='Password must be at least 8 characters', show_google=show_google)
        elif password != password_repeat:
            return render_template(get_template('register.html', lang), error="Passwords don't match!", show_google=show_google)
        else:
            tryAdd = add_user(email, password)
            if tryAdd:
                return redirect('/')
            else:
                return render_template(get_template('register.html', lang), error='Email already exists', show_google=show_google)
    return render_template(get_template('register.html', lang), show_google=show_google)

@app.route('/robots.txt')
def robots():
    return send_from_directory(app.static_folder, 'robots.txt')

@app.route('/sitemap.xml')
def sitemap():
    return send_from_directory(app.static_folder, 'sitemap.xml')

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

@app.route('/dynamic/active')
@limiter.limit(SAT_DATA_LIMIT)
def active():
    return jsonify(get_satellite_data(ACTIVE_PATH, ACTIVE_URL))

@app.route('/dynamic/sats/<category>')
@app.route('/dynamic/sats/<category>.json')
@limiter.limit(SAT_DATA_LIMIT)
def sats_category(category):
    if category == 'amateur':
        return jsonify(get_amateur_tle_data())
    if category not in _CATEGORIES and category != 'other':
        return jsonify([])
    cached = _load_category(category)
    if cached is not None:
        return jsonify(cached)
    data = get_satellite_data(ACTIVE_PATH, ACTIVE_URL)
    if category == 'other':
        return jsonify([s for s in data if not _cat_match(s['OBJECT_NAME'], _ALL_PATTERNS)])
    pats = _CATEGORIES.get(category)
    return jsonify([s for s in data if _cat_match(s['OBJECT_NAME'], pats)])

ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', '')

@app.route('/admin')
@login_required
def admin():
    if not ADMIN_EMAIL or session.get('user_email') != ADMIN_EMAIL:
        return '', 403
    stats = get_admin_stats()

    sat_path = ACTIVE_PATH
    sat_count = 0
    sat_age_h = None
    sat_status = 'missing'
    if os.path.exists(sat_path) and os.path.getsize(sat_path) > 0:
        age_s = time.time() - os.path.getmtime(sat_path)
        sat_age_h = round(age_s / 3600, 1)
        sat_status = 'fresh' if age_s < CACHE_MAX_AGE else 'stale'
        try:
            with open(sat_path) as f:
                sat_count = len(json.load(f))
        except Exception:
            sat_status = 'corrupted'

    return render_template(
        'admin.html',
        stats=stats,
        sat_count=sat_count,
        sat_age_h=sat_age_h,
        sat_status=sat_status,
        cache_max_h=CACHE_MAX_AGE // 3600,
        today=str(datetime.utcnow().date()),
    )

@app.route('/admin/set-tier', methods=['POST'])
@login_required
def admin_set_tier():
    if not ADMIN_EMAIL or session.get('user_email') != ADMIN_EMAIL:
        return '', 403
    email = request.form.get('email', '').strip()
    tier  = request.form.get('tier', '').strip()
    if email and tier in ('BASIC', 'PAID'):
        set_user_tier(email, tier)
    return redirect('/admin')

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
        return redirect('/tracker')
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
        return redirect('/tracker')
    else:
        return redirect('/?error=Failed to create user account')

def _warm_category_cache():
    if os.path.exists(ACTIVE_PATH) and os.path.getsize(ACTIVE_PATH) > 0:
        age = time.time() - os.path.getmtime(ACTIVE_PATH)
        if age < CACHE_MAX_AGE:
            try:
                with open(ACTIVE_PATH, "r") as f:
                    data = json.load(f)
                _split_and_cache(data)
                print(f"Category cache warmed ({len(data)} sats)")
            except Exception as e:
                print(f"Cache warm failed: {e}")

def _warm_amateur_cache():
    try:
        sats = get_amateur_tle_data()
        print(f"Amateur TLE cache warmed ({len(sats)} sats)")
    except Exception as e:
        print(f"Amateur TLE warm failed: {e}")

_warm_category_cache()
_warm_amateur_cache()

_EARTH_A = 6378.137
_EARTH_B = 6356.7523142
_notified_passes = {}
_last_check_time = None

def _gmst(jd_ut1):
    tut1 = (jd_ut1 - 2451545.0) / 36525.0
    temp = (-6.2e-6 * tut1 ** 3 + 0.093104 * tut1 ** 2 +
            (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841)
    temp = math.radians(temp / 240.0) % (2 * math.pi)
    if temp < 0:
        temp += 2 * math.pi
    return temp

def _geodetic_to_ecf(lat, lon, height):
    f = (_EARTH_A - _EARTH_B) / _EARTH_A
    e2 = 2 * f - f * f
    normal = _EARTH_A / math.sqrt(1 - e2 * math.sin(lat) ** 2)
    x = (normal + height) * math.cos(lat) * math.cos(lon)
    y = (normal + height) * math.cos(lat) * math.sin(lon)
    z = (normal * (1 - e2) + height) * math.sin(lat)
    return x, y, z

def _apply_refraction(elevation_deg):
    if elevation_deg > 20 or elevation_deg < -1:
        return elevation_deg
    r = 1.02 / math.tan(math.radians(elevation_deg + 10.3 / (elevation_deg + 5.11))) / 60
    return elevation_deg + r

def _elevation_at(satrec, dt, lat_deg, lon_deg, alt_m):
    jd, fr = sgp4_jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)
    error, position, _velocity = satrec.sgp4(jd, fr)
    if error != 0 or position is None:
        return None
    gmst = _gmst(jd + fr)
    x = position[0] * math.cos(gmst) + position[1] * math.sin(gmst)
    y = -position[0] * math.sin(gmst) + position[1] * math.cos(gmst)
    z = position[2]
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    height = (alt_m or 0) / 1000
    ox, oy, oz = _geodetic_to_ecf(lat, lon, height)
    rx, ry, rz = x - ox, y - oy, z - oz
    top_s = math.sin(lat) * math.cos(lon) * rx + math.sin(lat) * math.sin(lon) * ry - math.cos(lat) * rz
    top_e = -math.sin(lon) * rx + math.cos(lon) * ry
    top_z = math.cos(lat) * math.cos(lon) * rx + math.cos(lat) * math.sin(lon) * ry + math.sin(lat) * rz
    rng = math.sqrt(top_s ** 2 + top_e ** 2 + top_z ** 2)
    if rng == 0:
        return None
    return _apply_refraction(math.degrees(math.asin(top_z / rng)))

def _build_satrec_from_favorite(fav):
    if fav['sat_source'] == 'tle' and fav['line1'] and fav['line2']:
        try:
            return Satrec.twoline2rv(fav['line1'], fav['line2'])
        except Exception:
            return None
    if fav['sat_source'] == 'omm' and fav['norad_id']:
        data = get_satellite_data(ACTIVE_PATH, ACTIVE_URL)
        record = next((s for s in data if str(s.get('NORAD_CAT_ID')) == str(fav['norad_id'])), None)
        if not record:
            return None
        sat = Satrec()
        try:
            sgp4_omm.initialize(sat, record)
        except Exception:
            return None
        return sat
    return None

def _format_local_time(dt_utc, tz_offset):
    try:
        offset = int(tz_offset)
        local = dt_utc + timedelta(hours=offset)
        label = 'UTC' if offset == 0 else f"UTC{'+' if offset > 0 else ''}{offset}"
        return f"{local.strftime('%H:%M')} {label}"
    except (TypeError, ValueError):
        return dt_utc.strftime('%H:%M UTC')

def _find_aos_time(satrec, start, end, min_el, lat, lon, alt, step_seconds=30):
    t = start
    while t <= end:
        el = _elevation_at(satrec, t, lat, lon, alt)
        if el is not None and el >= min_el:
            return t
        t += timedelta(seconds=step_seconds)
    return None

def _send_push(subs, title, aos_dt=None, static_body=None):
    for sub in subs:
        if static_body:
            body = static_body
        elif aos_dt:
            body = f"AOS at {_format_local_time(aos_dt, sub['timezone'])}"
        else:
            body = "Pass update."
        try:
            webpush(
                subscription_info={
                    'endpoint': sub['endpoint'],
                    'keys': {'p256dh': sub['p256dh'], 'auth': sub['auth']},
                },
                data=json.dumps({'title': title, 'body': body}),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={'sub': VAPID_CLAIMS_EMAIL},
            )
        except WebPushException as e:
            if '410' in str(e) or '404' in str(e):
                remove_push_subscription(sub['endpoint'])
            print(f"Push failed: {e}")

def _check_pass_alerts():
    global _last_check_time
    now = datetime.utcnow()
    scan_start = _last_check_time or (now - timedelta(minutes=5))
    horizon = now + timedelta(minutes=10)
    for user in get_users_with_alerts():
        favorites = get_favorites_for_user_id(user['id'])
        if not favorites:
            continue
        subs = get_push_subscriptions_for_user_id(user['id'])
        if not subs:
            continue
        for fav in favorites:
            satrec = _build_satrec_from_favorite(fav)
            if not satrec:
                continue
            min_el = fav['min_elevation'] or 10
            lat, lon, alt = user['station_lat'], user['station_lon'], user['station_alt']

            entered_dt = _find_aos_time(satrec, scan_start, now, min_el, lat, lon, alt, step_seconds=15)
            if entered_dt:
                enter_key = f"{fav['id']}_enter"
                enter_slot = entered_dt.strftime('%Y-%m-%d %H:%M')
                if _notified_passes.get(enter_key) != enter_slot:
                    _notified_passes[enter_key] = enter_slot
                    _send_push(subs, f"{fav['sat_name']} is visible now",
                               static_body="Satellite has risen above your elevation threshold.")

            aos_dt = _find_aos_time(satrec, now, horizon, min_el, lat, lon, alt)
            if aos_dt:
                warn_key = f"{fav['id']}_warn"
                warn_slot = aos_dt.strftime('%Y-%m-%d %H:%M')
                if _notified_passes.get(warn_key) != warn_slot:
                    _notified_passes[warn_key] = warn_slot
                    _send_push(subs, f"{fav['sat_name']} pass starting soon", aos_dt=aos_dt)
    _last_check_time = now

if VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY:
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(_check_pass_alerts, 'interval', minutes=5, id='pass_alerts')
    _scheduler.start()
else:
    print("VAPID keys not configured; pass alerts disabled")

if __name__ == '__main__':
    init_db()
    app.run(host="0.0.0.0", port=5000)
