import { addCityMarkerToScene, toggleConstellation, focusSat, toggleCountryFilter, toggleOrbitFilter } from '/static/js/globe.js?v=4';
import { createConstellationPanel } from '/static/js/constellations.js?v=4';

const IS_AUTHENTICATED = window.IS_AUTHENTICATED === true;

function showLoginPopup() {
    const p = document.getElementById('login-popup');
    if (p) p.style.display = 'flex';
}
window.showLoginPopup = showLoginPopup;

function requireAuth(action) {
    return () => {
        if (!IS_AUTHENTICATED) { showLoginPopup(); return; }
        action();
    };
}

let CITIES = [];
fetch('/static/cities/world-cities.json').then(r => r.json()).then(d => CITIES = d);

function searchCities(q) {
    q = q.toLowerCase().trim();
    if (q.length < 2) return [];
    const starts = CITIES.filter(c => c.name.toLowerCase().startsWith(q));
    const contains = CITIES.filter(c => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 10);
}

function addCityMarker(city) {
    const addedList = document.getElementById('added-cities');
    const li = document.createElement('li');
    li.textContent = city.name;
    li.style.cssText = 'padding: 6px 8px; color: #00c8ff; border-radius: 4px;';
    addedList.appendChild(li);
    addCityMarkerToScene(city);
}

let debounceTimer;
document.getElementById('city-search').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const ul = document.getElementById('city-results');
        ul.innerHTML = '';
        const results = searchCities(e.target.value);
        for (const city of results) {
            const li = document.createElement('li');
            li.textContent = city.name;
            li.style.cssText = 'padding:7px 8px; cursor:pointer; color:#00c8ff; border-radius:4px;';
            li.addEventListener('mouseenter', () => li.style.background = '#0d2040');
            li.addEventListener('mouseleave', () => li.style.background = 'transparent');
            li.addEventListener('click', () => addCityMarker(city));
            ul.appendChild(li);
        }
    }, 300);
});

document.getElementById('key-btn')?.addEventListener('click', () => {
    document.getElementById('key-panel').style.display = 'block';
});
document.getElementById('key-close')?.addEventListener('click', () => {
    document.getElementById('key-panel').style.display = 'none';
});
document.getElementById('marker-btn')?.addEventListener('click', requireAuth(() => {
    document.getElementById('markers-panel').style.display = 'block';
}));
document.getElementById('markers-close')?.addEventListener('click', () => {
    document.getElementById('markers-panel').style.display = 'none';
});
document.getElementById('constellations-btn')?.addEventListener('click', requireAuth(() => {
    document.getElementById('constellations-panel').style.display = 'block';
}));
document.getElementById('filter-btn')?.addEventListener('click', requireAuth(() => {
    document.getElementById('filter-panel').style.display = 'block';
}));
document.getElementById('filter-close')?.addEventListener('click', () => {
    document.getElementById('filter-panel').style.display = 'none';
});
document.getElementById('constellations-close')?.addEventListener('click', () => {
    document.getElementById('constellations-panel').style.display = 'none';
});
document.getElementById('chat-btn')?.addEventListener('click', requireAuth(() => {
    document.getElementById('chat-panel').style.display = 'block';
}));
document.getElementById('account-btn')?.addEventListener('click', requireAuth(() => {
    document.getElementById('account-panel').style.display = 'block';
}));
document.getElementById('account-close')?.addEventListener('click', () => {
    document.getElementById('account-panel').style.display = 'none';
});

document.getElementById('search-btn').addEventListener('click', () => {
    document.getElementById('search-panel').style.display = 'block';
    document.getElementById('sat-search').focus();
});
document.getElementById('search-close').addEventListener('click', () => {
    document.getElementById('search-panel').style.display = 'none';
});

let satSearchTimer;
document.getElementById('sat-search').addEventListener('input', e => {
    clearTimeout(satSearchTimer);
    satSearchTimer = setTimeout(() => {
        const q = e.target.value.toLowerCase().trim();
        const ul = document.getElementById('sat-results');
        ul.innerHTML = '';
        if (q.length < 2) return;
        const matches = (window.sat_meshes || [])
            .filter(m => m.mesh.userData.name.toLowerCase().includes(q))
            .slice(0, 12);
        for (const entry of matches) {
            const li = document.createElement('li');
            const locked = entry.mesh.userData.locked;
            li.textContent = entry.mesh.userData.name + (locked ? ' 🔒' : '');
            li.style.cssText = 'padding:7px 8px; cursor:pointer; color:#00c8ff; border-radius:4px; border-bottom:1px solid #0d2040;';
            li.addEventListener('mouseenter', () => li.style.background = '#0d2040');
            li.addEventListener('mouseleave', () => li.style.background = 'transparent');
            li.addEventListener('click', () => {
                focusSat(entry.mesh.userData.name);
                document.getElementById('search-panel').style.display = 'none';
                document.getElementById('sat-search').value = '';
                ul.innerHTML = '';
            });
            ul.appendChild(li);
        }
        if (matches.length === 0 && q.length >= 2) {
            const li = document.createElement('li');
            li.textContent = 'No results';
            li.style.cssText = 'padding:7px 8px; color:#1a6a8b;';
            ul.appendChild(li);
        }
    }, 250);
});

const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', showLoginPopup);
const loginPopupClose = document.getElementById('login-popup-close');
if (loginPopupClose) loginPopupClose.addEventListener('click', () => {
    document.getElementById('login-popup').style.display = 'none';
});
document.getElementById('chat-close').addEventListener('click', () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    fetch('/ai/clear', {
        method: "POST",
        headers: { "X-CSRFToken": csrfToken }
    });
    document.getElementById('response-message').innerText = "";
    document.getElementById('chat-panel').style.display = 'none';
});

createConstellationPanel();
createFilterPanel();

document.getElementById("aiChat").addEventListener("submit", async (e) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    e.preventDefault();
    const prompt = document.getElementById('prompt_field').value;
    const msgDiv = document.getElementById('response-message');
    msgDiv.innerText += 'Thinking about "' + prompt + '"...\n';
    document.getElementById('prompt_field').value = "";

    const response = await fetch('/ai/chat', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ prompt })
    });

    if (response.status === 429) {
        const data = await response.json();
        msgDiv.innerText += (data.message || 'Daily limit reached. Upgrade for unlimited access.') + '\n';
        const countEl = document.getElementById('ai-count-display');
        if (countEl) countEl.textContent = '0 / 15 MESSAGES REMAINING TODAY';
        return;
    }

    const answer = await response.text();
    msgDiv.innerText += answer + '\n';
    msgDiv.scrollTop = msgDiv.scrollHeight;

    const countEl = document.getElementById('ai-count-display');
    if (countEl && countEl.dataset.remaining !== undefined) {
        const remaining = Math.max(0, parseInt(countEl.dataset.remaining) - 1);
        countEl.dataset.remaining = remaining;
        countEl.textContent = remaining + ' / 15 MESSAGES REMAINING TODAY';
    }
});

function acctEditField(field) {
    document.getElementById(`acct-display-${field}`).style.display = 'none';
    document.getElementById(`acct-edit-${field}`).style.display = 'block';
}
function acctCancelEdit(field) {
    document.getElementById(`acct-display-${field}`).style.display = '';
    document.getElementById(`acct-edit-${field}`).style.display = 'none';
}
function acctMsg(msg, isError) {
    const el = document.getElementById('account-msg');
    el.textContent = msg;
    el.style.color = isError ? '#ff6666' : '#00c8ff';
    setTimeout(() => el.textContent = '', 4000);
}
async function acctSaveName() {
    const name = document.getElementById('acct-input-name').value.trim();
    if (!name) { acctMsg('Name cannot be empty.', true); return; }
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    const res = await fetch('/account/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) { document.getElementById('acct-display-name').textContent = name; acctCancelEdit('name'); acctMsg('Name updated.'); }
    else acctMsg(data.error || 'Failed.', true);
}
async function acctSaveEmail() {
    const email = document.getElementById('acct-input-email').value.trim();
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    const res = await fetch('/account/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) { acctMsg('Email updated. Redirecting to login...'); setTimeout(() => window.location.href = '/', 2000); }
    else acctMsg(data.error || 'Failed.', true);
}
async function acctSavePassword() {
    const current = document.getElementById('acct-input-pwd-current').value;
    const newPwd = document.getElementById('acct-input-pwd-new').value;
    const confirm = document.getElementById('acct-input-pwd-confirm').value;
    if (newPwd !== confirm) { acctMsg('Passwords do not match.', true); return; }
    if (newPwd.length < 8) { acctMsg('Minimum 8 characters.', true); return; }
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    const res = await fetch('/account/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify({ current_password: current, new_password: newPwd })
    });
    const data = await res.json();
    if (res.ok) { document.getElementById('acct-pwd-form').style.display = 'none'; acctMsg('Password updated.'); }
    else acctMsg(data.error || 'Failed.', true);
}
async function acctConfirmDelete() {
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    const res = await fetch('/account/delete', { method: 'POST', headers: { 'X-CSRFToken': csrf } });
    if (res.ok) window.location.href = '/';
    else acctMsg('Failed to delete account.', true);
}

window.acctEditField = acctEditField;
window.acctCancelEdit = acctCancelEdit;
window.acctSaveName = acctSaveName;
window.acctSaveEmail = acctSaveEmail;
window.acctSavePassword = acctSavePassword;
window.acctConfirmDelete = acctConfirmDelete;

function createFilterPanel() {
    const container = document.getElementById('filter-content');
    if (!container) return;

    const style = document.createElement('style');
    style.textContent = `
        .filter-section { margin-bottom: 16px; }
        .filter-section-title { color: var(--cyan); font-size: 0.52rem; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #0d2040; }
        .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
        .filter-label { display: flex; align-items: center; gap: 7px; font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .filter-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
    `;
    container.appendChild(style);

    const COUNTRIES = [
        { key: 'Russia',       label: 'Russia',       color: '#ff4444' },
        { key: 'USA',          label: 'USA',          color: '#4477ff' },
        { key: 'China',        label: 'China',        color: '#ffee44' },
        { key: 'Europe',       label: 'Europe',       color: '#00c8ff' },
        { key: 'India',        label: 'India',        color: '#ff8800' },
        { key: 'Japan',        label: 'Japan',        color: '#aa44ff' },
        { key: 'South Korea',  label: 'South Korea',  color: '#00ff99' },
        { key: 'Canada',       label: 'Canada',       color: '#633154' },
        { key: 'Brazil',       label: 'Brazil',       color: '#33dd55' },
        { key: 'Israel',       label: 'Israel',       color: '#ff99cc' },
        { key: 'Türkiye',      label: 'Türkiye',      color: '#ff6644' },
        { key: 'Thailand',     label: 'Thailand',     color: '#fadc8a' },
        { key: 'International',label: 'International',color: '#00ff88' },
        { key: 'Other',        label: 'Other',        color: '#2a5a6a' },
    ];

    const ORBITS = [
        { key: 'LEO', label: 'LEO  (< 2,000 km)',       color: '#00c8ff' },
        { key: 'MEO', label: 'MEO  (2,000 – 34,000 km)',color: '#44aaff' },
        { key: 'GEO', label: 'GEO  (≈ 35,786 km)',      color: '#aa88ff' },
        { key: 'HEO', label: 'HEO  (> 37,000 km)',      color: '#ff88aa' },
    ];

    function makeToggle(checked, onChange) {
        const lbl = document.createElement('label');
        lbl.className = 'toggle-switch';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = checked;
        cb.addEventListener('change', e => onChange(e.target.checked));
        lbl.appendChild(cb);
        lbl.appendChild(Object.assign(document.createElement('span'), { className: 'switch-slider' }));
        return lbl;
    }

    function makeSection(title, rows, onToggle) {
        const sec = document.createElement('div');
        sec.className = 'filter-section';
        const heading = document.createElement('div');
        heading.className = 'filter-section-title';
        heading.textContent = title;
        sec.appendChild(heading);
        for (const row of rows) {
            const div = document.createElement('div');
            div.className = 'filter-row';
            const labelDiv = document.createElement('div');
            labelDiv.className = 'filter-label';
            const dot = document.createElement('div');
            dot.className = 'filter-dot';
            dot.style.background = row.color;
            const span = document.createElement('span');
            span.textContent = row.label;
            labelDiv.appendChild(dot);
            labelDiv.appendChild(span);
            div.appendChild(labelDiv);
            div.appendChild(makeToggle(true, on => onToggle(row.key, on)));
            sec.appendChild(div);
        }
        return sec;
    }

    container.appendChild(makeSection('By Country', COUNTRIES, toggleCountryFilter));
    container.appendChild(makeSection('By Orbit', ORBITS, toggleOrbitFilter));
}

setTimeout(() => {
    const toggleAllCheckbox = document.getElementById('toggle-all');
    const individualCheckboxes = document.querySelectorAll('[data-constellation]');

    toggleAllCheckbox.addEventListener('change', (e) => {
        for (const cb of individualCheckboxes) {
            cb.checked = e.target.checked;
            toggleConstellation(cb.dataset.constellation, e.target.checked);
        }
    });

    for (const cb of individualCheckboxes) {
        cb.addEventListener('change', (e) => {
            toggleConstellation(e.target.dataset.constellation, e.target.checked);
        });
    }

    document.querySelectorAll('[data-section][id^="toggle-section-"]').forEach(sectionCb => {
        sectionCb.addEventListener('change', (e) => {
            const sectionName = e.target.dataset.section;
            const sectionCheckboxes = document.querySelectorAll(`[data-constellation][data-section="${sectionName}"]`);
            for (const cb of sectionCheckboxes) {
                cb.checked = e.target.checked;
                toggleConstellation(cb.dataset.constellation, e.target.checked);
            }
        });
    });
}, 100);





