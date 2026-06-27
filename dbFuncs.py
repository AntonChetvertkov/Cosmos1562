import sqlite3
import json
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

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT,
            is_group   INTEGER DEFAULT 0,
            created_by TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversation_members (
            conv_id   INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            email     TEXT NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conv_id, email)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            conv_id      INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            sender_email TEXT NOT NULL,
            content      TEXT NOT NULL,
            sent_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_by      TEXT DEFAULT '[]'
        )
    ''')
    conn.commit()
    conn.close()


# ── Chat helpers ─────────────────────────────────────────────────────────────

def is_member(conv_id, email):
    conn = db_connect()
    row = conn.execute(
        'SELECT 1 FROM conversation_members WHERE conv_id=? AND email=?', (conv_id, email)
    ).fetchone()
    conn.close()
    return row is not None

def get_or_create_dm(email_a, email_b):
    conn = db_connect()
    row = conn.execute('''
        SELECT c.id FROM conversations c
        JOIN conversation_members m1 ON m1.conv_id=c.id AND m1.email=?
        JOIN conversation_members m2 ON m2.conv_id=c.id AND m2.email=?
        WHERE c.is_group=0
        LIMIT 1
    ''', (email_a, email_b)).fetchone()
    if row:
        conn.close()
        return row['id']
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO conversations (name, is_group, created_by) VALUES (NULL, 0, ?)', (email_a,)
    )
    conv_id = cursor.lastrowid
    cursor.execute('INSERT INTO conversation_members (conv_id, email) VALUES (?,?)', (conv_id, email_a))
    cursor.execute('INSERT INTO conversation_members (conv_id, email) VALUES (?,?)', (conv_id, email_b))
    conn.commit()
    conn.close()
    return conv_id

def create_group(name, creator_email, member_emails):
    conn = db_connect()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO conversations (name, is_group, created_by) VALUES (?,1,?)', (name, creator_email)
    )
    conv_id = cursor.lastrowid
    emails = list({creator_email} | set(member_emails))
    for e in emails:
        cursor.execute('INSERT INTO conversation_members (conv_id, email) VALUES (?,?)', (conv_id, e))
    conn.commit()
    conn.close()
    return conv_id

def add_group_member(conv_id, email):
    conn = db_connect()
    try:
        conn.execute('INSERT INTO conversation_members (conv_id, email) VALUES (?,?)', (conv_id, email))
        conn.commit()
    except sqlite3.IntegrityError:
        pass
    conn.close()

def get_conversation(conv_id):
    conn = db_connect()
    row = conn.execute('SELECT id, name, is_group, created_by FROM conversations WHERE id=?', (conv_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_members(conv_id):
    conn = db_connect()
    rows = conn.execute('''
        SELECT m.email, u.name
        FROM conversation_members m
        LEFT JOIN users u ON u.email = m.email
        WHERE m.conv_id = ?
        ORDER BY m.joined_at ASC
    ''', (conv_id,)).fetchall()
    conn.close()
    return [{'email': r['email'], 'name': r['name'] or r['email']} for r in rows]

def remove_group_member(conv_id, email):
    conn = db_connect()
    conn.execute('DELETE FROM conversation_members WHERE conv_id=? AND email=?', (conv_id, email))
    conn.commit()
    conn.close()

def rename_group(conv_id, name):
    conn = db_connect()
    conn.execute('UPDATE conversations SET name=? WHERE id=?', (name, conv_id))
    conn.commit()
    conn.close()

def delete_conversation(conv_id):
    conn = db_connect()
    conn.execute('DELETE FROM messages WHERE conv_id=?', (conv_id,))
    conn.execute('DELETE FROM conversation_members WHERE conv_id=?', (conv_id,))
    conn.execute('DELETE FROM conversations WHERE id=?', (conv_id,))
    conn.commit()
    conn.close()

def get_user_conversations(email):
    conn = db_connect()
    rows = conn.execute('''
        SELECT c.id, c.name, c.is_group, c.created_by,
               (SELECT content FROM messages WHERE conv_id=c.id ORDER BY sent_at DESC LIMIT 1) AS last_msg,
               (SELECT sent_at FROM messages WHERE conv_id=c.id ORDER BY sent_at DESC LIMIT 1) AS last_at,
               (SELECT COUNT(*) FROM messages WHERE conv_id=c.id
                AND json_extract(read_by,'$') NOT LIKE '%'||?||'%'
                AND sender_email!=?) AS unread
        FROM conversations c
        JOIN conversation_members m ON m.conv_id=c.id AND m.email=?
        ORDER BY last_at DESC NULLS LAST
    ''', (email, email, email)).fetchall()

    result = []
    for r in rows:
        conv = dict(r)
        if not conv['is_group']:
            other = conn.execute('''
                SELECT u.name, u.email FROM users u
                JOIN conversation_members m ON m.email=u.email
                WHERE m.conv_id=? AND m.email!=?
            ''', (conv['id'], email)).fetchone()
            conv['display_name'] = (other['name'] or other['email']) if other else 'Unknown'
            conv['other_email'] = other['email'] if other else ''
        else:
            conv['display_name'] = conv['name'] or 'Group'
            conv['other_email'] = ''
        result.append(conv)
    conn.close()
    return result

def get_messages(conv_id, email, limit=50, before_id=None):
    conn = db_connect()
    if before_id:
        rows = conn.execute('''
            SELECT m.id, m.conv_id, m.sender_email, m.content, m.sent_at, m.read_by,
                   u.name AS sender_name
            FROM messages m LEFT JOIN users u ON u.email=m.sender_email
            WHERE m.conv_id=? AND m.id<?
            ORDER BY m.sent_at DESC LIMIT ?
        ''', (conv_id, before_id, limit)).fetchall()
    else:
        rows = conn.execute('''
            SELECT m.id, m.conv_id, m.sender_email, m.content, m.sent_at, m.read_by,
                   u.name AS sender_name
            FROM messages m LEFT JOIN users u ON u.email=m.sender_email
            WHERE m.conv_id=?
            ORDER BY m.sent_at DESC LIMIT ?
        ''', (conv_id, limit)).fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]

def save_message(conv_id, sender_email, content):
    conn = db_connect()
    sender_name = conn.execute('SELECT name FROM users WHERE email=?', (sender_email,)).fetchone()
    sender_name = sender_name['name'] if sender_name else sender_email
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO messages (conv_id, sender_email, content, read_by) VALUES (?,?,?,?)',
        (conv_id, sender_email, content, json.dumps([sender_email]))
    )
    msg_id = cursor.lastrowid
    conn.commit()
    row = conn.execute('SELECT sent_at FROM messages WHERE id=?', (msg_id,)).fetchone()
    conn.close()
    return {
        'id': msg_id, 'conv_id': conv_id,
        'sender_email': sender_email, 'sender_name': sender_name,
        'content': content, 'sent_at': row['sent_at'],
    }

def mark_read(conv_id, reader_email):
    conn = db_connect()
    rows = conn.execute(
        "SELECT id, read_by FROM messages WHERE conv_id=? AND sender_email!=? AND read_by NOT LIKE ?",
        (conv_id, reader_email, f'%{reader_email}%')
    ).fetchall()
    for r in rows:
        rb = json.loads(r['read_by'] or '[]')
        if reader_email not in rb:
            rb.append(reader_email)
            conn.execute('UPDATE messages SET read_by=? WHERE id=?', (json.dumps(rb), r['id']))
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