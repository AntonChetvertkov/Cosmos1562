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

createConstellationPanel();

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
}, 100);




