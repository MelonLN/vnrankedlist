import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC6nPZI4DYQmK4RT0Y31yen5e7BD8BOLek",
    authDomain: "datavipvl.firebaseapp.com",
    databaseURL: "https://datavipvl-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "datavipvl",
    storageBucket: "datavipvl.firebasestorage.app",
    messagingSenderId: "461205026579",
    appId: "1:461205026579:web:3013f12894e180d9dc8ce6"
};

const app = initializeApp(firebaseConfig);  
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', function () {
    const bracketRoot = document.getElementById('bracket-root');
    const seasonSelectUI = document.getElementById('seasonSelectUI');

    let allSeasonsData = [];
    let currentSeasonId = null;

    function getSeasonFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('season');
    }

    function updateUrl(seasonId) {
        const url = new URL(window.location);
        url.searchParams.set('season', seasonId);
        window.history.pushState({}, '', url);
    }

    function loadData() {
        const dbRef = ref(db, '/'); 

        onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            if (!data || !data.seasons) {
                bracketRoot.innerHTML = '<div class="loading-text">Không tìm thấy dữ liệu giải đấu.</div>';
                return;
            }

            allSeasonsData = data.seasons;
            
            const urlSeasonId = getSeasonFromUrl();
            let seasonToRender = urlSeasonId ? allSeasonsData.find(s => s.id === urlSeasonId) : null;

            if (!seasonToRender) {
                seasonToRender = allSeasonsData[allSeasonsData.length - 1];
            }

            currentSeasonId = seasonToRender.id;
            
            initSeasonPicker(currentSeasonId);
            renderSeason(seasonToRender);
            
            console.log("Dữ liệu đã cập nhật Live từ Firebase!");
        }, (error) => {
            console.error("Firebase Error:", error);
            bracketRoot.innerHTML = '<div class="loading-text">Lỗi kết nối database trực tiếp. Hãy kiểm tra Rules.</div>';
        });
    }

    function initSeasonPicker(activeSeasonId) {
        const root = seasonSelectUI;
        const btn = root.querySelector('.pixel-select__btn');
        const valEl = root.querySelector('.pixel-select__value');
        const list = root.querySelector('.pixel-select__list');

        list.innerHTML = '';

        const displayOrder = [...allSeasonsData].reverse();

        const close = () => {
            if (!root.classList.contains('is-open')) return;
            list.classList.add('exit');
            btn.setAttribute('aria-expanded', 'false');
            const onEnd = (ev) => {
                if (ev.target !== list) return;
                list.classList.remove('exit');
                root.classList.remove('is-open');
                list.removeEventListener('animationend', onEnd);
            };
            list.addEventListener('animationend', onEnd);
        };

        btn.onclick = (e) => {
            e.stopPropagation();
            const open = !root.classList.contains('is-open');
            if (open) {
                list.classList.remove('exit');
                root.classList.add('is-open');
                btn.setAttribute('aria-expanded', 'true');
            } else {
                close();
            }
        };

        document.addEventListener('click', (e) => {
            if (!root.contains(e.target)) close();
        }, { capture: true });

        displayOrder.forEach((s) => {
            const li = document.createElement('li');
            li.className = 'pixel-select__opt';
            if (s.id === activeSeasonId) li.classList.add('is-selected');
            li.textContent = s.name || s.id;
            li.onclick = (e) => {
                e.stopPropagation();
                valEl.textContent = s.name || s.id;
                root.querySelectorAll('.pixel-select__opt').forEach(opt => opt.classList.remove('is-selected'));
                li.classList.add('is-selected');
                updateUrl(s.id);
                currentSeasonId = s.id;
                renderSeason(s);
                close();
            };
            list.appendChild(li);
        });

        const currentActive = allSeasonsData.find(s => s.id === activeSeasonId);
        valEl.textContent = currentActive ? (currentActive.name || currentActive.id) : activeSeasonId;
    }

    function getPlayerData(participants, seed) {
        const s = String(seed);
        if (!participants || !participants[s]) {
            return { name: "    ", points: 0, seed: seed };
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
            
            const titleUpper = round.title.toUpperCase();
            if (titleUpper.includes("BÁN KẾT")) column.classList.add('round-semis');
            if (titleUpper.includes("CHUNG KẾT")) column.classList.add('round-finals');

            const title = document.createElement('div');
            title.className = 'round-title-node';
            title.textContent = round.title;
            column.appendChild(title);

            const matchesWrapper = document.createElement('div');
            matchesWrapper.className = 'matches-wrapper';

            if (round.type === 'list') {
                const listDiv = document.createElement('div');
                listDiv.className = 'qualifier-list';
                const header = document.createElement('div');
                header.className = 'qualifier-header';
                header.innerHTML = `<div>#</div><div>Seed</div><div style="text-align:left; padding-left:15px">Player</div><div>Pts</div>`;
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

                if (round.link) {
                    const watchBtn = document.createElement('div');
                    watchBtn.className = 'watch-btn-tab';
                    watchBtn.innerHTML = '<span>▶ watch</span>';
                    watchBtn.onclick = () => window.open(round.link, '_blank');
                    listDiv.appendChild(watchBtn);
                }
                matchesWrapper.appendChild(listDiv);
            } 
            else {
                round.matches.forEach((m) => {
                    const p1 = getPlayerData(participants, m.seed1);
                    const p2 = getPlayerData(participants, m.seed2);

                    const card = document.createElement('div');
                    card.className = 'match-card';
                    
                    if (m.type === "Grand Finals") card.classList.add('grand-final-card');
                    if (m.type) card.innerHTML += `<div class="match-type-label">${m.type}</div>`;

                    const t1Winner = m.winner === 1 ? 'is-winner' : '';
                    const t2Winner = m.winner === 2 ? 'is-winner' : '';

                    card.innerHTML += `
                        <div class="match-team ${t1Winner}" data-player-seed="${m.seed1}">
                            <div class="team-info">
                                <span class="seed-tag">${m.seed1 || ''}</span>
                                <span class="team-name">${p1.name}</span>
                            </div>
                            <span class="team-score">${m.s1}</span>
                        </div>
                        <div class="match-team ${t2Winner}" data-player-seed="${m.seed2}">
                            <div class="team-info">
                                <span class="seed-tag">${m.seed2 || ''}</span>
                                <span class="team-name">${p2.name}</span>
                            </div>
                            <span class="team-score">${m.s2}</span>
                        </div>
                    `;

                    if (m.link) {
                        const watchBtn = document.createElement('div');
                        watchBtn.className = 'watch-btn-tab';
                        watchBtn.innerHTML = '<span>▶ watch</span>';
                        watchBtn.onclick = (e) => {
                            e.stopPropagation();
                            window.open(m.link, '_blank');
                        };
                        card.appendChild(watchBtn);
                    }
                    
                    card.querySelectorAll('.match-team').forEach(team => {
                        addHoverEvents(team, team.getAttribute('data-player-seed'));
                    });

                    matchesWrapper.appendChild(card);
                });
            }
            column.appendChild(matchesWrapper);
            bracketRoot.appendChild(column);
        });
    }

    function addHoverEvents(el, seed) {
        if (!seed || seed == "0") return;
        el.addEventListener('mouseenter', () => {
            document.querySelectorAll(`[data-player-seed="${seed}"]`).forEach(node => {
                node.classList.add('player-highlight');
                node.closest('.match-card')?.classList.add('player-highlight');
            });
        });
        el.addEventListener('mouseleave', () => {
            document.querySelectorAll('.player-highlight').forEach(node => node.classList.remove('player-highlight'));
        });
    }

    loadData();
});