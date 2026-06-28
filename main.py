import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, redirect, jsonify, session, url_for, send_from_directory, send_file, Response
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
import uuid
import mimetypes
from dbFuncs import (init_db, add_user, get_user_by_email, get_or_create_user_oauth,
                     get_ai_usage, increment_ai_count, update_user_name, update_user_email,
                     update_user_password, delete_user, get_admin_stats, set_user_tier,
                     is_member, get_or_create_dm, create_group, add_group_member,
                     get_user_conversations, get_messages, save_message, mark_read,
                     get_conversation, get_members, remove_group_member, rename_group,
                     delete_conversation, get_member_emails, get_message_file,
                     purge_read_files, save_push_subscription,
                     get_subscriptions_for_emails, delete_push_subscription,
                     get_or_create_invite_token, get_conv_by_invite_token)
from datetime import datetime, timedelta
from ipTools import getCountryCode, getLanguage, getUserIp
from functools import wraps
import requests
import json
import time
from authlib.integrations.flask_client import OAuth
from aiFuncs import aiInteract
from flask_socketio import SocketIO, emit, join_room, disconnect as sock_disconnect

DEBUG_MODE = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

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
    MAX_CONTENT_LENGTH=50 * 1024 * 1024,  # 50 MB cap for chat file uploads
)

CHAT_FILES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat_files')
os.makedirs(CHAT_FILES_DIR, exist_ok=True)

# Web Push (VAPID) — keys generated once and stored in .env (see /chat notes)
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')
VAPID_CLAIM_EMAIL = os.getenv('VAPID_CLAIM_EMAIL', 'mailto:admin@cosmos1562.space')
PUSH_ENABLED = bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)
if PUSH_ENABLED:
    from pywebpush import webpush, WebPushException

oauth = OAuth(app)
csrf = CSRFProtect(app)
socketio = SocketIO(app, async_mode='threading', manage_session=False, cors_allowed_origins='*')
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

def _cat_match(name, patterns):
    n = name.upper()
    return any(p in n for p in patterns)

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
        return redirect('/home')
    return render_template(get_template('welcome.html', lang), lang=lang, show_google=show_google, next_url=next_url)

FREE_AI_LIMIT = 15

@app.route('/home')
def home():
    IP = getUserIp()
    country_code = getCountryCode(IP)
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

@app.route('/register', methods=['GET', 'POST'])
def register():
    IP = getUserIp()
    country_code = getCountryCode(IP)
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
@limiter.limit(SAT_DATA_LIMIT)
def sats_category(category):
    data = get_satellite_data(ACTIVE_PATH, ACTIVE_URL)
    if category == 'other':
        return jsonify([s for s in data if not _cat_match(s['OBJECT_NAME'], _ALL_PATTERNS)])
    pats = _CATEGORIES.get(category)
    if not pats:
        return jsonify([])
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

# ── Chat HTTP routes ──────────────────────────────────────────────────────────

@app.route('/chat')
@login_required
def chat_page():
    _u = get_user_by_email(session['user_email'])
    _name = (_u['name'] if _u and _u['name'] else '') or session['user_email']
    return render_template('chat.html',
        user_email=session['user_email'],
        user_name=_name)

@app.route('/sw.js')
def service_worker():
    # Served from root so its scope covers /chat
    resp = send_from_directory(app.static_folder + '/js', 'sw.js')
    resp.headers['Service-Worker-Allowed'] = '/'
    resp.headers['Cache-Control'] = 'no-cache'
    return resp

@app.route('/manifest.json')
def web_manifest():
    return send_from_directory(app.static_folder, 'manifest.json')

@app.route('/chat/vapid-public-key')
@login_required
def vapid_public_key():
    return jsonify({'key': VAPID_PUBLIC_KEY, 'enabled': PUSH_ENABLED})

@app.route('/chat/subscribe', methods=['POST'])
@csrf.exempt
@login_required
def chat_subscribe():
    sub = request.get_json(silent=True) or {}
    if not sub.get('endpoint'):
        return jsonify({'error': 'invalid subscription'}), 400
    save_push_subscription(session['user_email'], sub)
    return jsonify({'ok': True})

@app.route('/chat/test-push', methods=['POST'])
@csrf.exempt
@login_required
def chat_test_push():
    if not PUSH_ENABLED:
        return jsonify({'error': 'push not configured on server'}), 503
    email = session['user_email']
    subs = get_subscriptions_for_emails([email])
    if not subs:
        return jsonify({'error': 'no subscription on this device'}), 404
    payload = json.dumps({'title': 'Cosmos1562', 'body': 'Test notification ✓', 'url': '/chat'})
    sent, errors = 0, []
    for s in subs:
        try:
            webpush(subscription_info=s['subscription'], data=payload,
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={'sub': VAPID_CLAIM_EMAIL})
            sent += 1
        except WebPushException as ex:
            status = getattr(ex.response, 'status_code', None)
            if status in (404, 410):
                delete_push_subscription(s['endpoint'])
            errors.append(str(status))
        except Exception as ex:
            errors.append(str(ex))
    if sent:
        return jsonify({'ok': True, 'sent': sent})
    return jsonify({'error': 'all sends failed: ' + ','.join(errors)}), 500

@app.route('/chat/conversations')
@login_required
def chat_conversations():
    convs = get_user_conversations(session['user_email'])
    return jsonify(convs)

def _read_and_purge(conv_id, email):
    """Mark conv read for this user, then delete any files everyone has now read."""
    mark_read(conv_id, email)
    paths = purge_read_files(conv_id, get_member_emails(conv_id))
    for p in paths:
        try:
            os.remove(p)
        except OSError:
            pass

def _send_push_to_members(conv_id, sender_email, msg):
    """Send a Web Push notification to every member except the sender."""
    if not PUSH_ENABLED:
        return
    recipients = [e for e in get_member_emails(conv_id) if e != sender_email]
    subs = get_subscriptions_for_emails(recipients)
    if not subs:
        return
    body = msg.get('content') or ''
    if msg.get('has_file'):
        body = f"📎 {msg.get('file_name') or 'File'}" + (f"  {body}" if body else "")
    payload = json.dumps({
        'title': msg.get('sender_name') or sender_email,
        'body': body[:140] or 'New message',
        'conv_id': conv_id,
        'url': '/chat',
    })
    for s in subs:
        try:
            webpush(
                subscription_info=s['subscription'],
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={'sub': VAPID_CLAIM_EMAIL},
            )
        except WebPushException as ex:
            status = getattr(ex.response, 'status_code', None)
            if status in (404, 410):
                delete_push_subscription(s['endpoint'])
        except Exception:
            pass

def push_async(conv_id, sender_email, msg):
    socketio.start_background_task(_send_push_to_members, conv_id, sender_email, msg)

@app.route('/chat/<int:conv_id>/messages')
@login_required
def chat_messages(conv_id):
    email = session['user_email']
    if not is_member(conv_id, email):
        return jsonify({'error': 'forbidden'}), 403
    before_id = request.args.get('before_id', type=int)
    msgs = get_messages(conv_id, email, limit=50, before_id=before_id)
    _read_and_purge(conv_id, email)
    return jsonify(msgs)

@app.route('/chat/<int:conv_id>/upload', methods=['POST'])
@csrf.exempt
@login_required
def chat_upload(conv_id):
    email = session['user_email']
    if not is_member(conv_id, email):
        return jsonify({'error': 'forbidden'}), 403
    f = request.files.get('file')
    if not f or not f.filename:
        return jsonify({'error': 'no file'}), 400

    orig_name = secure_filename(f.filename) or 'file'
    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > 50 * 1024 * 1024:
        return jsonify({'error': 'file too large (max 50MB)'}), 400

    stored = f"{uuid.uuid4().hex}_{orig_name}"
    path = os.path.join(CHAT_FILES_DIR, stored)
    f.save(path)

    mime = f.mimetype or mimetypes.guess_type(orig_name)[0] or 'application/octet-stream'
    caption = (request.form.get('content') or '').strip()
    msg = save_message(conv_id, email, caption,
                       file_path=path, file_name=orig_name, file_size=size, file_mime=mime)
    socketio.emit('new_message', msg, to=f"conv_{conv_id}")
    push_async(conv_id, email, msg)
    return jsonify(msg)

@app.route('/chat/file/<int:msg_id>')
@login_required
def chat_file(msg_id):
    email = session['user_email']
    info = get_message_file(msg_id)
    if not info or not is_member(info['conv_id'], email):
        return jsonify({'error': 'forbidden'}), 403
    if not info['file_path'] or not os.path.exists(info['file_path']):
        return jsonify({'error': 'file expired'}), 404
    return send_file(info['file_path'], as_attachment=True,
                     download_name=info['file_name'], mimetype=info['file_mime'])

@app.route('/chat/dm', methods=['POST'])
@csrf.exempt
@login_required
def chat_dm():
    data = request.get_json()
    target = (data or {}).get('email', '').strip().lower()
    if not target:
        return jsonify({'error': 'email required'}), 400
    from dbFuncs import get_user_by_email as _gube
    if not _gube(target):
        return jsonify({'error': 'user not found'}), 404
    me = session['user_email']
    conv_id = get_or_create_dm(me, target)
    return jsonify({'conv_id': conv_id})

@app.route('/chat/group', methods=['POST'])
@csrf.exempt
@login_required
def chat_group():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    emails = [e.strip().lower() for e in data.get('emails', []) if e.strip()]
    if not name or not emails:
        return jsonify({'error': 'name and emails required'}), 400
    conv_id = create_group(name, session['user_email'], emails)
    return jsonify({'conv_id': conv_id})

@app.route('/chat/group/<int:conv_id>/add', methods=['POST'])
@csrf.exempt
@login_required
def chat_group_add(conv_id):
    me = session['user_email']
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    if not is_member(conv_id, me):
        return jsonify({'error': 'forbidden'}), 403
    if not email or not get_user_by_email(email):
        return jsonify({'error': 'user not found'}), 404
    add_group_member(conv_id, email)
    return jsonify({'ok': True})

@app.route('/chat/group/<int:conv_id>/members', methods=['GET'])
@login_required
def chat_group_members(conv_id):
    me = session['user_email']
    if not is_member(conv_id, me):
        return jsonify({'error': 'forbidden'}), 403
    conv = get_conversation(conv_id)
    return jsonify({
        'members': get_members(conv_id),
        'created_by': conv['created_by'] if conv else '',
        'name': conv['name'] if conv else '',
        'is_owner': bool(conv and conv['created_by'] == me),
    })

@app.route('/chat/group/<int:conv_id>/remove', methods=['POST'])
@csrf.exempt
@login_required
def chat_group_remove(conv_id):
    me = session['user_email']
    conv = get_conversation(conv_id)
    if not conv or not conv['is_group'] or conv['created_by'] != me:
        return jsonify({'error': 'forbidden'}), 403
    email = (request.get_json() or {}).get('email', '').strip().lower()
    if email == conv['created_by']:
        return jsonify({'error': 'cannot remove the owner'}), 400
    remove_group_member(conv_id, email)
    return jsonify({'ok': True})

@app.route('/chat/group/<int:conv_id>/rename', methods=['POST'])
@csrf.exempt
@login_required
def chat_group_rename(conv_id):
    me = session['user_email']
    conv = get_conversation(conv_id)
    if not conv or not conv['is_group'] or conv['created_by'] != me:
        return jsonify({'error': 'forbidden'}), 403
    name = (request.get_json() or {}).get('name', '').strip()
    if not name:
        return jsonify({'error': 'name required'}), 400
    rename_group(conv_id, name)
    return jsonify({'ok': True})

@app.route('/chat/group/<int:conv_id>/invite-link', methods=['GET'])
@login_required
def chat_invite_link(conv_id):
    me = session['user_email']
    conv = get_conversation(conv_id)
    if not conv or not conv['is_group'] or conv['created_by'] != me:
        return jsonify({'error': 'forbidden'}), 403
    token = get_or_create_invite_token(conv_id)
    link = f"{request.host_url}chat/join/{token}"
    return jsonify({'link': link})

@app.route('/chat/join/<token>')
@login_required
def chat_join(token):
    conv = get_conv_by_invite_token(token)
    if not conv:
        return "Invalid or expired invite link.", 404
    add_group_member(conv['id'], session['user_email'])
    return redirect('/chat')

@app.route('/chat/group/<int:conv_id>/delete', methods=['POST'])
@csrf.exempt
@login_required
def chat_group_delete(conv_id):
    me = session['user_email']
    conv = get_conversation(conv_id)
    if not conv or not conv['is_group'] or conv['created_by'] != me:
        return jsonify({'error': 'forbidden'}), 403
    delete_conversation(conv_id)
    return jsonify({'ok': True})

# ── SocketIO events ───────────────────────────────────────────────────────────

_socket_users = {}  # sid -> email

@socketio.on('connect')
def on_connect():
    email = session.get('user_email')
    if not email:
        return False
    _socket_users[request.sid] = email
    for conv in get_user_conversations(email):
        join_room(f"conv_{conv['id']}")

@socketio.on('disconnect')
def on_disconnect():
    _socket_users.pop(request.sid, None)

@socketio.on('join_conv')
def on_join_conv(data):
    email = _socket_users.get(request.sid)
    if not email:
        return
    conv_id = int(data.get('conv_id', 0))
    if is_member(conv_id, email):
        join_room(f"conv_{conv_id}")
        _read_and_purge(conv_id, email)

@socketio.on('send_message')
def on_send_message(data):
    email = _socket_users.get(request.sid)
    if not email:
        return
    conv_id = int(data.get('conv_id', 0))
    content = (data.get('content') or '').strip()
    if not content or not is_member(conv_id, email):
        return
    msg = save_message(conv_id, email, content)
    emit('new_message', msg, to=f"conv_{conv_id}")
    push_async(conv_id, email, msg)

@socketio.on('typing')
def on_typing(data):
    email = _socket_users.get(request.sid)
    if not email:
        return
    conv_id = int(data.get('conv_id', 0))
    if is_member(conv_id, email):
        _u = get_user_by_email(email)
        name = (_u['name'] if _u and _u['name'] else '') or email
        emit('typing', {'conv_id': conv_id, 'sender_name': name},
             to=f"conv_{conv_id}", include_self=False)

# ── Call signaling (WebRTC relay) ─────────────────────────────────────────────

def _relay_call(event, data):
    """Validate membership and relay a call event to the other party in the room."""
    email = _socket_users.get(request.sid)
    if not email:
        return
    conv_id = data.get('conv_id')
    if not conv_id or not is_member(int(conv_id), email):
        return
    emit(event, data, to=f"conv_{conv_id}", skip_sid=request.sid)

@socketio.on('call_invite')
def on_call_invite(data):
    email = _socket_users.get(request.sid)
    if not email:
        return
    conv_id = data.get('conv_id')
    if not conv_id or not is_member(int(conv_id), email):
        return
    _u = get_user_by_email(email)
    data['caller_name'] = (_u['name'] if _u and _u['name'] else '') or email
    data['caller_email'] = email
    emit('call_invite', data, to=f"conv_{conv_id}", skip_sid=request.sid)

@socketio.on('call_accepted')
def on_call_accepted(data): _relay_call('call_accepted', data)

@socketio.on('call_rejected')
def on_call_rejected(data): _relay_call('call_rejected', data)

@socketio.on('call_offer')
def on_call_offer(data): _relay_call('call_offer', data)

@socketio.on('call_answer')
def on_call_answer(data): _relay_call('call_answer', data)

@socketio.on('call_ice')
def on_call_ice(data): _relay_call('call_ice', data)

@socketio.on('call_end')
def on_call_end(data): _relay_call('call_end', data)

# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    socketio.run(app, host="0.0.0.0", port=5000)