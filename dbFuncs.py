import sqlite3
from pathlib import Path

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
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def add_test_user():
    conn = db_connect()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO users (email, password) VALUES (?, ?)
    ''', ("antonchetvertkov@gmail.com", "SECURE_PASSWORD"))
    conn.commit()
    conn.close()

def get_all_users():
    conn = db_connect()
    users = conn.execute('SELECT * FROM users').fetchall()
    conn.close()
    return users

if __name__ == "__main__":
    init_db()
    add_test_user()
    users = get_all_users()
    print(users)