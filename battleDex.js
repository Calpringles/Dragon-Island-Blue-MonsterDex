let battlesData = [];
let filteredBattles = [];

async function initBattleDex() {
    try {
        const res = await fetch('battles.json');
        battlesData = await res.json();
        filteredBattles = [...battlesData];
        renderBattleList();
    } catch (e) {
        console.error("Failed to load battles", e);
    }
}

function renderBattleList() {
    const list = document.getElementById('battle-list');
    
    if (filteredBattles.length === 0) {
        list.innerHTML = '<div class="empty-message" style="text-align:center; padding: 20px;">No battles found.</div>';
        return;
    }
    
    list.innerHTML = filteredBattles.map((b, idx) => `
        <div class="monster-item" data-idx="${idx}" onclick="selectBattle(${idx})">
            <div class="npc-portrait">${b.npc_id.charAt(0)}</div>
            <div class="monster-item-info">
                <h3>${b.npc_id} ${b.encounter_number > 1 ? `(Encounter ${b.encounter_number})` : ''}</h3>
                <p>Quest: ${b.quest || 'None'}</p>
                <p>${b.monsters.length} Monsters</p>
            </div>
        </div>
    `).join('');
}

window.selectBattle = function(idx) {
    // Update selected state
    document.querySelectorAll('#battle-list .monster-item').forEach(el => el.classList.remove('selected'));
    const selectedEl = document.querySelector(`#battle-list .monster-item[data-idx="${idx}"]`);
    if (selectedEl) selectedEl.classList.add('selected');
    
    const b = filteredBattles[idx];
    const detail = document.getElementById('battle-detail');
    
    const preTextHtml = b.pre_text ? `<div class="battle-dialogue">"${b.pre_text}"</div>` : '';
    const postTextHtml = b.post_text ? `<div class="battle-dialogue" style="border-color: var(--elem-water);">"${b.post_text}"</div>` : '';
    
    const monstersHtml = b.monsters.map(m => {
        const imgName = `${m.type}-hd.png`;
        const bossBadge = m.boss ? '<div class="element-badge element-Fire" style="margin-top:4px;">BOSS</div>' : '';
        return `
            <div class="team-member">
                <img src="${imgName}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJDMiAyIDIgMTIgMTIgMjJDMjIgMTIgMjIgMiAxMiAyWiIvPjwvc3ZnPg=='" alt="${m.type}">
                <div class="level">Lv ${m.level}</div>
                ${bossBadge}
            </div>
        `;
    }).join('');

    detail.innerHTML = `
        <div class="detail-header" style="align-items:center;">
            <div class="npc-portrait" style="width:100px; height:100px; font-size:48px;">${b.npc_id.charAt(0)}</div>
            <div class="detail-title-area">
                <h2>${b.npc_id} ${b.encounter_number > 1 ? `<span style="font-size:24px; color:var(--text-secondary);">Encounter ${b.encounter_number}</span>` : ''}</h2>
                <div class="detail-meta">
                    <span class="element-badge element-Air">Quest: ${b.quest || 'Unknown'}</span>
                    <span class="element-badge element-Normal">${b.monsters.length} Monsters</span>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom:24px;">
            <h3>Dialogue</h3>
            ${preTextHtml}
            ${postTextHtml}
            ${!b.pre_text && !b.post_text ? '<p class="text-secondary">No dialogue available.</p>' : ''}
        </div>
        
        <div class="card">
            <h3>Team Composition</h3>
            <div class="team-grid">
                ${monstersHtml}
            </div>
        </div>
    `;
    
    detail.classList.remove('empty-state');
};

// Search filter
document.getElementById('battle-search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredBattles = battlesData.filter(b => 
        b.npc_id.toLowerCase().includes(term) ||
        b.quest.toLowerCase().includes(term) ||
        (b.pre_text && b.pre_text.toLowerCase().includes(term))
    );
    renderBattleList();
});

// Init
initBattleDex();
