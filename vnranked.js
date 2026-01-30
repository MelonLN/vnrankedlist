let playerData = []; 
let sortT = 1; 

let chunks = null;
let outerRing = null;
let innerRing = null;
let isDataLoaded = false; 

let isFilterOpen = false;
let hiddenUUIDs = new Set();
let filterValues = {
    minElo: null, maxElo: null,
    minTime: null, maxTime: null,
    minAvg: null, maxAvg: null,
    minWin: null, maxWin: null,
    minFF: null, maxFF: null
};

const seasonCache = {};

const urlParams = new URLSearchParams(window.location.search);
let activeSeason = urlParams.get('season');

function showLoading() {
    const loadingScreen = document.getElementById('loading-contai');
    const table = document.getElementById('rankedTable');
    if (loadingScreen) loadingScreen.style.display = 'block';
    if (table) table.style.display = 'none';

    if (!document.getElementById('loading-progress-text')) {
        const loadingScreenEl = document.getElementById('loading-contai');
        if (loadingScreenEl) {
            const t = document.createElement('div');
            t.id = 'loading-progress-text';
            t.style.marginTop = '8px';
            t.style.fontSize = '13px';
            t.style.color = 'white';
            loadingScreenEl.appendChild(t);
        }
    } else {
        document.getElementById('loading-progress-text').textContent = '';
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-contai');
    const table = document.getElementById('rankedTable');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (table) table.style.display = 'table';
}

function updateLoadingProgress(loaded, total) {
    const progress = total ? (loaded / total) : 1;
    console.log(`[LoadingProgress] ${loaded}/${total} (${Math.round(progress*100)}%)`);

    try {
        if (typeof outerRing !== 'undefined' && outerRing && typeof innerRing !== 'undefined' && innerRing) {
            
            outerRing.allowedRadius = Math.floor(progress * outerRing.maxRadius);
            innerRing.allowedRadius = Math.floor(progress * innerRing.maxRadius);

            const txt = document.getElementById('loading-progress-text');
            if (txt) txt.textContent = `Loading ${loaded}/${total} (${Math.round(progress*100)}%)`;

            if (loaded >= total) {
                isDataLoaded = true;
                
                outerRing.allowedRadius = outerRing.maxRadius;
                innerRing.allowedRadius = innerRing.maxRadius;

                console.log('[LoadingProgress] All UUIDs processed - waiting for animation to finish.');
                
                setTimeout(() => {
                    hideLoading();
                }, 600); 
            }
        } else {
            const txt = document.getElementById('loading-progress-text');
            if (txt) txt.textContent = `Loading ${loaded}/${total} (${Math.round(progress*100)}%)`;
            
            if (loaded >= total) {
                setTimeout(() => { hideLoading(); }, 300);
            }
        }
    } catch (e) {
        console.warn('Error updating rings:', e);
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('loadingCanvas');
    const ctx = canvas.getContext('2d');
    const radius = 10;
    const size = radius * 2 + 1;
    const speedMultiplier = size * size / 1000;
    
    let prevTime = null;

    function generateRing(randomProbability, maxRadius, speed, loader) {
        return expandRing({
            radius: -1,
            maxRadius,
            allowedRadius: -1, 
            neighbourUnloaded: [],
            allUnloaded: [],
            randomProbability: 0.08,
            baseSpeed: speed,
            speed: speed,
            needsLoading: 0,
            loader
        });
    }

    function expandRing(ring) {
        const center = Math.floor(size / 2);
        
        if (ring.radius >= ring.maxRadius) return ring;
        if (ring.radius >= ring.allowedRadius) return ring; 

        ring.radius++;
        ring.neighbourUnloaded = [];
        ring.allUnloaded = [];

        for (let dx = -ring.radius; dx <= ring.radius; dx++) {
            for (let dy = -ring.radius; dy <= ring.radius; dy++) {
                if (Math.abs(dx) != ring.radius && Math.abs(dy) != ring.radius) continue;
                ring.allUnloaded.push({ x: center + dx, y: center + dy });
            }
        }

        return ring;
    }

    function remove(arr, pos) {
        const index = arr.findIndex(p => p.x == pos.x && p.y == pos.y);
        if (index != -1) arr.splice(index, 1);
    }

    function contains(arr, pos) {
        return arr.findIndex(p => p.x == pos.x && p.y == pos.y) != -1;
    }

    function loadChunk(pos, ring) {
        if (!chunks) return;

        if (!ring.loader(pos)) return;

        remove(ring.allUnloaded, pos);
        remove(ring.neighbourUnloaded, pos);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (Math.abs(dx) == Math.abs(dy)) continue;
                let neighbourPos = { x: pos.x + dx, y: pos.y + dy };
                if (!contains(ring.allUnloaded, neighbourPos) || contains(ring.neighbourUnloaded, neighbourPos)) continue;
                ring.neighbourUnloaded.push(neighbourPos);
            }
        }
    }

    function loadFromRing(ring) {
        if (ring.allUnloaded.length == 0) expandRing(ring);

        if (ring.neighbourUnloaded.length > 0 && Math.random() > ring.randomProbability) {
            const chunk = ring.neighbourUnloaded[Math.floor(Math.random() * ring.neighbourUnloaded.length)];
            loadChunk(chunk, ring);
        } else if (ring.allUnloaded.length > 0) {
            const chunk = ring.allUnloaded[Math.floor(Math.random() * ring.allUnloaded.length)];
            loadChunk(chunk, ring);
        }
    }

    function loadMultipleFromRing(ring) {
        while (ring.needsLoading >= 1) {
            if (ring.allUnloaded.length === 0 && ring.neighbourUnloaded.length === 0 && ring.radius >= ring.allowedRadius) {
                ring.needsLoading = 0;
                break;
            }

            loadFromRing(ring);
            ring.needsLoading--;
        }
    }

    function animate(time) {
        if (!canvas) {
            prevTime = null;
            return;
        }

        if (!chunks) init();

        const delta = prevTime ? (time - prevTime) / 1000 : 0;

        update(delta);
        render();

        prevTime = time;
        requestAnimationFrame(animate);
    }

    function updateRingSpeed(ring, delta) {
        const lag = ring.allowedRadius - ring.radius;
        
        let currentSpeed = ring.baseSpeed;

        if (lag > 0) {
            currentSpeed = ring.baseSpeed + (lag * 800); 
        }

        if (isDataLoaded) {
            currentSpeed = 500; 
        }

        ring.speed = currentSpeed;
        ring.needsLoading += ring.speed * delta * speedMultiplier;
        loadMultipleFromRing(ring);
    }

    function update(delta) {
        if (!outerRing || !innerRing) return;

        updateRingSpeed(outerRing, delta);
        updateRingSpeed(innerRing, delta);
    }

    function render() {
        if (!canvas || !chunks) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, size, size);

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                switch (chunks[x][y]) {
                    case 0:
                        ctx.fillStyle = '#ffffff00';
                        break;
                    case 1:
                        ctx.fillStyle = '#303572';
                        break;
                    case 2:
                        ctx.fillStyle = '#87ce34';
                        break;
                    case 3:
                        ctx.fillStyle = '#cccccc';
                        break;
                    case 4:
                        ctx.fillStyle = '#ffffff';
                        break;
                }
                
                if (chunks[x][y] !== 0) {
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }

    function outerLoader(pos) {
        if (!chunks) return false;

        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const level = 3 - Math.max(Math.abs(dx), Math.abs(dy));
                const newPos = { x: pos.x + dx, y: pos.y + dy };
                
                if (newPos.x >= 0 && newPos.x < size && newPos.y >= 0 && newPos.y < size) {
                    chunks[newPos.x][newPos.y] = Math.max(chunks[newPos.x][newPos.y], level);
                }
            }
        }

        return true;
    }

    function innerLoader(pos) {
        if (!chunks || chunks[pos.x][pos.y] != 3) return false;

        chunks[pos.x][pos.y] = 4;
        return true;
    }

    function init() {
        chunks = [];
        for (let x = 0; x < size; x++) {
            chunks.push([]);
            for (let y = 0; y < size; y++) {
                chunks[x].push(0);
            }
        }
        
        isDataLoaded = false;
        outerRing = generateRing(0.1, radius - 2, 150, outerLoader);
        innerRing = generateRing(0.5, radius - 1, 80, innerLoader);
    }

    window.resetLoadingRings = function () {
        init();
        const txt = document.getElementById('loading-progress-text');
        if (txt) txt.textContent = '';
    };

    init();
    requestAnimationFrame(animate);
});

let combinedUUIDs = new Set();

async function fetchUUIDs(season) {
    let uuidsFromGist = [];
    let uuidsRankedVN = [];

    // local
    try {
        const response = await fetch(
          './uuids.json'
        );
        uuidsFromGist = await response.json();
    } catch (error) {
        console.error('Error fetching UUIDs from local file:', error);
    }

    // RANKED
    try {
        const leaderboardUrl = season 
            ? `https://mcsrranked.com/api/leaderboard?country=vn&season=${season}`
            : "https://mcsrranked.com/api/leaderboard?country=vn";
            
        const rankedRes = await fetch(leaderboardUrl);
        const rankedData = await rankedRes.json();

        if (rankedData?.data?.users) {
            uuidsRankedVN = rankedData.data.users.map(u => u.uuid);
        } else {
            console.warn("Ranked VN API returned no users array.");
        }
    } catch (error) {
        console.error("Error fetching VN leaderboard:", error);
    }
    const combined = [
        ...new Set([
            ...uuidsFromGist,
            ...uuidsRankedVN
        ])
    ];

    combinedUUIDs = new Set(combined);

    return combined;
}

document.getElementById('search').addEventListener('click', fetchDataUser);

const subscribeButton = document.getElementById('btsm');
subscribeButton.disabled = false;
subscribeButton.classList.add('off');

subscribeButton.addEventListener('click', async function (event) {
    event.preventDefault();
    const emailInput = document.getElementById('Email');
    const messageEl = document.getElementById('message');

    const lastSent = localStorage.getItem('lastSubscribeTime');
    if (lastSent) {
        const now = Date.now();
        let remaining = COOLDOWN_TIME - (now - Number(lastSent));

        if (remaining > 0) {
            if (cooldownInterval) clearInterval(cooldownInterval);

            const updateText = () => {
                if (remaining <= 0) {
                    clearInterval(cooldownInterval);
                    cooldownInterval = null;
                    messageEl.innerText = '';
                    return;
                }

                const secondsLeft = Math.ceil(remaining / 1000);
                const minutes = Math.floor(secondsLeft / 60);
                const seconds = secondsLeft % 60;

                messageEl.innerText =
                    `Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before sending again.`;
                messageEl.style.display = 'block';

                remaining -= 1000;
            };

            updateText();
            cooldownInterval = setInterval(updateText, 1000);
            return;
        }
    }

    if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
    }

    if (!window.currentUUID) {
        messageEl.innerText = "No UUID to subscribe.";
        messageEl.style.display = 'block';
        return;
    }

    if (combinedUUIDs.has(window.currentUUID)) {
        messageEl.innerText = "This player is already subscribed.";
        messageEl.style.display = 'block';
        return;
    }


    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbyKP-dBiOrhKmG4HhWSRGO0Q2sICAoYZHfgOvYbCUjA0YHkML0GzqQWMMwIPk6xJ7do/exec", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain" 
            },
            body: JSON.stringify({
                uuid: window.currentUUID,
                country: window.currentCountry || "unknown",
                email: emailInput.value.trim()
            })
        }); 

        if (!response.ok) {
            throw new Error("Request failed");
        }

        messageEl.innerText = "Your request has been sent!";
        messageEl.style.display = 'block';
        localStorage.setItem('lastSubscribeTime', Date.now());

    } catch (error) {
        console.error("Error subscribing:", error);
        messageEl.innerText = "Failed to send your request. Please try again later.";
        messageEl.style.display = 'block';
    }
});


async function fetchDataUser(event) {
    event.preventDefault();
    const results = [];
    const userinGameName = document.getElementById('InGameName').value.trim();
    
    if (!userinGameName) {
        document.getElementById('info').innerHTML = 'Please enter in game name.';
        subscribeButton.disabled = true;
        subscribeButton.classList.add('off');
        return;
    }
    
    try {
        const userApiUrl = activeSeason 
            ? `https://mcsrranked.com/api/users/${encodeURIComponent(userinGameName)}?season=${activeSeason}`
            : `https://mcsrranked.com/api/users/${encodeURIComponent(userinGameName)}`;

        const userDataResponseS = await fetch(userApiUrl);
        if (!userDataResponseS.ok) {
            throw new Error('Network response was not ok');
        }
        const userDataS = await userDataResponseS.json();

        if (!userDataS || !userDataS.data) {
            throw new Error('No user data returned');
        }

        const data = userDataS.data;
        let { nickname, eloRate, eloRank, uuid, country } = data;

        // If viewing past season, check seasonResult for accurate data
        if (activeSeason && data.seasonResult && data.seasonResult.last) {
            eloRate = data.seasonResult.last.eloRate || eloRate;
            eloRank = data.seasonResult.last.eloRank || eloRank;
        }

        if (eloRate !== null && eloRank !== null) {
            results.push({ nickname, eloRate, eloRank, uuid, country });
        }

        displayPlayerDataS(results);

        window.currentUUID = uuid;
        window.currentCountry = country;
 
    } catch (error) {
        document.getElementById('info').innerHTML = `This name was not found, please try again!`;
        subscribeButton.disabled = true;
        subscribeButton.classList.add('off');
        console.error('Error fetching data:', error);
    }
}


function displayPlayerDataS(data) {
    const info = document.getElementById('info');
    info.innerHTML = '';
    subscribeButton.classList.remove('off');

    data.forEach((user) => {

        const avatar = document.createElement('img');
        avatar.src = `https://mc-heads.net/avatar/${user.uuid}`;
        avatar.width = 40;
        avatar.height = 40;
        avatar.alt = 'Profile Picture';

        const profile = document.createElement('div');
        profile.className = 'profile';

        const proinfoTop = document.createElement('div');
        proinfoTop.className = 'proinfo';

        const name = document.createElement('div');
        name.style.fontFamily = "ranked, monospace";
        name.textContent = user.nickname + "| ";

        const ladder = document.createElement('div');
        ladder.style.fontSize = "18px";
        ladder.textContent = `#${user.eloRank}`;

        proinfoTop.appendChild(name);
        proinfoTop.appendChild(ladder);

        const proinfoBottom = document.createElement('div');
        proinfoBottom.className = 'proinfo';

        const rank = document.createElement('div');

        if (user.eloRate >= 2000) {
            rank.style.color = 'purple';
            rank.textContent = 'NETHERITE';
        } else if (user.eloRate >= 1500) {
            rank.style.color = 'cyan';
            rank.textContent = 'DIAMOND';
        } else if (user.eloRate >= 1200) {
            rank.style.color = 'lime';
            rank.textContent = 'EMERALD';
        } else if (user.eloRate >= 900) {
            rank.style.color = 'gold';
            rank.textContent = 'GOLD';
        } else if (user.eloRate >= 600) {
            rank.style.color = 'silver';
            rank.textContent = 'IRON';
        } else {
            rank.style.color = 'black';
            rank.textContent = 'COAL';
        }

        const elo = document.createElement('div');
        elo.innerHTML = `&nbsp;(${user.eloRate} Elo)`;

        proinfoBottom.appendChild(rank);
        proinfoBottom.appendChild(elo);

        profile.appendChild(proinfoTop);
        profile.appendChild(proinfoBottom);

        info.appendChild(avatar);
        info.appendChild(profile);
    });
}

async function fetchDataForUUIDs(season) {
    const cacheKey = season || 'current';
    
    if (seasonCache[cacheKey]) {
        console.log(`[Cache] Loading data for season: ${cacheKey}`);
        playerData = seasonCache[cacheKey];
        sortPlayerData();
        displayPlayerData();
        hideLoading();
        updateSeasonUI(season);
        return;
    }

    playerData = [];
    console.log('[fetchDataForUUIDs] start');

    try {
        const uuids = await fetchUUIDs(season);
        if (!Array.isArray(uuids)) {
            console.error('[fetchDataForUUIDs] fetchUUIDs did not return an array', uuids);
            return;
        }

        const totalUuids = uuids.length;
        console.log(`[fetchDataForUUIDs] total UUIDs: ${totalUuids}`);

        if (totalUuids === 0) {
            updateLoadingProgress(0, 0);
            return;
        }

        isDataLoaded = false;

        if (typeof window.resetLoadingRings === 'function') {
            window.resetLoadingRings();
        } else {
            if (outerRing) {
                outerRing.radius = -1;
                outerRing.allowedRadius = -1;
                outerRing.neighbourUnloaded = [];
                outerRing.allUnloaded = [];
                outerRing.needsLoading = 0;
            }
            if (innerRing) {
                innerRing.radius = -1;
                innerRing.allowedRadius = -1;
                innerRing.neighbourUnloaded = [];
                innerRing.allUnloaded = [];
                innerRing.needsLoading = 0;
            }
            if (chunks) {
                for (let x = 0; x < chunks.length; x++) {
                    for (let y = 0; y < chunks[x].length; y++) {
                        chunks[x][y] = 0;
                    }
                }
            }
        }

        showLoading();

        let loadedCount = 0;
        const results = [];

        const BATCH_SIZE = 30;      
        const BATCH_DELAY_MS = 100; 

        for (let i = 0; i < totalUuids; i += BATCH_SIZE) {
            const batch = uuids.slice(i, i + BATCH_SIZE);

            const promises = batch.map(async (uuid) => {
                try {
                    const apiUrl = season
                        ? `https://mcsrranked.com/api/users/${uuid}?season=${season}`
                        : `https://mcsrranked.com/api/users/${uuid}`;
                        
                    const userDataResponse = await fetch(apiUrl);
                    if (!userDataResponse.ok) {
                        console.warn(`[fetchDataForUUIDs] non-OK response ${userDataResponse.status} for uuid ${uuid}`);
                        return null;
                    }
                    const userData = await userDataResponse.json();
                    return userData;
                } catch (playerError) {
                    console.error(`[fetchDataForUUIDs] Fetch failed for UUID ${uuid}:`, playerError);
                    return null;
                } finally {
                    loadedCount++;
                    try {
                        updateLoadingProgress(loadedCount, totalUuids);
                    } catch (e) {
                        console.error('updateLoadingProgress threw:', e);
                    }
                }
            });

            const batchResults = await Promise.all(promises);
            results.push(...batchResults);

            if (i + BATCH_SIZE < totalUuids) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            }
        }

        results.forEach(userData => {
            if (!userData || !userData.data) return;

            const data = userData.data;
            let eloRate = data.eloRate;
            
            if (season && data.seasonResult && data.seasonResult.last) {
                eloRate = data.seasonResult.last.eloRate || eloRate;
            }

            const seasonStats = data.statistics?.season;
            let bestTimeRanked = seasonStats?.bestTime?.ranked;
            const winsRanked = seasonStats?.wins?.ranked || 0;
            const losesRanked = seasonStats?.loses?.ranked || 0;
            const forfeitsRanked = seasonStats?.forfeits?.ranked || 0;
            const playedMatchesRanked = seasonStats?.playedMatches?.ranked || 0;
            const completionTimeRanked = seasonStats?.completionTime?.ranked || 0;
            const completionsRanked = seasonStats?.completions?.ranked || 0;
            const uuid = data.uuid;

            let includePlayer = (eloRate !== null && eloRate !== "null" && playedMatchesRanked !== 0);

            if (includePlayer) {
                let nickname = data.nickname;
                let ffRate = (playedMatchesRanked > 0) ? (forfeitsRanked / playedMatchesRanked) * 100 : 0;
                let avgTime = (completionsRanked > 0) ? (completionTimeRanked / completionsRanked) : null;

                playerData.push({ uuid, nickname, eloRate, bestTimeRanked, winsRanked, losesRanked, ffRate, avgTime });
            }
        });

        seasonCache[cacheKey] = [...playerData];

        sortPlayerData();
        displayPlayerData();
        updateSeasonUI(season);

    } catch (error) {
        console.error('[fetchDataForUUIDs] Error fetching UUID list:', error);
    } finally {
        console.log('[fetchDataForUUIDs] finished');
    }
}

function updateSeasonUI(season) {
    const leaderboardApiUrl = season 
        ? `https://mcsrranked.com/api/leaderboard?season=${season}`
        : 'https://mcsrranked.com/api/leaderboard';

    fetch(leaderboardApiUrl)
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          const seasonNumber = data.data.season.number;
          document.getElementById("tt").textContent = `Season `;
          
          if (data.data.season.endsAt && !season) {
            countDownDate = new Date(data.data.season.endsAt * 1000);
          } else if (season) {
            countDownDate = null;
            document.getElementById("time").innerText = "Season Ended";
          }
        }
      });
}

function sortPlayerData() {
    if (sortT == 1) {
        playerData.sort((a, b) => b.eloRate - a.eloRate);
    } else if (sortT == 2) {
        playerData.sort((a, b) => {
            if (!a.bestTimeRanked && !b.bestTimeRanked) return 0;
            if (!a.bestTimeRanked) return 1;
            if (!b.bestTimeRanked) return -1;
            return a.bestTimeRanked - b.bestTimeRanked;
        });
    } else if (sortT == 3) {
        playerData.sort((a, b) => {
            const winA = a.winsRanked + a.losesRanked > 0 ? (a.winsRanked / (a.winsRanked + a.losesRanked)) : 0;
            const winB = b.winsRanked + b.losesRanked > 0 ? (b.winsRanked / (b.winsRanked + b.losesRanked)) : 0;
            return winB - winA;
        });
    } else if (sortT == 4) {
        playerData.sort((a, b) => {
            if (!a.avgTime && !b.avgTime) return 0;
            if (!a.avgTime) return 1;
            if (!b.avgTime) return -1;
            return a.avgTime - b.avgTime;
        });
    }
}


function formatTime(timeInMs) {
    const minutes = Math.floor(timeInMs / (60 * 1000));
    const seconds = Math.floor((timeInMs % (60 * 1000)) / 1000);
    const milliseconds = Math.floor((timeInMs % 1000));
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

document.addEventListener('DOMContentLoaded', function() {
    const eloHeader = document.querySelector('th:nth-child(3)');
    const bestTimeHeader = document.querySelector('th:nth-child(4)');
    const avgTimeHeader = document.querySelector('#avgTimeHeader');
    const winrateHeader = document.querySelector('#winrateHeader');

    const eloArrow = document.getElementById("eloArrow");
    const timeArrow = document.getElementById("timeArrow");
    const avgArrow = document.getElementById("avgArrow");
    const winArrow = document.getElementById("winArrow");

    function resetAllArrows() {
        [eloArrow, timeArrow, avgArrow, winArrow].forEach(arrow => {
            arrow.classList.remove("arrow-rotated", "arrow-normal");
            arrow.classList.add("arrow-normal");
        });
    }

    function activateArrow(arrow) {
        resetAllArrows();
        arrow.classList.remove("arrow-normal");
        arrow.classList.add("arrow-rotated");
    }

    eloHeader.addEventListener('click', function () {
        sortT = 1;
        sortPlayerData();
        displayPlayerData();
        activateArrow(eloArrow);
    });

    bestTimeHeader.addEventListener('click', function () {
        sortT = 2;
        sortPlayerData();
        displayPlayerData();
        activateArrow(timeArrow);
    });

    avgTimeHeader.addEventListener('click', function () {
            sortT = 4;
            sortPlayerData();
            displayPlayerData();
            activateArrow(avgArrow);
        });

    winrateHeader.addEventListener('click', function () {
        sortT = 3;
        sortPlayerData();
        displayPlayerData();
        activateArrow(winArrow);
    });

    const filterBtn = document.getElementById('filterBtn');
    const filterSidebar = document.getElementById('filterSidebar');
    const closeFilter = document.getElementById('closeFilter');
    const resetFilterBtn = document.getElementById('resetFilters');

    function toggleFilter() {
        isFilterOpen = !isFilterOpen;
        if (isFilterOpen) {
            filterSidebar.classList.add('active');
        } else {
            filterSidebar.classList.remove('active');
        }
        displayPlayerData();
    }

    if (filterBtn) filterBtn.addEventListener('click', toggleFilter);
    if (closeFilter) closeFilter.addEventListener('click', toggleFilter);

    const inputs = [
        { id: 'minElo', key: 'minElo', type: 'int' },
        { id: 'maxElo', key: 'maxElo', type: 'int' },
        { id: 'minWin', key: 'minWin', type: 'float' },
        { id: 'maxWin', key: 'maxWin', type: 'float' },
        { id: 'minFF', key: 'minFF', type: 'float' },
        { id: 'maxFF', key: 'maxFF', type: 'float' },
        { id: 'minTime', key: 'minTime', type: 'time' },
        { id: 'maxTime', key: 'maxTime', type: 'time' },
        { id: 'minAvg', key: 'minAvg', type: 'time' },
        { id: 'maxAvg', key: 'maxAvg', type: 'time' }
    ];

    inputs.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener('input', () => {
                let val = el.value.trim();
                if (val === '') {
                    filterValues[item.key] = null;
                } else {
                    if (item.type === 'int') filterValues[item.key] = parseInt(val);
                    else if (item.type === 'float') filterValues[item.key] = parseFloat(val);
                    else if (item.type === 'time') filterValues[item.key] = parseTimeToMs(val);
                }
                displayPlayerData();
            });
        }
    });

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            inputs.forEach(item => {
                const el = document.getElementById(item.id);
                if (el) el.value = '';
                filterValues[item.key] = null;
            });
            hiddenUUIDs.clear();
            displayPlayerData();
        });
    }

    fetchDataForUUIDs(activeSeason);
});

const profileModal = document.getElementById('profileModal');
const profileIframe = document.getElementById('profileIframe');
// SỬA: Chọn đúng nút đóng của profile modal (trong block #close-modal) thay vì lấy phần tử đầu tiên có class .iframe-close
const profileCloseBtn = document.querySelector('#close-modal .iframe-close'); 
const closemodal = document.getElementById('close-modal');


function openProfilePopup(nickname) {
    if (!nickname) return;
    
    const statsUrl = activeSeason 
        ? `https://mcsrranked.com/stats/${nickname}?season=${activeSeason}`
        : `https://mcsrranked.com/stats/${nickname}`;

    profileIframe.src = statsUrl;

    profileModal.classList.remove('iframe-exit');
    profileModal.style.display = 'flex';

    const content = profileModal.querySelector('.iframe-modal-content');
    content.classList.remove('iframe-content-exit');
    closemodal.classList.remove('close-exit');
}

function closeProfilePopup() {
    const content = profileModal.querySelector('.iframe-modal-content');

    profileModal.classList.add('iframe-exit');
    content.classList.add('iframe-content-exit');
    closemodal.classList.add('close-exit');

    setTimeout(() => {
        profileIframe.src = '';
        profileModal.style.display = 'none';

        profileModal.classList.remove('iframe-exit');
        content.classList.remove('iframe-content-exit');
        closemodal.classList.remove('close-exit');
    }, 500);
}

if (profileCloseBtn) {
    profileCloseBtn.addEventListener('click', closeProfilePopup);
}

if (profileModal) {
    profileModal.addEventListener('click', function (e) {
        if (e.target === profileModal) {
            closeProfilePopup();
        }
    });
}


function displayPlayerData() {
    const rankedBody = document.getElementById('rankedBody');
    const tableHeadRow = document.querySelector('#rankedTable thead tr');
    
    // Xử lý Header Checkbox
    let existingCheckTh = tableHeadRow.querySelector('.checkbox-col');
    if (isFilterOpen) {
        if (!existingCheckTh) {
            const th = document.createElement('th');
            th.className = 'checkbox-col';
            th.textContent = 'Show';
            tableHeadRow.insertBefore(th, tableHeadRow.firstChild);
        }
    } else {
        if (existingCheckTh) {
            existingCheckTh.remove();
        }
    }

    rankedBody.innerHTML = '';

    let displayIndex = 1;

    playerData.forEach((userData) => {
        const passesFilter = checkFilterPass(userData);
        
        let passesNumeric = true;
        if (filterValues.minElo !== null && userData.eloRate < filterValues.minElo) passesNumeric = false;
        if (filterValues.maxElo !== null && userData.eloRate > filterValues.maxElo) passesNumeric = false;

        let shouldRender = false;
        let isManualHidden = hiddenUUIDs.has(userData.uuid);

        let numericPass = true;
        if (filterValues.minElo !== null && userData.eloRate < filterValues.minElo) numericPass = false;
        if (filterValues.maxElo !== null && userData.eloRate > filterValues.maxElo) numericPass = false;
        
        if (isFilterOpen) {
             if (checkNumericFilters(userData)) shouldRender = true;
        } else {
            if (checkFilterPass(userData)) shouldRender = true;
        }

        if (!shouldRender) return;

        const row = rankedBody.insertRow();
        row.classList.add('player-row');

        if (isFilterOpen) {
            const checkCell = row.insertCell(0);
            checkCell.className = 'checkbox-col';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'filter-check';
            cb.checked = !isManualHidden;
            
            cb.onclick = (e) => {
                e.stopPropagation();
                if (cb.checked) {
                    hiddenUUIDs.delete(userData.uuid);
                } else {
                    hiddenUUIDs.add(userData.uuid);
                }
            };
            checkCell.appendChild(cb);
        }

        const rankCell = row.insertCell();
        rankCell.textContent = displayIndex++;
        rankCell.style.textAlign = 'center';

        const nameCell = row.insertCell();
        nameCell.style.textAlign = 'left';
        const profileNameContainer = document.createElement('div');
        profileNameContainer.style.display = 'inline-block';

        const profilePic = document.createElement('img');
        profilePic.src = `https://mc-heads.net/avatar/${userData.uuid}`;
        profilePic.width = 16;
        profilePic.height = 16;
        profilePic.alt = 'Profile Picture';
        profilePic.style.marginRight = '4px';

        const playerName = document.createElement('span');
        playerName.textContent = userData.nickname;

        profileNameContainer.appendChild(profilePic);
        profileNameContainer.appendChild(playerName);
        nameCell.appendChild(profileNameContainer);

        const eloCell = row.insertCell();
        eloCell.textContent = userData.eloRate;
        eloCell.style.textAlign = 'center';

        const bestTimeCell = row.insertCell();
        bestTimeCell.textContent = userData.bestTimeRanked ? formatTime(userData.bestTimeRanked) : '-';
        bestTimeCell.style.textAlign = 'center';

        const avgTimeCell = row.insertCell();
        avgTimeCell.textContent = userData.avgTime ? formatTime(userData.avgTime) : '-';
        avgTimeCell.style.textAlign = 'center';

        let winRate = (userData.winsRanked + userData.losesRanked > 0) 
            ? (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 
            : 0;
        let ffRate = userData.ffRate.toFixed(2);

        const winRateCell = row.insertCell();
        winRateCell.textContent = winRate.toFixed(2) + "%";
        winRateCell.style.textAlign = 'center';

        const ffRateCell = row.insertCell();
        ffRateCell.textContent = `${ffRate}%`;
        ffRateCell.style.textAlign = 'center';

        if (userData.eloRate >= 2000) eloCell.style.color = 'purple';
        else if (userData.eloRate >= 1500) eloCell.style.color = 'cyan';
        else if (userData.eloRate >= 1200) eloCell.style.color = 'lime';
        else if (userData.eloRate >= 900) eloCell.style.color = 'gold';
        else if (userData.eloRate >= 600) eloCell.style.color = 'silver';
        else eloCell.style.color = 'black';

        row.addEventListener('click', function (e) {
            if (e.target.type !== 'checkbox') {
                openProfilePopup(userData.nickname);
            }
        });
    });
}

function checkNumericFilters(player) {
    if (filterValues.minElo !== null && player.eloRate < filterValues.minElo) return false;
    if (filterValues.maxElo !== null && player.eloRate > filterValues.maxElo) return false;

    let winRate = (player.winsRanked + player.losesRanked > 0) 
        ? (player.winsRanked / (player.winsRanked + player.losesRanked)) * 100 : 0;
    if (filterValues.minWin !== null && winRate < filterValues.minWin) return false;
    if (filterValues.maxWin !== null && winRate > filterValues.maxWin) return false;

    if (filterValues.minFF !== null && player.ffRate < filterValues.minFF) return false;
    if (filterValues.maxFF !== null && player.ffRate > filterValues.maxFF) return false;

    if (filterValues.minTime !== null) {
        if (!player.bestTimeRanked || player.bestTimeRanked < filterValues.minTime) return false;
    }
    if (filterValues.maxTime !== null) {
        if (!player.bestTimeRanked || player.bestTimeRanked > filterValues.maxTime) return false;
    }

    if (filterValues.minAvg !== null) {
        if (!player.avgTime || player.avgTime < filterValues.minAvg) return false;
    }
    if (filterValues.maxAvg !== null) {
        if (!player.avgTime || player.avgTime > filterValues.maxAvg) return false;
    }
    return true;
}

function getSelectedSeasonForExport() {
    if (activeSeason) return String(activeSeason);
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect && seasonSelect.value) return String(seasonSelect.value);
    return "current";
}


function convertToCSV() {
    const clickTime = new Date();
    const moment = window.moment;
    const timestamp = moment(clickTime).format('YYYY-MM-DD~HH:mm:ss');

    const seasonValue = getSelectedSeasonForExport();

    let csv = '';
    csv += `Season: ${seasonValue}\n`;
    csv += `Exported at: ${timestamp}\n`;
    csv += `\n`; 

    csv += '#,Nickname,Elo Rate,Best Time,Avg Time,Win Rate,FF Rate\n';

    playerData.forEach((userData, index) => {
        let winRate = (userData.winsRanked + userData.losesRanked > 0)
            ? (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100
            : 0;

        csv += `${index + 1},${userData.nickname},${userData.eloRate},` +
               `${userData.bestTimeRanked ? formatTime(userData.bestTimeRanked) : '-'},` +
               `${userData.avgTime ? formatTime(userData.avgTime) : '-'},` +
               `${winRate.toFixed(2)}%,${userData.ffRate.toFixed(2)}%\n`;
    });

    return csv;
}

function downloadCSV() {
    try {
      const clickTime = new Date();
      const moment = window.moment;
      const timestamp = moment(clickTime).format('YYYY-MM-DD~HH:mm:ss');
      const csvContent = convertToCSV();

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const seasonValue = getSelectedSeasonForExport();
      const filename = `ranked_table_season_${seasonValue}_${timestamp}.csv`;
      a.download = filename;
  
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Có lỗi khi tải xuống file CSV:', error);
      alert('Tải xuống thất bại. Kiểm tra console để biết chi tiết.');
    }
}
document.getElementById('downloadButton').addEventListener('click', downloadCSV);

let countDownDate;

fetch('https://mcsrranked.com/api/leaderboard')
  .then(response => response.json())
  .then(currentData => {
    if (currentData.status === "success") {
      const latestSeason = currentData.data.season.number;
      const seasonSelect = document.getElementById('seasonSelect');
      
      if (seasonSelect) {
        seasonSelect.innerHTML = '';
        for (let i = latestSeason; i >= 1; i--) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = i;
          if (activeSeason) {
            if (i == activeSeason) option.selected = true;
          } else if (i == latestSeason) {
            option.selected = true;
          }
          seasonSelect.appendChild(option);
            syncPixelSelectFromNative();
        }

        seasonSelect.addEventListener('change', function() {
          const newSeason = this.value;
          const url = new URL(window.location.href);
          
          if (newSeason == latestSeason) {
            url.searchParams.delete('season');
            activeSeason = null;
          } else {
            url.searchParams.set('season', newSeason);
            activeSeason = newSeason;
          }
          
          history.pushState({}, '', url);
          
          fetchDataForUUIDs(activeSeason);
        });
      }
    }
  })
  .catch(error => console.error("Error initializing season data:", error));

window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    activeSeason = urlParams.get('season');
    
    // Sync the selector UI
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) {
        if (!activeSeason) {
            seasonSelect.selectedIndex = 0;
        } else {
            seasonSelect.value = activeSeason;
        }
    }
    
    fetchDataForUUIDs(activeSeason);
});

function syncPixelSelectFromNative() {
  const root = document.getElementById("seasonSelectUI");
  const native = document.getElementById("seasonSelect");
  const btn = root.querySelector(".pixel-select__btn");
  const valueEl = root.querySelector(".pixel-select__value");
  const list = root.querySelector(".pixel-select__list");

  list.innerHTML = "";
  [...native.options].forEach((opt) => {
    const li = document.createElement("li");
    li.className = "pixel-select__opt";
    li.setAttribute("role", "option");
    li.dataset.value = opt.value;
    li.textContent = opt.textContent;

    if (opt.selected) li.classList.add("is-selected");
    list.appendChild(li);
  });

  const selected = native.options[native.selectedIndex];
  valueEl.textContent = selected ? selected.textContent : "—";

    const close = () => {
    if (!root.classList.contains("is-open")) return;

    list.classList.add("exit");
    btn.setAttribute("aria-expanded", "false");

    const onEnd = (ev) => {
        if (ev.target !== list) return;

        list.classList.remove("exit");
        root.classList.remove("is-open");
        list.removeEventListener("animationend", onEnd);
    };

    list.addEventListener("animationend", onEnd);
    };

    btn.onclick = () => {
    const open = !root.classList.contains("is-open");

    if (open) {
        list.classList.remove("exit");
        root.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
    } else {
        close();
    }
    };

  list.onclick = (e) => {
    const item = e.target.closest(".pixel-select__opt");
    if (!item) return;

    native.value = item.dataset.value;

    list.querySelectorAll(".pixel-select__opt").forEach(x => x.classList.remove("is-selected"));
    item.classList.add("is-selected");
    valueEl.textContent = item.textContent;

    native.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  };

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) close();
  }, { capture: true });
}


let x = setInterval(function() {
    if (!countDownDate) return; 
    let now = new Date().getTime(); 
    let distance = countDownDate - now; 

    let days = Math.floor(distance / (1000 * 60 * 60 * 24));
    let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const formattedHours = hours < 10 ? "0" + hours : hours;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;
    
    document.getElementById("time").innerText = "End in " + days + " days " + formattedHours + ":"
    + formattedMinutes + ":" + formattedSeconds;
   
    if (distance < 0) {
        clearInterval(x);
        document.getElementById("time").innerText = "Season Ended";
    }
}, 1000);

var modal = document.getElementById('myModal');
var modal2 = document.getElementById('myModal-content');
var btn = document.getElementById("Sub");
var span = document.getElementsByClassName("close")[0]; 

if(btn) {
    btn.onclick = function() {
        modal.style.display = "flex";
    }
}

if(span) {
    span.onclick = function() {
        modal.classList.add('modal-exit2');
        modal2.classList.add('modal-exit');
        setTimeout(function() {
            modal.style.display = 'none';
            modal.classList.remove('modal-exit2');
            modal2.classList.remove('modal-exit');
        }, 500); 
    }
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.classList.add('modal-exit2');
    modal2.classList.add('modal-exit');
    setTimeout(function() {
      modal.style.display = 'none';
      modal.classList.remove('modal-exit2');
      modal2.classList.remove('modal-exit');
    }, 500);
  }
}

let cooldownInterval = null;
const COOLDOWN_TIME = 5 * 60 * 1000;

var esteregg = document.getElementById("big");
var clickCount = 0;

function playTing() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1).connect(audioCtx.destination);
    osc1.frequency.value = 1000; 
    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);

    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.1); 

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2).connect(audioCtx.destination);
    osc2.frequency.value = 1200; 
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.12);

    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 0.22);
}

if(esteregg) {
    esteregg.onclick = async function() {
        clickCount++;
        if (clickCount < 20) return;

        clickCount = 0;

        try {
            playTing(); 

            const res = await fetch("https://icanhazdadjoke.com/", {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "MyApp (https://example.com)"
                }
            });
            const data = await res.json();
            const message = data.joke;

            await fetch("https://script.google.com/macros/s/AKfycbyMmHuGl-0UXteK_fK8G6YjAzQfc5weyAkI3EMjq_SXz5qE6iK1IrPCs_D-otlet2NnDQ/exec", {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            });
        } catch (err) {
            console.error(err);
        }
    };
}

const modalSidebar = document.getElementById('profileModal');
const dragHandle = document.getElementById('resizer');

if (dragHandle && modalSidebar) {
    dragHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        
        document.body.classList.add('resizing-active');
        window.addEventListener('mousemove', resizeSidebar);
        window.addEventListener('mouseup', stopResizingSidebar);
    });

    function resizeSidebar(e) {
        let newWidth = window.innerWidth - e.clientX;

        if (newWidth > 200 && newWidth < window.innerWidth * 0.8) {
            modalSidebar.style.setProperty('--sidebar-width', newWidth + 'px');
        }
    }

    function stopResizingSidebar() {
        document.body.classList.remove('resizing-active');
        window.removeEventListener('mousemove', resizeSidebar);
        window.removeEventListener('mouseup', stopResizingSidebar);
    }
}

function parseTimeToMs(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const min = parseInt(parts[0], 10);
    const sec = parseInt(parts[1], 10);
    if (isNaN(min) || isNaN(sec)) return null;
    return (min * 60 + sec) * 1000;
}

function checkFilterPass(player) {
    if (hiddenUUIDs.has(player.uuid)) return false;

    if (filterValues.minElo !== null && player.eloRate < filterValues.minElo) return false;
    if (filterValues.maxElo !== null && player.eloRate > filterValues.maxElo) return false;

    let winRate = (player.winsRanked + player.losesRanked > 0) 
        ? (player.winsRanked / (player.winsRanked + player.losesRanked)) * 100 : 0;
    if (filterValues.minWin !== null && winRate < filterValues.minWin) return false;
    if (filterValues.maxWin !== null && winRate > filterValues.maxWin) return false;

    if (filterValues.minFF !== null && player.ffRate < filterValues.minFF) return false;
    if (filterValues.maxFF !== null && player.ffRate > filterValues.maxFF) return false;

    if (filterValues.minTime !== null) {
        if (!player.bestTimeRanked || player.bestTimeRanked < filterValues.minTime) return false;
    }
    if (filterValues.maxTime !== null) {
        if (!player.bestTimeRanked || player.bestTimeRanked > filterValues.maxTime) return false;
    }

    if (filterValues.minAvg !== null) {
        if (!player.avgTime || player.avgTime < filterValues.minAvg) return false;
    }
    if (filterValues.maxAvg !== null) {
        if (!player.avgTime || player.avgTime > filterValues.maxAvg) return false;
    }

    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    var champModal = document.getElementById("championshipModal");
    var champBtn = document.getElementById("championshipBtn");
    var champClose = document.getElementsByClassName("close-champ")[0];

    // Khi bấm nút Championship thì mở Modal
    if (champBtn) {
        champBtn.onclick = function() {
            champModal.style.display = "flex";
        }
    }

    // Khi bấm nút X thì đóng Modal
    if (champClose) {
        champClose.onclick = function() {
            champModal.style.display = "none";
        }
    }

    // Khi bấm ra ngoài vùng trắng thì đóng Modal (dùng chung logic đóng modal)
    window.addEventListener('click', function(event) {
        if (event.target == champModal) {
            champModal.style.display = "none";
        }
    });
});