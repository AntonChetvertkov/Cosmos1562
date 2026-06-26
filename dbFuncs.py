import sqlite3
from pathlib import Path
from datetime import date
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "DBs" / "userTable.db"

def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db_connect()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            google_id TEXT UNIQUE,
            yandex_id TEXT UNIQUE,
            name TEXT,
            surname TEXT,
            acc_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    for col, defn in [('daily_ai_count', 'INTEGER DEFAULT 0'), ('last_ai_date', 'TEXT')]:
        try:
            cursor.execute(f'ALTER TABLE users ADD COLUMN {col} {defn}')
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()

def get_ai_usage(email):
    conn = db_connect()
    row = conn.execute(
        'SELECT daily_ai_count, last_ai_date, acc_type FROM users WHERE email = ?', (email,)
    ).fetchone()
    conn.close()
    if not row:
        return 0, 'BASIC'
    today = str(date.today())
    count = row['daily_ai_count'] or 0
    if row['last_ai_date'] != today:
        count = 0
    return count, row['acc_type'] or 'BASIC'

def increment_ai_count(email):
    conn = db_connect()
    today = str(date.today())
    row = conn.execute(
        'SELECT daily_ai_count, last_ai_date FROM users WHERE email = ?', (email,)
    ).fetchone()
    if row and row['last_ai_date'] == today:
        new_count = (row['daily_ai_count'] or 0) + 1
    else:
        new_count = 1
    conn.execute(
        'UPDATE users SET daily_ai_count = ?, last_ai_date = ? WHERE email = ?',
        (new_count, today, email)
    )
    conn.commit()
    conn.close()

def get_or_create_user_oauth(email, provider_id, name, provider):
    conn = db_connect()
    cursor = conn.cursor()
    
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    
    if user:
        if provider == 'google':
            cursor.execute('UPDATE users SET google_id = ? WHERE email = ?', (provider_id, email))
        elif provider == 'yandex':
            cursor.execute('UPDATE users SET yandex_id = ? WHERE email = ?', (provider_id, email))
        cursor.execute('UPDATE users SET name = ? WHERE email = ?', (name, email))
        conn.commit()
    else:
        try:
            if provider == 'google':
                cursor.execute(
                    'INSERT INTO users (email, google_id, name, acc_type) VALUES (?, ?, ?, ?)',
                    (email, provider_id, name, 'BASIC')
                )
            elif provider == 'yandex':
                cursor.execute(
                    'INSERT INTO users (email, yandex_id, name, acc_type) VALUES (?, ?, ?, ?)',
                    (email, provider_id, name, 'BASIC')
                )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return None
    
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    return user

def get_user_by_email(email):
    conn = db_connect()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    return user

def add_user(email, password):
    hashedPassword = generate_password_hash(password)
    conn = db_connect()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (email, password, acc_type) VALUES (?, ?, ?)
        ''', (email, hashedPassword, 'BASIC'))
    except sqlite3.IntegrityError as e:
        conn.commit()
        conn.close()
        return False
    conn.commit()
    conn.close()
    return True


def update_user_name(email, name):
    conn = db_connect()
    conn.execute('UPDATE users SET name = ? WHERE email = ?', (name, email))
    conn.commit()
    conn.close()

def update_user_email(old_email, new_email):
    conn = db_connect()
    conn.execute('UPDATE users SET email = ? WHERE email = ?', (new_email, old_email))
    conn.commit()
    conn.close()

def update_user_password(email, new_password):
    conn = db_connect()
    conn.execute('UPDATE users SET password = ? WHERE email = ?', (generate_password_hash(new_password), email))
    conn.commit()
    conn.close()

def delete_user(email):
    conn = db_connect()
    conn.execute('DELETE FROM users WHERE email = ?', (email,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = db_connect()
    users = conn.execute('SELECT * FROM users ORDER BY created_at DESC').fetchall()
    conn.close()
    return users

def set_user_tier(email, tier):
    conn = db_connect()
    conn.execute('UPDATE users SET acc_type = ? WHERE email = ?', (tier, email))
    conn.commit()
    conn.close()

def get_admin_stats():
    conn = db_connect()
    today = str(date.today())

    total = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    paid  = conn.execute("SELECT COUNT(*) FROM users WHERE acc_type = 'PAID'").fetchone()[0]
    basic = total - paid

    week  = conn.execute("SELECT COUNT(*) FROM users WHERE date(created_at) >= date('now', '-7 days')").fetchone()[0]
    month = conn.execute("SELECT COUNT(*) FROM users WHERE date(created_at) >= date('now', '-30 days')").fetchone()[0]

    email_only  = conn.execute('SELECT COUNT(*) FROM users WHERE google_id IS NULL AND yandex_id IS NULL').fetchone()[0]
    google_only = conn.execute('SELECT COUNT(*) FROM users WHERE google_id IS NOT NULL AND yandex_id IS NULL').fetchone()[0]
    yandex_only = conn.execute('SELECT COUNT(*) FROM users WHERE yandex_id IS NOT NULL AND google_id IS NULL').fetchone()[0]
    multi_oauth = conn.execute('SELECT COUNT(*) FROM users WHERE google_id IS NOT NULL AND yandex_id IS NOT NULL').fetchone()[0]

    ai_today = conn.execute(
        'SELECT COALESCE(SUM(daily_ai_count), 0) FROM users WHERE last_ai_date = ?', (today,)
    ).fetchone()[0]
    at_limit = conn.execute(
        "SELECT COUNT(*) FROM users WHERE last_ai_date = ? AND daily_ai_count >= 15 AND (acc_type = 'BASIC' OR acc_type IS NULL)",
        (today,)
    ).fetchone()[0]

    users = conn.execute('SELECT * FROM users ORDER BY created_at DESC').fetchall()
    conn.close()

    return {
        'total': total, 'paid': paid, 'basic': basic,
        'week': week, 'month': month,
        'email_only': email_only, 'google_only': google_only,
        'yandex_only': yandex_only, 'multi_oauth': multi_oauth,
        'ai_today': ai_today, 'at_limit': at_limit,
        'users': [dict(u) for u in users],
    }

if __name__ == "__main__":
    init_db()