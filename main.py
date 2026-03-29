from flask import Flask, render_template, request, redirect, url_for, jsonify
import requests
import json
import os
import time

app = Flask(__name__)

CACHE_PATH = "dynamic/sats/sats.json"
CACHE_MAX_AGE = 7200
CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=json"
def get_satellite_data():
    if os.path.exists(CACHE_PATH):
        age = time.time() - os.path.getmtime(CACHE_PATH)
        if age < CACHE_MAX_AGE:
            with open(CACHE_PATH, "r") as f:
                return json.load(f)

    response = requests.get(CELESTRAK_URL)
    response.raise_for_status()
    data = response.json()

    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)

    with open(CACHE_PATH, "w") as f:
        json.dump(data, f, indent=4, sort_keys=True)

    return data

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        if email == 'admin@admin.com' and password == 'admin':
            return redirect('/home')
        else:
            return render_template('welcome.html', error="Invalid login")
    return render_template('welcome.html')


@app.route('/home')
def home():
    return render_template('home.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        password_repeat = request.form.get('password_repeat')
        if password != password_repeat:
            return render_template('register.html', error="Passwords don't match!")
        else:
            return redirect('/')
    return render_template('register.html')

@app.route('/dynamic/sats')
def sats():
    return jsonify(get_satellite_data())

if __name__ == '__main__':
    app.run(debug=True)
    
