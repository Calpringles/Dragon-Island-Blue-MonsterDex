let monstersData = {};
let monstersList = [];

// DOM Elements
const monsterListEl = document.getElementById('monster-list');
const searchInput = document.getElementById('search-input');
const elementFilter = document.getElementById('element-filter');
const detailEl = document.getElementById('monster-detail');

// Init
async function init() {
    try {
        const response = await fetch('monsters.json');
        monstersData = await response.json();
        
        // Convert to array and sort alphabetically
        monstersList = Object.values(monstersData).sort((a, b) => a.id.localeCompare(b.id));
        
        setupEventListeners();
        renderList(monstersList);
    } catch (error) {
        console.error("Failed to load monster data:", error);
        monsterListEl.innerHTML = '<div style="padding: 20px; text-align:center;">Failed to load data. Ensure you are running a local server.</div>';
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', handleFilter);
    elementFilter.addEventListener('change', handleFilter);
}

function handleFilter() {
    const searchTerm = searchInput.value.toLowerCase();
    const element = elementFilter.value;
    
    const filtered = monstersList.filter(m => {
        const matchesSearch = m.id.toLowerCase().includes(searchTerm);
        const matchesElement = element === 'All' || m.element === element;
        return matchesSearch && matchesElement;
    });
    
    renderList(filtered);
}

function renderList(list) {
    monsterListEl.innerHTML = '';
    
    if (list.length === 0) {
        monsterListEl.innerHTML = '<div style="padding: 20px; text-align:center; color: var(--text-secondary);">No monsters found.</div>';
        return;
    }
    
    list.forEach(monster => {
        const item = document.createElement('div');
        item.className = 'monster-item';
        item.dataset.id = monster.id;
        
        const stars = monster.stars ? `★`.repeat(Math.floor(monster.stars)) : '';
        
        item.innerHTML = `
            <img src="images/${monster.image}" alt="${monster.id}" class="monster-thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PC9zdmc+'">
            <div class="monster-item-info">
                <h3>${monster.id}</h3>
                <p>
                    <span class="element-badge element-${monster.element}">${monster.element || 'Normal'}</span> 
                    <span style="color:#fbbf24; margin-left:8px;">${stars}</span>
                </p>
            </div>
        `;
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.monster-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            renderDetail(monster);
        });
        
        monsterListEl.appendChild(item);
    });
}

function renderDetail(monster) {
    // Generate Stats HTML
    const maxStat = 30; // Approximation for scaling bars
    const stats = monster.rootStats || {};
    
    const renderStatRow = (label, value) => {
        const val = value || 0;
        const percentage = Math.min((val / maxStat) * 100, 100);
        return `
            <div class="stat-row">
                <div class="stat-label">${label}</div>
                <div class="stat-value">${Number.isInteger(val) ? val : val.toFixed(1)}</div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    };
    
    // Generate Moves HTML
    const movesHtml = (monster.moves || []).length > 0 
        ? monster.moves.map(m => `
            <li>
                <span class="move-name">${m.name}</span>
                <span class="move-type">${m.type.split('.').pop() || 'Attack'}</span>
            </li>
        `).join('')
        : '<li><span class="text-secondary">No specific abilities known</span></li>';
        
    // Generate Locations HTML
    const locsMap = {};
    (monster.locations || []).forEach(l => {
        const baseZone = l.zone.replace('.plist', '');
        if(!locsMap[baseZone] || locsMap[baseZone] < l.chance) {
            locsMap[baseZone] = l.chance; // keep highest chance per zone
        }
    });
    
    const locsHtml = Object.keys(locsMap).length > 0
        ? Object.entries(locsMap)
            .sort((a, b) => b[1] - a[1]) // sort by chance descending
            .map(([zone, chance]) => `
            <li>
                <span class="move-name">${zone}</span>
                <span class="location-chance">${chance}%</span>
            </li>
        `).join('')
        : '<li><span class="text-secondary">Unknown location</span></li>';
        
    // Generate Evolution HTML
    let evoHtml = `<p class="text-secondary">Does not evolve further</p>`;
    if (monster.evolveData && monster.evolveData.newType) {
        const target = monstersData[monster.evolveData.newType];
        if (target) {
            evoHtml = `
                <div class="evolution-path">
                    <div class="evo-node">
                        <img src="images/${monster.image}" alt="${monster.id}">
                        <span>${monster.id}</span>
                    </div>
                    <div class="evo-arrow">
                        <div class="evo-condition">Level ${monster.evolveData.levelReq || '?'}</div>
                        →
                    </div>
                    <div class="evo-node" style="cursor:pointer;" onclick="selectMonsterById('${target.id}')">
                        <img src="images/${target.image}" alt="${target.id}">
                        <span>${target.id}</span>
                    </div>
                </div>
            `;
        }
    }
    
    const stars = monster.stars ? `★`.repeat(Math.floor(monster.stars)) : '';
    
    detailEl.classList.remove('empty-state');
    detailEl.innerHTML = `
        <div class="detail-header">
            <div class="detail-image-container">
                <img src="images/${monster.image}" alt="${monster.id}" class="detail-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PC9zdmc+'">
            </div>
            <div class="detail-title-area">
                <h2>${monster.id}</h2>
                <div class="detail-meta">
                    <span class="element-badge element-${monster.element}">${monster.element || 'Normal'}</span>
                    <span class="quality-stars">${stars}</span>
                    <span style="color:var(--text-secondary); font-size:14px;">Quality: ${monster.quality || '?'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-grid">
            <div class="card">
                <h3>Base Stats</h3>
                <div class="stats-container">
                    ${renderStatRow('HP', stats.MaxHP)}
                    ${renderStatRow('Attack', stats.Attack)}
                    ${renderStatRow('Defense', stats.Defense)}
                    ${renderStatRow('Magic', stats.Magic)}
                    ${renderStatRow('Resist', stats.Resist)}
                    ${renderStatRow('Speed', stats.Speed)}
                </div>
            </div>
            
            <div class="card">
                <h3>Evolution</h3>
                ${evoHtml}
            </div>
            
            <div class="card">
                <h3>Abilities</h3>
                <ul class="info-list">
                    ${movesHtml}
                </ul>
            </div>
            
            <div class="card">
                <h3>Locations</h3>
                <ul class="info-list">
                    ${locsHtml}
                </ul>
            </div>
        </div>
    `;
}

// Global helper for evolution clicking
window.selectMonsterById = function(id) {
    const el = document.querySelector(`.monster-item[data-id="${id}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.click();
    }
};

init();
