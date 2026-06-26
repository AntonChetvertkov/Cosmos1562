export const CONSTELLATION_GROUPS = [
    {
        section: 'Navigation (GNSS)',
        items: [
            { name: 'GPS',     label: 'GPS',     country: '🇺🇸 USA' },
            { name: 'GLONASS', label: 'GLONASS', country: '🇷🇺 Russia' },
            { name: 'BEIDOU',  label: 'BeiDou',  country: '🇨🇳 China' },
            { name: 'GALILEO', label: 'Galileo', country: '🇪🇺 Europe' },
            { name: 'NAVIC',   label: 'NavIC',   country: '🇮🇳 India' },
            { name: 'QZSS',    label: 'QZSS',    country: '🇯🇵 Japan' },
        ],
    },
    {
        section: 'Space Stations',
        items: [
            { name: 'ISS', label: 'ISS',            country: '🌍 International' },
            { name: 'CSS', label: 'CSS / Tiangong',  country: '🇨🇳 China' },
        ],
    },
    {
        section: 'Weather',
        items: [
            { name: 'GOES',     label: 'GOES',       country: '🇺🇸 USA' },
            { name: 'NOAA',     label: 'NOAA POES',  country: '🇺🇸 USA' },
            { name: 'JPSS',     label: 'JPSS',        country: '🇺🇸 USA' },
            { name: 'DMSP',     label: 'DMSP',        country: '🇺🇸 USA (Mil.)' },
            { name: 'SUOMI',    label: 'Suomi NPP',   country: '🇺🇸 USA' },
            { name: 'CYGFM',    label: 'CYGNSS',      country: '🇺🇸 USA' },
            { name: 'ELEKTRO',  label: 'Elektro-L',   country: '🇷🇺 Russia' },
            { name: 'METEOR',   label: 'Meteor',       country: '🇷🇺 Russia' },
            { name: 'ARKTIKA',  label: 'Arktika-M',   country: '🇷🇺 Russia' },
            { name: 'FENGYUN',  label: 'FengYun',      country: '🇨🇳 China' },
            { name: 'TIANMU',   label: 'Tianmu',       country: '🇨🇳 China' },
            { name: 'METEOSAT', label: 'Meteosat',     country: '🇪🇺 EUMETSAT' },
            { name: 'METOP',    label: 'MetOp',        country: '🇪🇺 EUMETSAT' },
            { name: 'INSAT',    label: 'INSAT / 3DR',  country: '🇮🇳 India' },
            { name: 'HIMAWARI', label: 'Himawari',     country: '🇯🇵 Japan' },
            { name: 'COMS',     label: 'COMS',         country: '🇰🇷 South Korea' },
        ],
    },
    {
        section: 'Earth Observation',
        items: [
            { name: 'LANDSAT',     label: 'Landsat',        country: '🇺🇸 USA / USGS' },
            { name: 'WORLDVIEW',   label: 'WorldView',      country: '🇺🇸 USA' },
            { name: 'GEOEYE',      label: 'GeoEye',         country: '🇺🇸 USA' },
            { name: 'SKYSAT',      label: 'SkySat',         country: '🇺🇸 USA (Planet)' },
            { name: 'TERRA',       label: 'Terra',          country: '🇺🇸 USA / NASA' },
            { name: 'AQUA',        label: 'Aqua',           country: '🇺🇸 USA / NASA' },
            { name: 'AURA',        label: 'Aura',           country: '🇺🇸 USA / NASA' },
            { name: 'FLOCK',       label: 'Flock (Dove)',   country: '🇺🇸 USA (Planet)' },
            { name: 'PELICAN',     label: 'Pelican',        country: '🇺🇸 USA (Planet)' },
            { name: 'SENTINEL',    label: 'Sentinel',       country: '🇪🇺 ESA' },
            { name: 'SPOT',        label: 'SPOT',           country: '🇫🇷 France' },
            { name: 'PLEIADES',    label: 'Pléiades',       country: '🇫🇷 France' },
            { name: 'COSMO-SKYMED',label: 'COSMO-SkyMed',   country: '🇮🇹 Italy' },
            { name: 'TERRASAR',    label: 'TerraSAR-X',     country: '🇩🇪 Germany' },
            { name: 'TANDEM-X',    label: 'TanDEM-X',       country: '🇩🇪 Germany' },
            { name: 'DEIMOS',      label: 'Deimos',         country: '🇪🇸 Spain' },
            { name: 'GAOFEN',      label: 'GaoFen',         country: '🇨🇳 China' },
            { name: 'YAOGAN',      label: 'Yaogan',         country: '🇨🇳 China (Mil.)' },
            { name: 'ZIYUAN',      label: 'ZiYuan',         country: '🇨🇳 China' },
            { name: 'HAIYANG',     label: 'HaiYang',        country: '🇨🇳 China' },
            { name: 'HUANJING',    label: 'HuanJing',       country: '🇨🇳 China' },
            { name: 'RESURS',      label: 'Resurs',         country: '🇷🇺 Russia' },
            { name: 'KANOPUS',     label: 'Kanopus-V',      country: '🇷🇺 Russia' },
            { name: 'RASSVET',     label: 'Rassvet',        country: '🇷🇺 Russia' },
            { name: 'CARTOSAT',    label: 'Cartosat',       country: '🇮🇳 India' },
            { name: 'RESOURCESAT', label: 'ResourceSat',    country: '🇮🇳 India' },
            { name: 'OCEANSAT',    label: 'OceanSat',       country: '🇮🇳 India' },
            { name: 'RADARSAT',    label: 'RADARSAT',       country: '🇨🇦 Canada' },
            { name: 'KOMPSAT',     label: 'KOMPSAT',        country: '🇰🇷 South Korea' },
            { name: 'CBERS',       label: 'CBERS',          country: '🇧🇷🇨🇳 Brazil / China' },
            { name: 'FORMOSAT',    label: 'FORMOSAT',       country: '🇹🇼 Taiwan' },
        ],
    },
    {
        section: 'Commercial Constellations',
        items: [
            { name: 'STARLINK', label: 'Starlink',   country: '🇺🇸 SpaceX',          defaultOff: true },
            { name: 'ONEWEB',   label: 'OneWeb',     country: '🌍 Eutelsat / UK' },
            { name: 'IRIDIUM',  label: 'Iridium',    country: '🇺🇸 USA' },
            { name: 'KUIPER',   label: 'Kuiper',     country: '🇺🇸 Amazon' },
            { name: 'QIANFAN',  label: 'Qianfan',    country: '🇨🇳 China (SSST)' },
        ],
    },
    {
        section: 'Other',
        items: [
            { name: 'CUBESAT', label: 'CubeSats & Other', country: '🌍 Various' },
        ],
    },
];

export const GNSS_CONSTELLATIONS = CONSTELLATION_GROUPS
    .find(g => g.section === 'Navigation (GNSS)').items.map(i => i.name);
export const STATIONS = CONSTELLATION_GROUPS
    .find(g => g.section === 'Space Stations').items.map(i => i.name);
export const WEATHER = CONSTELLATION_GROUPS
    .find(g => g.section === 'Weather').items.map(i => i.name);
export const RESOURCE = CONSTELLATION_GROUPS
    .find(g => g.section === 'Earth Observation').items.map(i => i.name);
export const MISC = CONSTELLATION_GROUPS
    .find(g => g.section === 'Commercial Constellations').items.map(i => i.name);

export const ALL_CONSTELLATION_NAMES = CONSTELLATION_GROUPS.flatMap(g => g.items.map(i => i.name));
export const DEFAULT_OFF_CONSTELLATIONS = new Set(
    CONSTELLATION_GROUPS.flatMap(g => g.items.filter(i => i.defaultOff).map(i => i.name))
);

export function getConstellationName(satName) {
    const n = satName.toUpperCase();

    // GNSS — check specific names first
    if (n.includes('GLONASS')) return 'GLONASS';
    if (n.includes('BEIDOU'))  return 'BEIDOU';
    if (n.includes('GALILEO')) return 'GALILEO';
    if (n.includes('NAVIC') || n.includes('IRNSS')) return 'NAVIC';
    if (n.includes('QZSS'))    return 'QZSS';
    if (n.includes('GPS'))     return 'GPS';

    // Stations
    if (n.startsWith('ISS'))   return 'ISS';
    if (n.startsWith('CSS'))   return 'CSS';

    // Commercial constellations
    if (n.includes('STARLINK')) return 'STARLINK';
    if (n.includes('ONEWEB'))   return 'ONEWEB';
    if (n.includes('IRIDIUM'))  return 'IRIDIUM';
    if (n.includes('KUIPER'))   return 'KUIPER';
    if (n.includes('QIANFAN'))  return 'QIANFAN';

    // Weather — longer patterns before shorter to avoid prefix collisions
    if (n.includes('METEOSAT')) return 'METEOSAT';
    if (n.includes('METOP'))    return 'METOP';
    if (n.includes('METEOR'))   return 'METEOR';
    if (n.includes('ELEKTRO') || n.includes('ELECTRO')) return 'ELEKTRO';
    if (n.includes('ARKTIKA'))  return 'ARKTIKA';
    if (n.includes('DMSP'))     return 'DMSP';
    if (n.includes('JPSS'))     return 'JPSS';
    if (n.includes('SUOMI'))    return 'SUOMI';
    if (n.includes('CYGFM'))    return 'CYGFM';
    if (n.includes('GOES'))     return 'GOES';
    if (n.includes('NOAA'))     return 'NOAA';
    if (n.includes('FENGYUN'))  return 'FENGYUN';
    if (n.includes('TIANMU'))   return 'TIANMU';
    if (n.includes('HIMAWARI')) return 'HIMAWARI';
    if (n.includes('INSAT'))    return 'INSAT';
    if (n.includes('COMS') && !n.includes('COSMOS')) return 'COMS';

    // Earth Observation — longer/more-specific before shorter
    if (n.includes('TERRASAR'))    return 'TERRASAR';
    if (n.includes('TANDEM-X'))    return 'TANDEM-X';
    if (n.includes('COSMO-SKYMED'))return 'COSMO-SKYMED';
    if (n.includes('WORLDVIEW'))   return 'WORLDVIEW';
    if (n.includes('RESOURCESAT')) return 'RESOURCESAT';
    if (n.includes('RADARSAT'))    return 'RADARSAT';
    if (n.includes('FORMOSAT'))    return 'FORMOSAT';
    if (n.includes('CARTOSAT'))    return 'CARTOSAT';
    if (n.includes('OCEANSAT'))    return 'OCEANSAT';
    if (n.includes('SKYSAT'))      return 'SKYSAT';
    if (n.includes('GEOEYE'))      return 'GEOEYE';
    if (n.includes('LANDSAT'))     return 'LANDSAT';
    if (n.includes('SENTINEL'))    return 'SENTINEL';
    if (n.includes('PLEIADES'))    return 'PLEIADES';
    if (n.includes('KOMPSAT') || n.includes('ARIRANG')) return 'KOMPSAT';
    if (n.includes('GAOFEN'))      return 'GAOFEN';
    if (n.includes('YAOGAN'))      return 'YAOGAN';
    if (n.includes('HAIYANG'))     return 'HAIYANG';
    if (n.includes('HUANJING'))    return 'HUANJING';
    if (n.includes('ZIYUAN'))      return 'ZIYUAN';
    if (n.includes('KANOPUS'))     return 'KANOPUS';
    if (n.includes('RESURS'))      return 'RESURS';
    if (n.includes('RASSVET'))     return 'RASSVET';
    if (n.includes('DEIMOS'))      return 'DEIMOS';
    if (n.includes('CBERS'))       return 'CBERS';
    if (n.includes('FLOCK'))       return 'FLOCK';
    if (n.includes('PELICAN'))     return 'PELICAN';
    if (n.includes('TERRA'))       return 'TERRA';
    if (n.includes('AQUA'))        return 'AQUA';
    if (n.includes('AURA'))        return 'AURA';
    if (n.startsWith('SPOT ') || n.startsWith('SPOT-')) return 'SPOT';

    return 'CUBESAT';
}

const FREE_SECTION_NAMES = new Set(['Space Stations', 'Weather']);
const FREE_INDIVIDUAL = new Set(['STARLINK']);

export function createConstellationPanel(isAuth = true) {
    const panel = document.getElementById('constellations-panel');

    const style = document.createElement('style');
    style.textContent = `
        .toggle-switch { position:relative; display:inline-block; width:34px; height:18px; }
        .toggle-switch input { opacity:0; width:0; height:0; }
        .switch-slider { position:absolute; cursor:pointer; inset:0; background:#1a4a6b; transition:0.3s; border-radius:18px; }
        .switch-slider:before { position:absolute; content:""; height:14px; width:14px; left:2px; bottom:2px; background:#0d2a3b; transition:0.3s; border-radius:50%; }
        input:checked + .switch-slider { background:#00c8ff; }
        input:checked + .switch-slider:before { transform:translateX(16px); background:#060d18; }
        .const-section { margin-bottom:14px; }
        .const-section-header { display:flex; align-items:center; justify-content:space-between; color:var(--cyan); font-weight:700; font-size:0.55rem; opacity:0.8; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #0d2040; }
        .const-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; padding:2px 0; }
        .const-label { display:flex; flex-direction:column; gap:2px; flex:1; }
        .const-name { color:var(--text-muted); font-size:0.6rem; }
        .const-country { color:#1a6a8b; font-size:0.52rem; letter-spacing:0.04em; }
        #constellation-toggles::-webkit-scrollbar { width:4px; }
        #constellation-toggles::-webkit-scrollbar-track { background:#060d18; }
        #constellation-toggles::-webkit-scrollbar-thumb { background:#1a4a6b; border-radius:2px; }
    `;
    panel.appendChild(style);

    const container = document.createElement('div');
    container.id = 'constellation-toggles';
    container.style.cssText = `
        display:flex; flex-direction:column; gap:4px; margin:16px 0;
        font-family:'Orbitron',sans-serif; letter-spacing:0.07em; text-transform:uppercase;
        max-height:420px; overflow-y:auto;
    `;

    // Toggle-all row
    const toggleAllRow = document.createElement('div');
    toggleAllRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #1a4a6b;';
    const toggleAllLabel = document.createElement('span');
    toggleAllLabel.style.cssText = 'color:var(--cyan); font-size:0.6rem; font-weight:700;';
    toggleAllLabel.textContent = 'Toggle All';
    const toggleAllSwitch = document.createElement('label');
    toggleAllSwitch.className = 'toggle-switch';
    const toggleAllCheckbox = document.createElement('input');
    toggleAllCheckbox.type = 'checkbox';
    toggleAllCheckbox.id = 'toggle-all';
    toggleAllCheckbox.checked = true;
    toggleAllSwitch.appendChild(toggleAllCheckbox);
    toggleAllSwitch.appendChild(Object.assign(document.createElement('span'), { className: 'switch-slider' }));
    toggleAllRow.appendChild(toggleAllLabel);
    toggleAllRow.appendChild(toggleAllSwitch);
    container.appendChild(toggleAllRow);

    const visibleGroups = isAuth ? CONSTELLATION_GROUPS : CONSTELLATION_GROUPS
        .map(g => ({
            ...g,
            items: g.items.filter(i => FREE_SECTION_NAMES.has(g.section) || FREE_INDIVIDUAL.has(i.name))
        }))
        .filter(g => g.items.length > 0);

    for (const group of visibleGroups) {
        const section = document.createElement('div');
        section.className = 'const-section';

        const header = document.createElement('div');
        header.className = 'const-section-header';
        const headerLabel = document.createElement('span');
        headerLabel.textContent = group.section;
        const sectionSwitch = document.createElement('label');
        sectionSwitch.className = 'toggle-switch';
        const sectionCb = document.createElement('input');
        sectionCb.type = 'checkbox';
        sectionCb.id = `toggle-section-${group.section}`;
        sectionCb.checked = true;
        sectionCb.dataset.section = group.section;
        sectionSwitch.appendChild(sectionCb);
        sectionSwitch.appendChild(Object.assign(document.createElement('span'), { className: 'switch-slider' }));
        header.appendChild(headerLabel);
        header.appendChild(sectionSwitch);
        section.appendChild(header);

        for (const item of group.items) {
            const row = document.createElement('div');
            row.className = 'const-row';

            const labelDiv = document.createElement('div');
            labelDiv.className = 'const-label';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'const-name';
            nameSpan.textContent = item.label;
            const countrySpan = document.createElement('span');
            countrySpan.className = 'const-country';
            countrySpan.textContent = item.country;
            labelDiv.appendChild(nameSpan);
            labelDiv.appendChild(countrySpan);

            const switchLabel = document.createElement('label');
            switchLabel.className = 'toggle-switch';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `toggle-${item.name}`;
            cb.checked = !item.defaultOff;
            cb.dataset.constellation = item.name;
            cb.dataset.section = group.section;
            switchLabel.appendChild(cb);
            switchLabel.appendChild(Object.assign(document.createElement('span'), { className: 'switch-slider' }));

            row.appendChild(labelDiv);
            row.appendChild(switchLabel);
            section.appendChild(row);
        }

        container.appendChild(section);
    }

    const insertPoint = panel.querySelector('#constellations-close');
    panel.insertBefore(container, insertPoint);
}
