import { addCityMarkerToScene, toggleConstellation } from '/static/js/globe.js';
import { createConstellationPanel } from '/static/js/constellations.js';

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

document.getElementById('key-btn').addEventListener('click', () => {
    document.getElementById('key-panel').style.display = 'block';
});
document.getElementById('key-close').addEventListener('click', () => {
    document.getElementById('key-panel').style.display = 'none';
});
document.getElementById('marker-btn').addEventListener('click', () => {
    document.getElementById('markers-panel').style.display = 'block';
});
document.getElementById('markers-close').addEventListener('click', () => {
    document.getElementById('markers-panel').style.display = 'none';
});
document.getElementById('constellations-btn').addEventListener('click', () => {
    document.getElementById('constellations-panel').style.display = 'block';
});
document.getElementById('constellations-close').addEventListener('click', () => {
    document.getElementById('constellations-panel').style.display = 'none';
});
document.getElementById('chat-btn').addEventListener('click', () => {
    document.getElementById('chat-panel').style.display = 'block';
});
document.getElementById('account-btn').addEventListener('click', () => {
    document.getElementById('account-panel').style.display = 'block';
});
document.getElementById('account-close').addEventListener('click', () => {
    document.getElementById('account-panel').style.display = 'none';
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

setTimeout(() => {
    const toggleAllCheckbox = document.getElementById('toggle-all');
    const individualCheckboxes = document.querySelectorAll('[id^="toggle-"]:not(#toggle-all)');

    toggleAllCheckbox.addEventListener('change', (e) => {
        for (const checkbox of individualCheckboxes) {
            checkbox.checked = e.target.checked;
            const const_name = checkbox.dataset.constellation;
            toggleConstellation(const_name, e.target.checked);
        }
    });

    for (const checkbox of individualCheckboxes) {
        checkbox.addEventListener('change', (e) => {
            const const_name = e.target.dataset.constellation;
            toggleConstellation(const_name, e.target.checked);
        });
    }
    document.querySelectorAll('[id^="toggle-section-"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const sectionName = e.target.id.replace('toggle-section-', '');
            const sectionCheckboxes = document.querySelectorAll(`[data-section="${sectionName}"]`);
            for (const cb of sectionCheckboxes) {
                cb.checked = e.target.checked;
                toggleConstellation(cb.dataset.constellation, e.target.checked);
            }
        });
    });
}, 100);





