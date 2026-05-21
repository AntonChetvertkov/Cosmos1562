import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as satellite from 'satellite.js';
import { cosmodromes, capitals, getSatColour, getSatOperator } from '/static/js/data.js';
import { getConstellationName } from '/static/js/constellations.js';

const TRACK_STEP_SECONDS = 30;
const TRACK_SURFACE_OFFSET = 1.001;

export var GMT = satellite.gstime(new Date());
export const scene = new THREE.Scene();
export const markers = [];
export const sat_meshes = [];
export let activeTrackEntry = null;

const visibleConstellations = new Set([
    'GPS', 'GLONASS', 'BEIDOU', 'GALILEO', 'NAVIC', 'QZSS', 'ISS', 'CSS', 'CUBESAT'
]);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color('#060d18');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = true;
controls.minDistance = 1.5;

const geometry = new THREE.SphereGeometry(1, 64, 32);
const loader = new THREE.TextureLoader();
const texture = loader.load('/static/img/country-outlines-4k.png');
const material = new THREE.MeshBasicMaterial({ map: texture });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const light = new THREE.PointLight('white', 1);
light.position.set(5, 5, 5);
scene.add(light);

function buildGroundTrack(satrec) {
    const durationSeconds = 1440 * 60;
    const steps = Math.ceil(durationSeconds / TRACK_STEP_SECONDS);
    const now = new Date();
    const points = [];
    const colors = [];
    const startColor = new THREE.Color('#ff4444');
    const endColor = new THREE.Color('#00ff88');
    const lerpedColor = new THREE.Color();
    for (let i = 0; i <= steps; i++) {
        const t = new Date(now.getTime() + i * TRACK_STEP_SECONDS * 1000);
        const gmt = satellite.gstime(t);
        const pv = satellite.propagate(satrec, t);
        if (!pv || !pv.position) continue;
        const gd = satellite.eciToGeodetic(pv.position, gmt);
        const lat = gd.latitude;
        const lon = gd.longitude;
        const x = Math.cos(lat) * Math.cos(lon) * TRACK_SURFACE_OFFSET;
        const y = Math.sin(lat) * TRACK_SURFACE_OFFSET;
        const z = -Math.cos(lat) * Math.sin(lon) * TRACK_SURFACE_OFFSET;
        points.push(new THREE.Vector3(x, y, z));
        lerpedColor.lerpColors(startColor, endColor, i / steps);
        colors.push(lerpedColor.r, lerpedColor.g, lerpedColor.b);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return [line];
}

export function createTrackLines(segments) {
    return segments;
}

export function removeTrackLines(lines) {
    for (const line of lines) {
        scene.remove(line);
        line.geometry.dispose();
    }
}

export function setActiveTrackEntry(entry) {
    activeTrackEntry = entry;
}

function placeSatMesh(sat_response, colour) {
    const satGeometry = new THREE.SphereGeometry(0.02, 8, 4);
    const satMaterial = new THREE.MeshBasicMaterial({ color: colour });
    const sat = new THREE.Mesh(satGeometry, satMaterial);
    const sat_rec = satellite.json2satrec(sat_response);
    const positionAndVelocity = satellite.propagate(sat_rec, new Date());
    if (!positionAndVelocity || !positionAndVelocity.position) return;
    const positionECI = positionAndVelocity.position;
    const geoPos = satellite.eciToGeodetic(positionECI, GMT);
    const latRad = geoPos.latitude;
    const lonRad = geoPos.longitude;
    const sat_height = geoPos.height;
    const scale = 1 + (sat_height / 6371);
    sat.position.set(
        Math.cos(latRad) * Math.cos(lonRad) * scale,
        Math.sin(latRad) * scale,
        -Math.cos(latRad) * Math.sin(lonRad) * scale
    );
    sat.userData.name = sat_response.OBJECT_NAME;
    sat.userData.type = 'sat';
    sat.userData.constellation = getConstellationName(sat_response.OBJECT_NAME);
    sat.visible = visibleConstellations.has(sat.userData.constellation);
    scene.add(sat);
    sat_meshes.push({ satrec: sat_rec, mesh: sat, trackLines: [] });
}

async function gnss_sats_init() {
    const response = await fetch('/dynamic/gnss_sats');
    const data = await response.json();
    for (const sat of data) placeSatMesh(sat, getSatColour(sat.OBJECT_NAME));
}

async function cube_sats_init() {
    const response = await fetch('/dynamic/cubesats');
    const data = await response.json();
    for (const sat of data) placeSatMesh(sat, getSatColour(sat.OBJECT_NAME));
}

async function stations_init() {
    const response = await fetch('/dynamic/stations');
    const data = await response.json();
    const allowed = (name) => name === 'ISS (ZARYA)' || name.startsWith('CSS');
    for (const sat of data) {
        if (!allowed(sat.OBJECT_NAME)) continue;
        const colour = sat.OBJECT_NAME.startsWith('CSS') ? 'yellow' : '#00ff88';
        placeSatMesh(sat, colour);
    }
}

async function starlink_init() {
    const response = await fetch('/dynamic/starlink');
    const data = await response.json();
    for (const sat of data) placeSatMesh(sat, getSatColour(sat.OBJECT_NAME));
}

async function weather_init(){
    const response = await fetch('/dynamic/weather');
    const data = await response.json();
    for (const sat of data) placeSatMesh(sat, getSatColour(sat.OBJECT_NAME));

}

function placeGroundMarker(lat, lon, colour, name, size = 0.005) {
    const latRad = lat * (Math.PI / 180);
    const lonRad = lon * (Math.PI / 180);
    const x = Math.cos(latRad) * Math.cos(lonRad);
    const y = Math.sin(latRad);
    const z = -Math.cos(latRad) * Math.sin(lonRad);
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 8),
        new THREE.MeshBasicMaterial({ color: colour })
    );
    marker.position.set(x, y, z);
    scene.add(marker);
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(size * 3, 16, 8),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.2 })
    );
    glow.position.set(x, y, z);
    glow.userData.name = name;
    scene.add(glow);
    markers.push(glow);
}

export function addCityMarkerToScene(city) {
    placeGroundMarker(city.lat, city.lon, 'green', city.name);
}

export function toggleConstellation(const_name, visible) {
    if (visible) {
        visibleConstellations.add(const_name);
    } else {
        visibleConstellations.delete(const_name);
    }
    for (const entry of sat_meshes) {
        if (entry.mesh.userData.constellation === const_name) {
            entry.mesh.visible = visible;
        }
    }
}

for (const c of cosmodromes) placeGroundMarker(c.lat, c.lon, 'cyan', c.name);
for (const c of capitals)    placeGroundMarker(c.lat, c.lon, 'red',  c.name);

gnss_sats_init();
cube_sats_init();
stations_init();
starlink_init();
weather_init();

const popup = document.createElement('div');
popup.style.cssText = `
    position: fixed;
    background: #0a1628;
    border: 1px solid #1a4a6b;
    color: #00c8ff;
    font-family: 'Orbitron', sans-serif;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 8px 12px;
    border-radius: 6px;
    pointer-events: auto;
    display: none;
`;
document.body.appendChild(popup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const marker_hits = raycaster.intersectObjects(markers);
    const sat_hits = raycaster.intersectObjects(
        sat_meshes
            .map(s => s.mesh)
            .filter(m => m.visible)
    );

    if (marker_hits.length > 0) {
        popup.innerHTML = `
            <div>${marker_hits[0].object.userData.name}</div>
            <div id="popup-close" style="margin-top:6px; color:#1a6a8b; cursor:pointer; font-size:0.5rem;">CLOSE</div>
        `;
        popup.style.display = 'block';
        popup.style.left = e.clientX + 12 + 'px';
        popup.style.top = e.clientY + 12 + 'px';
        document.getElementById('popup-close').addEventListener('click', () => {
            popup.style.display = 'none';
        });
    } else if (sat_hits.length > 0) {
        const s = sat_hits[0].object.userData;
        const entry = sat_meshes.find(m => m.mesh === sat_hits[0].object);
        const pv = satellite.propagate(entry.satrec, new Date());
        const gd = satellite.eciToGeodetic(pv.position, GMT);
        if (activeTrackEntry && activeTrackEntry !== entry) {
            removeTrackLines(activeTrackEntry.trackLines);
            activeTrackEntry.trackLines = [];
        }
        if (activeTrackEntry !== entry) {
            entry.trackLines = createTrackLines(buildGroundTrack(entry.satrec));
            activeTrackEntry = entry;
        }
        popup.style.display = 'block';
        popup.style.left = e.clientX + 12 + 'px';
        popup.style.top = e.clientY + 12 + 'px';
        popup.innerHTML = `
            <div>${s.name}</div>
            <div>LAT: ${satellite.degreesLat(gd.latitude).toFixed(2)}°</div>
            <div>LON: ${satellite.degreesLong(gd.longitude).toFixed(2)}°</div>
            <div>ALT: ${gd.height.toFixed(0)} km</div>
            <div>OPERATOR: ${getSatOperator(s.name)}</div>
            <div id="popup-close" style="margin-top:6px; color:#1a6a8b; cursor:pointer; font-size:0.5rem;">CLOSE</div>
        `;
        document.getElementById('popup-close').addEventListener('click', () => {
            removeTrackLines(activeTrackEntry.trackLines);
            activeTrackEntry.trackLines = [];
            activeTrackEntry = null;
            popup.style.display = 'none';
        });
    }
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    GMT = satellite.gstime(new Date());
    for (const entry of sat_meshes) {
        const pv = satellite.propagate(entry.satrec, new Date());
        if (!pv || !pv.position) continue;
        const geoPos = satellite.eciToGeodetic(pv.position, GMT);
        const latRad = geoPos.latitude;
        const lonRad = geoPos.longitude;
        const scale = 1 + (geoPos.height / 6371);
        entry.mesh.position.set(
            Math.cos(latRad) * Math.cos(lonRad) * scale,
            Math.sin(latRad) * scale,
            -Math.cos(latRad) * Math.sin(lonRad) * scale
        );
    }
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});