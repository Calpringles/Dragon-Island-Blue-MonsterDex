let monstersData = {};
let monstersList = [];

// DOM Elements
const monsterListEl = document.getElementById('monster-list');
const searchInput = document.getElementById('search-input');
const elementFilter = document.getElementById('element-filter');
const sortFilter = document.getElementById('sort-filter');
const sortDirBtn = document.getElementById('sort-dir-btn');
const detailEl = document.getElementById('monster-detail');

let sortAsc = true;

// Init
async function init() {
    try {
        const response = await fetch('monsters.json');
        monstersData = await response.json();
        
        // Calculate Base Stat Total and set default sort
        monstersList = Object.values(monstersData).map(m => {
            const stats = m.rootStats || {};
            m.bst = (stats.HP || stats.MaxHP || 0) + (stats.Attack || 0) + (stats.Defense || 0) + (stats.Magic || 0) + (stats.Resist || 0) + (stats.Speed || 0);
            // Default index for monsters that might not have one
            if (m.index === undefined) m.index = 99999;
            return m;
        });
        
        setupEventListeners();
        handleFilter(); // Initial sort and render
    } catch (error) {
        console.error("Failed to load monster data:", error);
        monsterListEl.innerHTML = '<div style="padding: 20px; text-align:center;">Failed to load data. Ensure you are running a local server.</div>';
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', handleFilter);
    elementFilter.addEventListener('change', handleFilter);
    sortFilter.addEventListener('change', handleFilter);
    sortDirBtn.addEventListener('click', () => {
        sortAsc = !sortAsc;
        sortDirBtn.textContent = sortAsc ? '⬆️' : '⬇️';
        handleFilter();
    });
}

function handleFilter() {
    const searchTerm = searchInput.value.toLowerCase();
    const element = elementFilter.value;
    const sortType = sortFilter.value;
    
    let filtered = monstersList.filter(m => {
        const matchesSearch = (m.name || m.id).toLowerCase().includes(searchTerm);
        const matchesElement = element === 'All' || m.element === element;
        return matchesSearch && matchesElement;
    });
    
    filtered.sort((a, b) => {
        let valA, valB;
        switch(sortType) {
            case 'name': valA = (a.name || a.id).toLowerCase(); valB = (b.name || b.id).toLowerCase(); break;
            case 'element': valA = a.element || ''; valB = b.element || ''; break;
            case 'stars': valA = a.stars || 0; valB = b.stars || 0; break;
            case 'stats': valA = a.bst || 0; valB = b.bst || 0; break;
            case 'index':
            default: valA = a.index; valB = b.index; break;
        }
        
        let comparison = 0;
        if (valA < valB) comparison = -1;
        if (valA > valB) comparison = 1;
        
        // Secondary sort by index if primary is tied
        if (comparison === 0 && sortType !== 'index') {
            comparison = a.index - b.index;
        }
        
        return sortAsc ? comparison : -comparison;
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
            <img src="images/${monster.image}" alt="${monster.name || monster.id}" class="monster-thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PC9zdmc+'">
            <div class="monster-item-info">
                <h3>${monster.name || monster.id}</h3>
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
    let chain = [];
    
    // Find root
    let currentId = monster.id;
    let foundParent = true;
    while(foundParent) {
        foundParent = false;
        for (const [key, m] of Object.entries(monstersData)) {
            if (m.evolveData && m.evolveData.newType === currentId) {
                currentId = m.id;
                foundParent = true;
                break;
            }
        }
    }
    
    // Build chain forwards from root
    let currentMonster = monstersData[currentId];
    while(currentMonster) {
        chain.push(currentMonster);
        if (currentMonster.evolveData && currentMonster.evolveData.newType) {
            currentMonster = monstersData[currentMonster.evolveData.newType];
        } else {
            currentMonster = null;
        }
    }

    let evoHtml = `<p class="text-secondary">Does not evolve</p>`;
    if (chain.length > 1) {
        let nodesHtml = chain.map((m, index) => {
            const isCurrent = m.id === monster.id;
            const borderStyle = isCurrent ? 'border: 2px solid var(--accent-color);' : '';
            
            let html = `
                <div class="evo-node" style="cursor:pointer;" onclick="selectMonsterById('${m.id}')">
                    <img src="images/${m.image}" alt="${m.name || m.id}" style="${borderStyle}">
                    <span style="${isCurrent ? 'color: var(--accent-color); font-weight: bold;' : ''}">${m.name || m.id}</span>
                </div>
            `;
            
            if (index < chain.length - 1) {
                const req = m.evolveData.levelReq || '?';
                html += `
                    <div class="evo-arrow">
                        <div class="evo-condition">Level ${req}</div>
                        →
                    </div>
                `;
            }
            return html;
        }).join('');
        
        evoHtml = `
            <div class="evolution-path" style="flex-wrap: wrap; gap: 16px;">
                ${nodesHtml}
            </div>
        `;
    }
    
    const stars = monster.stars ? `★`.repeat(Math.floor(monster.stars)) : '';
    
    detailEl.classList.remove('empty-state');
    detailEl.innerHTML = `
        <div class="detail-header">
            <div class="detail-image-container">
                <img src="images/${monster.image}" alt="${monster.name || monster.id}" class="detail-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCI+PC9zdmc+'">
            </div>
            <div class="detail-title-area">
                <h2>${monster.name || monster.id}</h2>
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
