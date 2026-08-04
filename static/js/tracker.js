import {
    twoline2satrec,
    json2satrec,
    propagate,
    gstime,
    eciToGeodetic,
    eciToEcf,
    ecfToLookAngles,
    radiansLat,
    radiansLong,
} from '/static/js/vendor/satellite.js';
import { getSatOperator } from '/static/js/data.js';

const STORAGE_KEY = 'cosmos_ground_station';
const CATEGORIES = ['amateur', 'stations', 'gnss', 'weather', 'resource', 'starlink', 'commercial', 'other'];
const TIER = window.TRACKER_TIER || 'anon';
const HAS_EXTRAS = TIER !== 'anon';
const TIER_LOOKAHEAD_HOURS = { anon: 24, free: 72, pro: 336 };

let station = loadStation();
let currentCategory = 'amateur';
let allSats = [];
let selectedSat = null;
let currentPasses = [];
let liveInterval = null;
let favoriteNames = new Set();
let favoritesById = {};
let favoriteSatObjs = [];
let ommLookupPromise = null;

const TRACK_COLORS = ['#00c8ff', '#ff8800', '#00ff88', '#ff4477', '#aa88ff', '#ffee44', '#44ffee', '#ff6644'];
const OMM_CATEGORIES = ['gnss', 'weather', 'stations', 'resource', 'starlink', 'commercial', 'other'];

function csrfHeaders() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? { 'X-CSRFToken': meta.content } : {};
}

function loadStation() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveStation(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function showStationMsg(text, isError) {
    const el = document.getElementById('station-msg');
    el.textContent = text;
    el.style.color = isError ? 'var(--red)' : 'var(--cyan)';
    setTimeout(() => { el.textContent = ''; }, 5000);
}

function updateStationDisplay() {
    const nameEl = document.getElementById('station-name-display');
    const coordsEl = document.getElementById('station-coords-display');
    if (!station) {
        nameEl.textContent = 'Not set';
        coordsEl.textContent = '— , —';
        return;
    }
    nameEl.textContent = station.name;
    coordsEl.textContent = `${station.lat.toFixed(4)}°, ${station.lon.toFixed(4)}° · ${station.alt.toFixed(0)} m`;
}

function applyStation(s) {
    station = s;
    saveStation(station);
    updateStationDisplay();
    syncStationToServer(s);
    recompute();
}

async function syncStationToServer(s) {
    if (!HAS_EXTRAS) return;
    try {
        await fetch('/account/station', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
            body: JSON.stringify({ name: s.name, lat: s.lat, lon: s.lon, alt: s.alt }),
        });
    } catch {
        showStationMsg('Saved locally, but could not sync to your account for alerts.', true);
    }
}

document.getElementById('geo-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
        showStationMsg('Geolocation not supported by this browser.', true);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        pos => {
            applyStation({
                name: 'My Location',
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                alt: pos.coords.altitude || 0,
            });
        },
        () => showStationMsg('Location permission denied — try IP detection or manual entry.', true),
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

document.getElementById('ip-btn').addEventListener('click', async () => {
    try {
        const res = await fetch('/api/station-ip-location');
        if (!res.ok) throw new Error('unavailable');
        const data = await res.json();
        if (typeof data.lat !== 'number' || typeof data.lon !== 'number') throw new Error('bad response');
        applyStation({
            name: data.city || 'IP Location',
            lat: data.lat,
            lon: data.lon,
            alt: 0,
        });
    } catch {
        showStationMsg('IP-based location unavailable — use manual entry.', true);
    }
});

const manualForm = document.getElementById('manual-form');
document.getElementById('manual-btn').addEventListener('click', () => {
    manualForm.hidden = !manualForm.hidden;
    if (!manualForm.hidden && station) {
        document.getElementById('manual-name').value = station.name;
        document.getElementById('manual-lat').value = station.lat;
        document.getElementById('manual-lon').value = station.lon;
        document.getElementById('manual-alt').value = station.alt;
    }
});

document.getElementById('manual-save').addEventListener('click', () => {
    const name = document.getElementById('manual-name').value.trim() || 'Manual Station';
    const lat = parseFloat(document.getElementById('manual-lat').value);
    const lon = parseFloat(document.getElementById('manual-lon').value);
    const alt = parseFloat(document.getElementById('manual-alt').value) || 0;
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        showStationMsg('Latitude must be between -90 and 90.', true);
        return;
    }
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
        showStationMsg('Longitude must be between -180 and 180.', true);
        return;
    }
    applyStation({ name, lat, lon, alt });
    manualForm.hidden = true;
});

async function loadCategory(cat) {
    const res = await fetch(`/dynamic/sats/${cat}`);
    const data = await res.json();
    return data.map(s => s.line1
        ? { name: s.name, source: 'tle', line1: s.line1, line2: s.line2 }
        : { name: s.OBJECT_NAME, source: 'omm', raw: s }
    );
}

function buildSatrec(sat) {
    return sat.source === 'tle' ? twoline2satrec(sat.line1, sat.line2) : json2satrec(sat.raw);
}

function countryRank(name) {
    const operator = getSatOperator(name);
    if (operator === 'Russia') return 0;
    if (name.includes('ISS')) return 1;
    if (operator === 'China') return 2;
    return 3;
}

function renderSatList(list) {
    const ul = document.getElementById('sat-list');
    ul.innerHTML = '';
    if (list.length === 0) {
        const li = document.createElement('li');
        li.className = 'sat-list-empty';
        li.textContent = 'No satellites found.';
        ul.appendChild(li);
        return;
    }
    const sorted = list.slice().sort((a, b) => countryRank(a.name) - countryRank(b.name));
    for (const sat of sorted.slice(0, 300)) {
        const li = document.createElement('li');
        li.dataset.name = sat.name;
        if (selectedSat && selectedSat.name === sat.name) li.classList.add('active');
        if (HAS_EXTRAS) {
            const star = document.createElement('span');
            star.className = 'fav-star';
            star.textContent = favoriteNames.has(sat.name) ? '★' : '☆';
            star.addEventListener('click', e => {
                e.stopPropagation();
                toggleFavorite(sat);
            });
            li.appendChild(star);
        }
        const label = document.createElement('span');
        label.textContent = sat.name;
        li.appendChild(label);
        li.addEventListener('click', () => selectSatellite(sat));
        ul.appendChild(li);
    }
}

async function getOmmLookup() {
    if (!ommLookupPromise) {
        ommLookupPromise = Promise.all(OMM_CATEGORIES.map(c =>
            fetch(`/dynamic/sats/${c}`).then(r => r.json()).catch(() => [])
        )).then(results => {
            const lookup = {};
            for (const list of results) {
                for (const rec of list) {
                    if (rec.NORAD_CAT_ID) lookup[String(rec.NORAD_CAT_ID)] = rec;
                }
            }
            return lookup;
        });
    }
    return ommLookupPromise;
}

async function loadFavorites() {
    favoriteSatObjs = [];
    if (!HAS_EXTRAS) return;
    try {
        const res = await fetch('/account/favorites');
        if (!res.ok) return;
        const favs = await res.json();
        favoriteNames = new Set(favs.map(f => f.sat_name));
        favoritesById = {};
        for (const f of favs) favoritesById[f.sat_name] = f.id;

        const needsOmm = favs.some(f => f.sat_source === 'omm');
        const lookup = needsOmm ? await getOmmLookup() : null;
        for (const f of favs) {
            let satrec = null;
            try {
                if (f.sat_source === 'tle' && f.line1 && f.line2) {
                    satrec = twoline2satrec(f.line1, f.line2);
                } else if (f.sat_source === 'omm' && lookup && lookup[String(f.norad_id)]) {
                    satrec = json2satrec(lookup[String(f.norad_id)]);
                }
            } catch {
                satrec = null;
            }
            if (satrec) favoriteSatObjs.push({ name: f.sat_name, satrec, minElevation: f.min_elevation || 10 });
        }
    } catch {
        favoriteNames = new Set();
    }
}

async function toggleFavorite(sat) {
    if (favoriteNames.has(sat.name)) {
        const id = favoritesById[sat.name];
        await fetch(`/account/favorites/${id}`, { method: 'DELETE', headers: csrfHeaders() });
        favoriteNames.delete(sat.name);
    } else {
        const body = {
            sat_name: sat.name,
            sat_source: sat.source,
            line1: sat.line1,
            line2: sat.line2,
            norad_id: sat.source === 'omm' ? sat.raw.NORAD_CAT_ID : null,
        };
        const res = await fetch('/account/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
            body: JSON.stringify(body),
        });
        if (res.ok) favoriteNames.add(sat.name);
    }
    await loadFavorites();
    renderSatList(allSats);
    recompute();
}

async function switchCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    allSats = await loadCategory(cat);
    document.getElementById('sat-search').value = '';
    renderSatList(allSats);
}

document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => switchCategory(btn.dataset.cat));
});

document.getElementById('sat-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    renderSatList(q ? allSats.filter(s => s.name.toLowerCase().includes(q)) : allSats);
});

function updateGroundTrack(sat) {
    if (!HAS_EXTRAS) return;
    const passesAhead = parseFloat(document.getElementById('passes-ahead').value) || 3;
    sat.groundTrack = computeGroundTrack(sat.satrec, orbitalPeriodSeconds(sat.satrec) * passesAhead);
}

function selectSatellite(sat) {
    selectedSat = sat;
    document.querySelectorAll('#sat-list li').forEach(li => li.classList.toggle('active', li.dataset.name === sat.name));
    if (!sat.satrec) sat.satrec = buildSatrec(sat);
    recompute();
}

const passesAheadInput = document.getElementById('passes-ahead');
if (passesAheadInput) {
    passesAheadInput.addEventListener('input', e => {
        document.getElementById('passes-ahead-value').textContent = e.target.value;
        const passesAhead = parseFloat(e.target.value) || 3;
        if (favoriteSatObjs.length > 0) {
            for (const s of favoriteSatObjs) {
                s.groundTrack = computeGroundTrack(s.satrec, orbitalPeriodSeconds(s.satrec) * passesAhead);
            }
        } else if (selectedSat) {
            updateGroundTrack(selectedSat);
        }
    });
}

function applyRefraction(elevationDeg) {
    if (elevationDeg > 20 || elevationDeg < -1) return elevationDeg;
    const r = 1.02 / Math.tan((elevationDeg + 10.3 / (elevationDeg + 5.11)) * Math.PI / 180) / 60;
    return elevationDeg + r;
}

function lookAnglesAt(satrec, date, st) {
    const pv = propagate(satrec, date);
    if (!pv || !pv.position) return null;
    const gmst = gstime(date);
    const satEcf = eciToEcf(pv.position, gmst);
    const observerGeodetic = {
        longitude: radiansLong(st.lon),
        latitude: radiansLat(st.lat),
        height: (st.alt || 0) / 1000,
    };
    const look = ecfToLookAngles(observerGeodetic, satEcf);
    const geo = eciToGeodetic(pv.position, gmst);
    const vel = pv.velocity;
    const speed = vel ? Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) : null;
    return {
        azimuth: (look.azimuth * 180 / Math.PI + 360) % 360,
        elevation: applyRefraction(look.elevation * 180 / Math.PI),
        range: look.rangeSat,
        altitude: geo.height,
        velocity: speed,
        lat: geo.latitude * 180 / Math.PI,
        lon: geo.longitude * 180 / Math.PI,
    };
}

const TRACK_TARGET_POINTS = 1500;
const TRACK_MIN_STEP_SECONDS = 15;

function orbitalPeriodSeconds(satrec) {
    return (2 * Math.PI / satrec.no) * 60;
}

function computeGroundTrack(satrec, durationSeconds) {
    const stepSeconds = Math.max(TRACK_MIN_STEP_SECONDS, durationSeconds / TRACK_TARGET_POINTS);
    const steps = Math.ceil(durationSeconds / stepSeconds);
    const now = new Date();
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const t = new Date(now.getTime() + i * stepSeconds * 1000);
        const pv = propagate(satrec, t);
        if (!pv || !pv.position) continue;
        const gmst = gstime(t);
        const geo = eciToGeodetic(pv.position, gmst);
        points.push({ lon: geo.longitude * 180 / Math.PI, lat: geo.latitude * 180 / Math.PI });
    }
    const segments = [];
    let seg = [];
    for (const point of points) {
        if (seg.length > 0 && Math.abs(point.lon - seg[seg.length - 1].lon) > 180) {
            segments.push(seg);
            seg = [];
        }
        seg.push(point);
    }
    if (seg.length) segments.push(seg);
    return segments;
}

const mapImage = new Image();
let mapImageReady = false;
mapImage.onload = () => { mapImageReady = true; };
mapImage.src = '/static/img/country-outlines-4k.png';

function projectPoint(lonDeg, latDeg, width, height) {
    return {
        x: (lonDeg + 180) / 360 * width,
        y: (90 - latDeg) / 180 * height,
    };
}

function lerpColor(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
}

function drawTrackMap(segments, st, currentPoint) {
    const canvas = document.getElementById('track-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#060d18';
    ctx.fillRect(0, 0, width, height);
    if (mapImageReady) {
        ctx.drawImage(mapImage, 0, 0, width, height);
    }

    const totalPoints = segments.reduce((n, s) => n + s.length, 0) || 1;
    let idx = 0;
    ctx.lineWidth = 2;
    for (const seg of segments) {
        for (let i = 0; i < seg.length - 1; i++) {
            const p1 = projectPoint(seg[i].lon, seg[i].lat, width, height);
            const p2 = projectPoint(seg[i + 1].lon, seg[i + 1].lat, width, height);
            ctx.strokeStyle = lerpColor('#ff4444', '#00ff88', idx / totalPoints);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            idx++;
        }
        idx++;
    }

    if (st) {
        const p = projectPoint(st.lon, st.lat, width, height);
        ctx.fillStyle = '#00c8ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    if (currentPoint) {
        const p = projectPoint(currentPoint.lon, currentPoint.lat, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00c8ff';
        ctx.stroke();
    }
}

function drawTrackMapMulti(sats, st) {
    const canvas = document.getElementById('track-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#060d18';
    ctx.fillRect(0, 0, width, height);
    if (mapImageReady) {
        ctx.drawImage(mapImage, 0, 0, width, height);
    }

    sats.forEach((s, idx) => {
        if (!s.groundTrack) return;
        const color = TRACK_COLORS[idx % TRACK_COLORS.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (const seg of s.groundTrack) {
            ctx.beginPath();
            seg.forEach((pt, i) => {
                const p = projectPoint(pt.lon, pt.lat, width, height);
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        }
        if (s.currentPoint) {
            const p = projectPoint(s.currentPoint.lon, s.currentPoint.lat, width, height);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.fillText(s.name, p.x + 8, p.y - 8);
        }
    });

    if (st) {
        const p = projectPoint(st.lon, st.lat, width, height);
        ctx.fillStyle = '#00c8ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function polarProject(azDeg, elDeg, cx, cy, radius) {
    const r = radius * (1 - Math.max(0, elDeg) / 90);
    const a = (azDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function drawRadar(azDeg, elDeg, track) {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 24;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060d18';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#0d3a52';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1].forEach(f => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * f, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.fillStyle = '#2e5f7a';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radius - 8);
    ctx.fillText('S', cx, cy + radius + 16);
    ctx.fillText('E', cx + radius + 12, cy + 4);
    ctx.fillText('W', cx - radius - 12, cy + 4);

    if (track && track.length > 1) {
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        track.forEach((pt, i) => {
            const p = polarProject(pt.az, pt.el, cx, cy, radius);
            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        const start = polarProject(track[0].az, track[0].el, cx, cy, radius);
        const end = polarProject(track[track.length - 1].az, track[track.length - 1].el, cx, cy, radius);
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    if (azDeg != null && elDeg != null && elDeg >= 0) {
        const { x, y } = polarProject(azDeg, elDeg, cx, cy, radius);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
function compass(deg) {
    return COMPASS[Math.round(deg / 22.5) % 16];
}

function computePasses(satrec, st, { minElevationDeg = 10, lookaheadHours = 48, stepSeconds = 30 } = {}) {
    const passes = [];
    const start = new Date();
    const end = new Date(start.getTime() + lookaheadHours * 3600 * 1000);
    let current = null;
    for (let t = new Date(start); t <= end; t = new Date(t.getTime() + stepSeconds * 1000)) {
        const la = lookAnglesAt(satrec, t, st);
        if (!la) continue;
        if (la.elevation >= minElevationDeg) {
            if (!current) {
                current = { aos: new Date(t), azAtAos: la.azimuth, maxEl: la.elevation };
            } else if (la.elevation > current.maxEl) {
                current.maxEl = la.elevation;
            }
            current.los = new Date(t);
            current.azAtLos = la.azimuth;
        } else if (current) {
            passes.push(finalizePass(current));
            current = null;
        }
    }
    if (current) passes.push(finalizePass(current));
    return passes;
}

function computeMultiPasses(sats, st, opts) {
    const all = [];
    for (const s of sats) {
        const passes = computePasses(s.satrec, st, { ...opts, minElevationDeg: s.minElevation || opts.minElevationDeg });
        for (const p of passes) all.push({ ...p, satName: s.name });
    }
    all.sort((a, b) => a.aos - b.aos);
    return all;
}

function finalizePass(p) {
    return {
        aos: p.aos,
        los: p.los,
        maxElevation: p.maxEl,
        durationSeconds: (p.los.getTime() - p.aos.getTime()) / 1000,
        direction: `${compass(p.azAtAos)} → ${compass(p.azAtLos)}`,
    };
}

const TZ_STORAGE_KEY = 'cosmos_tz_offset';
const IS_RU = window.TRACKER_LANG === 'ru';

function loadTzOffset() {
    const raw = localStorage.getItem(TZ_STORAGE_KEY);
    const parsed = raw !== null ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(parsed)) return parsed;
    return IS_RU ? 3 : 0;
}

let tzOffsetHours = loadTzOffset();

function tzLabel(offset) {
    return offset === 0 ? 'UTC' : `UTC${offset > 0 ? '+' : ''}${offset}`;
}

function setTzOffset(offset) {
    tzOffsetHours = offset;
    localStorage.setItem(TZ_STORAGE_KEY, String(offset));
    const tzNameEl = document.getElementById('tz-name');
    if (tzNameEl) tzNameEl.textContent = tzLabel(offset);
    if (currentPasses.length) renderPasses(currentPasses);
}

function formatTime(date) {
    const shifted = new Date(date.getTime() + tzOffsetHours * 3600000);
    return shifted.toLocaleString('en-US', {
        timeZone: 'UTC',
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        hour12: false,
    });
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

function td(text) {
    const el = document.createElement('td');
    el.textContent = text;
    return el;
}

function renderPasses(passes) {
    const tbody = document.getElementById('passes-body');
    tbody.innerHTML = '';
    if (passes.length === 0) {
        const tr = document.createElement('tr');
        const cell = td('No passes above minimum elevation in this window.');
        cell.colSpan = 6;
        tr.appendChild(cell);
        tbody.appendChild(tr);
        return;
    }
    for (const p of passes) {
        const tr = document.createElement('tr');
        tr.appendChild(td(p.satName || ''));
        tr.appendChild(td(formatTime(p.aos)));
        tr.appendChild(td(`${p.maxElevation.toFixed(1)}°`));
        tr.appendChild(td(formatTime(p.los)));
        tr.appendChild(td(formatDuration(p.durationSeconds)));
        tr.appendChild(td(p.direction));
        tbody.appendChild(tr);
    }
}

function computeRadarTrack(satrec, st, aos, los, stepSeconds = 15) {
    const points = [];
    for (let t = new Date(aos); t <= los; t = new Date(t.getTime() + stepSeconds * 1000)) {
        const la = lookAnglesAt(satrec, t, st);
        if (la && la.elevation >= 0) points.push({ az: la.azimuth, el: la.elevation });
    }
    return points;
}

function nextPassLabel() {
    const now = new Date();
    const active = currentPasses.find(p => p.aos <= now && p.los >= now);
    if (active) return `LOS in ${formatDuration((active.los.getTime() - now.getTime()) / 1000)}`;
    const upcoming = currentPasses.find(p => p.aos > now);
    if (upcoming) return `AOS in ${formatDuration((upcoming.aos.getTime() - now.getTime()) / 1000)}`;
    return '—';
}

function stopLiveTracking() {
    if (liveInterval) clearInterval(liveInterval);
    liveInterval = null;
}

function startTrackingLoop(st) {
    stopLiveTracking();
    if (!HAS_EXTRAS) return;
    const multiMode = favoriteSatObjs.length > 0;

    document.getElementById('track-map-empty').style.display = 'none';
    document.getElementById('track-map').style.display = 'block';
    document.getElementById('track-map-sat-name').textContent = multiMode
        ? ` — ${favoriteSatObjs.length} starred`
        : (selectedSat ? ` — ${selectedSat.name}` : '');

    if (multiMode) {
        const passesAhead = parseFloat(document.getElementById('passes-ahead')?.value) || 3;
        for (const s of favoriteSatObjs) {
            s.groundTrack = computeGroundTrack(s.satrec, orbitalPeriodSeconds(s.satrec) * passesAhead);
        }
    } else if (selectedSat) {
        updateGroundTrack(selectedSat);
    }

    if (selectedSat) {
        document.getElementById('live-sat-name').textContent = ` — ${selectedSat.name}`;
        document.getElementById('radar-sat-name').textContent = ` — ${selectedSat.name}`;
        document.getElementById('radar-empty').style.display = 'none';
        document.getElementById('radar-canvas').style.display = 'block';
    }

    const update = () => {
        const now = new Date();

        if (multiMode) {
            for (const s of favoriteSatObjs) {
                const la = lookAnglesAt(s.satrec, now, st);
                s.currentPoint = la ? { lon: la.lon, lat: la.lat } : null;
            }
            drawTrackMapMulti(favoriteSatObjs, st);
        } else if (selectedSat && selectedSat.groundTrack) {
            const la = lookAnglesAt(selectedSat.satrec, now, st);
            if (la) drawTrackMap(selectedSat.groundTrack, st, { lon: la.lon, lat: la.lat });
        }

        if (selectedSat) {
            const la = lookAnglesAt(selectedSat.satrec, now, st);
            if (la) {
                document.getElementById('live-az').textContent = `${la.azimuth.toFixed(1)}°`;
                document.getElementById('live-el').textContent = `${la.elevation.toFixed(1)}°`;
                document.getElementById('live-range').textContent = `${la.range.toFixed(0)} km`;
                document.getElementById('live-alt').textContent = `${la.altitude.toFixed(0)} km`;
                document.getElementById('live-vel').textContent = la.velocity ? `${la.velocity.toFixed(2)} km/s` : '—';
                drawRadar(la.azimuth, la.elevation, selectedSat.radarTrack);
            }
        }
        document.getElementById('live-next').textContent = nextPassLabel();
    };
    update();
    liveInterval = setInterval(update, 1000);
}

function recompute() {
    const passesEmpty = document.getElementById('passes-empty');
    const passesTable = document.getElementById('passes-table');
    const multiMode = favoriteSatObjs.length > 0;

    if (!station || (!selectedSat && !multiMode)) {
        passesEmpty.style.display = 'block';
        passesTable.style.display = 'none';
        document.getElementById('passes-sat-name').textContent = '';
        stopLiveTracking();
        if (HAS_EXTRAS) {
            document.getElementById('live-sat-name').textContent = '';
            document.getElementById('track-map-sat-name').textContent = '';
            document.getElementById('radar-sat-name').textContent = '';
            document.getElementById('radar-empty').style.display = 'block';
            document.getElementById('radar-canvas').style.display = 'none';
            ['live-az', 'live-el', 'live-range', 'live-alt', 'live-vel', 'live-next'].forEach(id => {
                document.getElementById(id).textContent = '—';
            });
            if (station) {
                document.getElementById('track-map-empty').style.display = 'none';
                document.getElementById('track-map').style.display = 'block';
                drawTrackMap([], station, null);
            } else {
                document.getElementById('track-map-empty').style.display = 'block';
                document.getElementById('track-map').style.display = 'none';
            }
        }
        return;
    }
    passesEmpty.style.display = 'none';
    passesTable.style.display = '';
    document.getElementById('passes-sat-name').textContent = multiMode
        ? ` — ${favoriteSatObjs.length} starred`
        : ` — ${selectedSat.name}`;
    const maxHours = TIER_LOOKAHEAD_HOURS[TIER] || 24;
    const minEl = parseFloat(document.getElementById('min-elevation').value) || 10;
    const rawHours = parseFloat(document.getElementById('lookahead-hours').value) || maxHours;
    const hours = Math.min(maxHours, Math.max(1, rawHours));
    document.getElementById('lookahead-hours').value = hours;
    currentPasses = multiMode
        ? computeMultiPasses(favoriteSatObjs, station, { minElevationDeg: minEl, lookaheadHours: hours })
        : computePasses(selectedSat.satrec, station, { minElevationDeg: minEl, lookaheadHours: hours }).map(p => ({ ...p, satName: selectedSat.name }));
    renderPasses(currentPasses);
    if (!multiMode && selectedSat) {
        const now = new Date();
        const relevantPass = currentPasses.find(p => p.los >= now);
        selectedSat.radarTrack = relevantPass
            ? computeRadarTrack(selectedSat.satrec, station, relevantPass.aos, relevantPass.los)
            : null;
    }
    startTrackingLoop(station);
}

document.getElementById('recompute-passes').addEventListener('click', recompute);

const trackMapFullscreenBtn = document.getElementById('track-map-fullscreen');
const trackMapExitFullscreenBtn = document.getElementById('track-map-exit-fullscreen');
if (trackMapFullscreenBtn) {
    const wrapper = document.getElementById('track-map-wrapper');
    trackMapFullscreenBtn.addEventListener('click', () => {
        if (!wrapper) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (wrapper.requestFullscreen) {
            wrapper.requestFullscreen();
        }
    });
    if (trackMapExitFullscreenBtn) {
        trackMapExitFullscreenBtn.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
        });
    }
    document.addEventListener('fullscreenchange', () => {
        const canvas = document.getElementById('track-map');
        if (!canvas) return;
        if (document.fullscreenElement === wrapper) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else {
            canvas.width = 960;
            canvas.height = 480;
        }
        recompute();
    });
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

const alertsBtn = document.getElementById('alerts-btn');
if (alertsBtn) {
    alertsBtn.addEventListener('click', async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            showStationMsg('Push notifications not supported in this browser.', true);
            return;
        }
        const vapidKey = window.VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            showStationMsg('Push alerts are not configured yet.', true);
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                showStationMsg('Notification permission denied.', true);
                return;
            }
            const reg = await navigator.serviceWorker.register('/static/js/push-sw.js');
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
            const timezone = String(tzOffsetHours);
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
                body: JSON.stringify({ subscription: sub.toJSON(), timezone }),
            });
            showStationMsg(res.ok ? 'Pass alerts enabled — favorite a satellite to get notified.' : 'Could not enable alerts.', !res.ok);
        } catch {
            showStationMsg('Could not enable alerts.', true);
        }
    });
}

function showLoginPopup() {
    const p = document.getElementById('login-popup');
    if (p) p.style.display = 'flex';
}
window.showLoginPopup = showLoginPopup;

const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', showLoginPopup);
const loginPopupClose = document.getElementById('login-popup-close');
if (loginPopupClose) loginPopupClose.addEventListener('click', () => {
    document.getElementById('login-popup').style.display = 'none';
});

const tzNameEl = document.getElementById('tz-name');
if (tzNameEl) tzNameEl.textContent = tzLabel(tzOffsetHours);

const tzSelect = document.getElementById('tz-select');
if (tzSelect) {
    for (let offset = -12; offset <= 14; offset++) {
        const opt = document.createElement('option');
        opt.value = String(offset);
        opt.textContent = tzLabel(offset);
        if (offset === tzOffsetHours) opt.selected = true;
        tzSelect.appendChild(opt);
    }
    tzSelect.addEventListener('change', e => {
        setTzOffset(parseInt(e.target.value, 10) || 0);
    });
}

updateStationDisplay();
if (station) syncStationToServer(station);
loadFavorites().then(() => {
    switchCategory(currentCategory).then(() => {
        if (station) recompute();
    });
});
