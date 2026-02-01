document.addEventListener('DOMContentLoaded', function () {
    const bracketRoot = document.getElementById('bracket-root');
    const seasonSelectUI = document.getElementById('seasonSelectUI');
    
    let allSeasonsData = [];

    function getSeasonFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('season');
    }

    function updateUrl(seasonId) {
        const url = new URL(window.location);
        url.searchParams.set('season', seasonId);
        window.history.pushState({}, '', url);
    }

    async function loadData() {
        try {
            const response = await fetch('tournament_data.json');
            const data = await response.json();
            allSeasonsData = data.seasons;
            
            if (allSeasonsData.length > 0) {
                const urlSeasonId = getSeasonFromUrl();
                let seasonToRender;

                if (urlSeasonId) {
                    seasonToRender = allSeasonsData.find(s => s.id === urlSeasonId);
                }

                if (!seasonToRender) {
                    seasonToRender = allSeasonsData[allSeasonsData.length - 1];
                }

                initSeasonPicker(seasonToRender.id);
                renderSeason(seasonToRender);
            }
        } catch (e) {
            console.error(e);
            bracketRoot.innerHTML = '<div class="loading-text">Lỗi tải dữ liệu giải đấu.</div>';
        }
    }

    function initSeasonPicker(activeSeasonId) {
        const btn = seasonSelectUI.querySelector('.pixel-select__btn');
        const valEl = seasonSelectUI.querySelector('.pixel-select__value');
        const list = seasonSelectUI.querySelector('.pixel-select__list');

        list.innerHTML = '';
        
        const displayOrder = [...allSeasonsData].reverse();

        displayOrder.forEach((s) => {
            const li = document.createElement('li');
            li.className = 'pixel-select__opt';
            if (s.id === activeSeasonId) li.classList.add('is-selected');
            li.textContent = s.name || `Season ${s.id}`;
            
            li.onclick = () => {
                valEl.textContent = s.id;
                seasonSelectUI.querySelectorAll('.pixel-select__opt').forEach(opt => opt.classList.remove('is-selected'));
                li.classList.add('is-selected');
                
                seasonSelectUI.classList.remove('is-open');
                
                updateUrl(s.id);
                renderSeason(s);
            };
            list.appendChild(li);
        });

        valEl.textContent = activeSeasonId;
        
        btn.onclick = (e) => {
            e.stopPropagation();
            seasonSelectUI.classList.toggle('is-open');
        };
        
        document.addEventListener('click', () => seasonSelectUI.classList.remove('is-open'));
    }

    function getPlayerData(participants, seed) {
        const s = String(seed);
        if (!participants || !participants[s]) {
            return { name: "", points: 0, seed: seed };
        }
        return { 
            name: participants[s].name, 
            points: participants[s].points || 0,
            seed: seed 
        };
    }

    function renderSeason(season) {
        bracketRoot.innerHTML = '';
        const participants = season.participants;

        season.rounds.forEach((round) => {
            const column = document.createElement('div');
            column.className = 'bracket-column';

            const title = document.createElement('div');
            title.className = 'round-title-node';
            title.textContent = round.title;
            column.appendChild(title);

            const matchesWrapper = document.createElement('div');
            matchesWrapper.className = 'matches-wrapper';

            if (round.type === 'list') {
                const listDiv = document.createElement('div');
                listDiv.className = 'qualifier-list';

                if (round.link) {
                    listDiv.classList.add('has-link');
                    listDiv.title = "Bấm để xem video Vòng Sơ Loại";
                    listDiv.onclick = () => window.open(round.link, '_blank');
                }

                const header = document.createElement('div');
                header.className = 'qualifier-header';
                header.innerHTML = `
                    <div>#</div>
                    <div>Seed</div>
                    <div style="text-align:left; padding-left:15px">Player</div>
                    <div>Points</div>
                `;
                listDiv.appendChild(header);

                round.seeds.forEach((seed, i) => {
                    const p = getPlayerData(participants, seed);
                    const item = document.createElement('div');
                    item.className = 'qualifier-item';
                    item.setAttribute('data-player-seed', seed);
                    item.innerHTML = `
                        <div class="qualifier-rank">${i + 1}</div>
                        <div class="qualifier-seed">${seed}</div>
                        <div class="qualifier-name">${p.name}</div>
                        <div class="qualifier-points">${p.points}</div>
                    `;
                    addHoverEvents(item, seed);
                    listDiv.appendChild(item);
                });
                matchesWrapper.appendChild(listDiv);
            } else {
                round.matches.forEach((m) => {
                    const p1 = getPlayerData(participants, m.seed1);
                    const p2 = getPlayerData(participants, m.seed2);

                    const card = document.createElement('div');
                    card.className = 'match-card';
                    
                    if (m.link) {
                        card.classList.add('has-link');
                        card.setAttribute('title', 'Bấm để xem lại trận đấu');
                        card.onclick = (e) => {
                            e.stopPropagation();
                            window.open(m.link, '_blank');
                        };
                    }

                    if(m.type) card.innerHTML += `<div class="match-type-label">${m.type}</div>`;

                    const t1Class = m.winner === 1 ? 'is-winner' : '';
                    const t2Class = m.winner === 2 ? 'is-winner' : '';

                    card.innerHTML += `
                        <div class="match-team ${t1Class}" data-player-seed="${m.seed1}">
                            <div class="team-info">
                                <span class="seed-tag">${m.seed1 || ''}</span>
                                <span class="team-name">${p1.name}</span>
                            </div>
                            <span class="team-score">${m.s1}</span>
                        </div>
                        <div class="match-team ${t2Class}" data-player-seed="${m.seed2}">
                            <div class="team-info">
                                <span class="seed-tag">${m.seed2 || ''}</span>
                                <span class="team-name">${p2.name}</span>
                            </div>
                            <span class="team-score">${m.s2}</span>
                        </div>
                    `;
                    
                    card.querySelectorAll('.match-team').forEach(team => {
                        const seed = team.getAttribute('data-player-seed');
                        addHoverEvents(team, seed);
                    });

                    matchesWrapper.appendChild(card);
                });
            }
            column.appendChild(matchesWrapper);
            bracketRoot.appendChild(column);
        });
    }

    function addHoverEvents(el, seed) {
        if (!seed || seed == 0) return;
        el.addEventListener('mouseenter', () => {
            document.querySelectorAll(`[data-player-seed="${seed}"]`).forEach(node => {
                node.classList.add('player-highlight');
                if (node.classList.contains('match-team')) {
                    node.closest('.match-card')?.classList.add('player-highlight');
                }
                if (node.classList.contains('qualifier-item')) {
                    node.classList.add('player-highlight');
                }
            });
        });
        el.addEventListener('mouseleave', () => {
            document.querySelectorAll('.player-highlight').forEach(node => node.classList.remove('player-highlight'));
        });
    }

    loadData();
});