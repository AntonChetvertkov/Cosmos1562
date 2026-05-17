export const CONSTELLATION_COLORS = {
    GPS: { color: 'blue', operator: 'USA' },
    GLONASS: { color: 'red', operator: 'Russia' },
    COSMOS: { color: 'red', operator: 'Russia' },
    LUCH: { color: 'red', operator: 'Russia' },
    BEIDOU: { color: 'yellow', operator: 'China' },
    GALILEO: { color: 'cyan', operator: 'Europe' },
    NAVIC: { color: 'orange', operator: 'India' },
    IRNSS: { color: 'orange', operator: 'India' },
    QZSS: { color: 'purple', operator: 'Japan' },
    CUBESAT: { color: 'cyan', operator: 'International' },
    ISS: { color: '#00ff88', operator: 'International' },
    CSS: { color: 'yellow', operator: 'China' },
};

export const GNSS_CONSTELLATIONS = [
    'GPS',
    'GLONASS',
    'BEIDOU',
    'GALILEO',
    'NAVIC',
    'QZSS',
];

export const STATIONS = [
    'ISS',
    'CSS',
];

export const CUBESATS = [
    'CUBESAT',
];

export const STARLINK = [
    'STARLINK',
];

export function getConstellationName(satName) {
    for (const const_name of GNSS_CONSTELLATIONS) {
        if (satName.includes(const_name)) return const_name;
    }
    if (satName.includes('COSMOS') || satName.includes('LUCH')) return 'GLONASS';
    if (satName.includes('IRNSS')) return 'NAVIC';
    if (satName.includes('ISS')) return 'ISS';
    if (satName.includes('CSS')) return 'CSS';
    if (satName.includes('STARLINK')) return 'STARLINK';
    return 'CUBESAT';
}

export function getConstellationType(satName) {
    for (const const_name of GNSS_CONSTELLATIONS) {
        if (satName.includes(const_name)) return 'GNSS';
    }
    if (satName.includes('COSMOS') || satName.includes('LUCH')) return 'GNSS';
    if (satName.includes('IRNSS')) return 'GNSS';
    if (satName.includes('ISS') || satName.includes('CSS')) return 'STATIONS';
    return 'CUBESATS';
}

export function createConstellationPanel() {
    const panel = document.getElementById('constellations-panel');
    const container = document.createElement('div');
    container.id = 'constellation-toggles';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin: 16px 0;
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    `;

    const switchStyle = `
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 34px;
            height: 18px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #1a4a6b;
            transition: 0.3s;
            border-radius: 18px;
        }
        .switch-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: #0d2a3b;
            transition: 0.3s;
            border-radius: 50%;
        }
        input:checked + .switch-slider {
            background-color: #00c8ff;
        }
        input:checked + .switch-slider:before {
            transform: translateX(16px);
            background-color: #060d18;
        }
        .constellation-section {
            margin-bottom: 10px;
        }
        .section-header {
            color: var(--cyan);
            font-weight: 700;
            margin-bottom: 8px;
            opacity: 0.8;
            font-size: 0.55rem;
        }
        .section-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-left: 8px;
        }
    `;

    const style = document.createElement('style');
    style.textContent = switchStyle;
    panel.appendChild(style);

    const toggleAllRow = document.createElement('div');
    toggleAllRow.style.cssText = 'display: flex; align-items: center; gap: 12px; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1a4a6b;';
    
    const toggleAllLabel = document.createElement('label');
    toggleAllLabel.style.cssText = 'color: var(--cyan); flex: 1; font-weight: 700;';
    toggleAllLabel.textContent = 'Toggle All';
    
    const toggleAllSwitch = document.createElement('label');
    toggleAllSwitch.className = 'toggle-switch';
    
    const toggleAllCheckbox = document.createElement('input');
    toggleAllCheckbox.type = 'checkbox';
    toggleAllCheckbox.id = 'toggle-all';
    toggleAllCheckbox.checked = true;
    
    const toggleAllSlider = document.createElement('span');
    toggleAllSlider.className = 'switch-slider';
    
    toggleAllSwitch.appendChild(toggleAllCheckbox);
    toggleAllSwitch.appendChild(toggleAllSlider);
    
    toggleAllRow.appendChild(toggleAllLabel);
    toggleAllRow.appendChild(toggleAllSwitch);
    container.appendChild(toggleAllRow);

    const createSectionToggle = (items, sectionName, override = false) => {
        const section = document.createElement('div');
        section.className = 'constellation-section';
        
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.textContent = sectionName;
        section.appendChild(sectionHeader);
        
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'section-items';
        
        for (const const_name of items) {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 12px; justify-content: space-between;';
            
            const label = document.createElement('label');
            label.style.cssText = 'color: var(--text-muted); flex: 1;';
            label.textContent = const_name;
            
            const switchLabel = document.createElement('label');
            switchLabel.className = 'toggle-switch';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `toggle-${const_name}`;
            if (!override) {checkbox.checked = true;}
            else {checkbox.checked=false;}
            checkbox.dataset.constellation = const_name;
            
            const slider = document.createElement('span');
            slider.className = 'switch-slider';
            
            switchLabel.appendChild(checkbox);
            switchLabel.appendChild(slider);
            
            row.appendChild(label);
            row.appendChild(switchLabel);
            itemsContainer.appendChild(row);
        }
        
        section.appendChild(itemsContainer);
        container.appendChild(section);
    };

    createSectionToggle(GNSS_CONSTELLATIONS, 'GNSS');
    createSectionToggle(STATIONS, 'Stations');
    createSectionToggle(CUBESATS, 'Cubesats');
    createSectionToggle(STARLINK, 'Starlink', true);

    const insertPoint = panel.querySelector('#constellations-close');
    panel.insertBefore(container, insertPoint);
}