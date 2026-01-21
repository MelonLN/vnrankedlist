let playerData = []; 
let sortT = 1; 

let chunks = null;
let outerRing = null;
let innerRing = null;
let isDataLoaded = false; 

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

    init();
    requestAnimationFrame(animate);
});

let combinedUUIDs = new Set();

async function fetchUUIDs() {
    let uuidsFromGist = [];
    let uuidsRankedVN = [];

    // GIST
    try {
        const response = await fetch(
          'https://gist.githubusercontent.com/MelonLN/f5edd47f1f35d448c05066d8b95ce924/raw/uuids.json'
        );
        uuidsFromGist = await response.json();
    } catch (error) {
        console.error('Error fetching UUIDs from gist:', error);
    }

    // RANKED
    try {
        const rankedRes = await fetch("https://mcsrranked.com/api/leaderboard?country=vn");
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
    const playerData = [];
    const userinGameName = document.getElementById('InGameName').value.trim();
    
    if (!userinGameName) {
        document.getElementById('info').innerHTML = 'Please enter in game name.';
        subscribeButton.disabled = true;
        subscribeButton.classList.add('off');
        return;
    }
    
    try {
        const apiUrlS = `https://mcsrranked.com/api/users/${encodeURIComponent(userinGameName)}`;
        const userDataResponseS = await fetch(apiUrlS);
        if (!userDataResponseS.ok) {
            throw new Error('Network response was not ok');
        }
        const userDataS = await userDataResponseS.json();

        if (!userDataS || !userDataS.data) {
            throw new Error('No user data returned');
        }

        const { nickname, eloRate, eloRank, uuid, country } = userDataS.data;

        if (eloRate !== null && eloRank !== null) {
            playerData.push({ nickname, eloRate, eloRank, uuid, country });
        }

        displayPlayerDataS(playerData);

        window.currentUUID = uuid;
        window.currentCountry = country;
 
    } catch (error) {
        document.getElementById('info').innerHTML = `This name was not found, please try again!`;
        subscribeButton.disabled = true;
        subscribeButton.classList.add('off');
        console.error('Error fetching data:', error);
    }
}


function displayPlayerDataS(playerData) {
    const info = document.getElementById('info');
    info.innerHTML = '';
    subscribeButton.classList.remove('off');

    playerData.forEach((user) => {

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

async function fetchDataForUUIDs() {
    playerData = [];
    console.log('[fetchDataForUUIDs] start');

    try {
        const uuids = await fetchUUIDs();
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

        showLoading();

        let loadedCount = 0;
        const results = [];

        const BATCH_SIZE = 30;      
        const BATCH_DELAY_MS = 100; 

        for (let i = 0; i < totalUuids; i += BATCH_SIZE) {
            const batch = uuids.slice(i, i + BATCH_SIZE);

            const promises = batch.map(async (uuid) => {
                try {
                    const apiUrl = `https://mcsrranked.com/api/users/${uuid}`;
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
            let bestTimeRanked = data.statistics?.season?.bestTime?.ranked;
            const winsRanked = data.statistics?.season?.wins?.ranked || 0;
            const losesRanked = data.statistics?.season?.loses?.ranked || 0;
            const forfeitsRanked = data.statistics?.season?.forfeits?.ranked || 0;
            const playedMatchesRanked = data.statistics?.season?.playedMatches?.ranked || 0;
            const completionTimeRanked = data.statistics?.season?.completionTime?.ranked || 0;
            const completionsRanked = data.statistics?.season?.completions?.ranked || 0;
            const uuid = data.uuid;

            let includePlayer = (eloRate !== null && eloRate !== "null" && playedMatchesRanked !== 0);

            if (includePlayer) {
                let nickname = data.nickname;
                let ffRate = (playedMatchesRanked > 0) ? (forfeitsRanked / playedMatchesRanked) * 100 : 0;
                let avgTime = (completionsRanked > 0) ? (completionTimeRanked / completionsRanked) : null;

                playerData.push({ uuid, nickname, eloRate, bestTimeRanked, winsRanked, losesRanked, ffRate, avgTime });
            }
        });

        sortPlayerData();
        displayPlayerData();

    } catch (error) {
        console.error('[fetchDataForUUIDs] Error fetching UUID list:', error);
    } finally {
        console.log('[fetchDataForUUIDs] finished');
    }
}



function sortPlayerData() {
    if (sortT == 1) {
        // Elo
        playerData.sort((a, b) => b.eloRate - a.eloRate);
    } else if (sortT == 2) {
        // Best time
        playerData.sort((a, b) => {
            if (!a.bestTimeRanked && !b.bestTimeRanked) return 0;
            if (!a.bestTimeRanked) return 1;
            if (!b.bestTimeRanked) return -1;
            return a.bestTimeRanked - b.bestTimeRanked;
        });
    } else if (sortT == 3) {
        // Winrate
        playerData.sort((a, b) => {
            const winA = a.winsRanked + a.losesRanked > 0 ? (a.winsRanked / (a.winsRanked + a.losesRanked)) : 0;
            const winB = b.winsRanked + b.losesRanked > 0 ? (b.winsRanked / (b.winsRanked + b.losesRanked)) : 0;
            return winB - winA;
        });
    } else if (sortT == 4) {
        // Avg time
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

    fetchDataForUUIDs();
});

const profileModal = document.getElementById('profileModal');
const profileIframe = document.getElementById('profileIframe');
const profileCloseBtn = document.querySelector('.iframe-close');
const closemodal = document.getElementById('close-modal');


function openProfilePopup(nickname) {
    if (!nickname) return;

    profileIframe.src = `https://mcsrranked.com/stats/${nickname}`;

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
    rankedBody.innerHTML = '';

    playerData.forEach((userData, index) => {
        const row = rankedBody.insertRow();
        const rankCell = row.insertCell(0);
        rankCell.textContent = index + 1;
        rankCell.style.textAlign = 'center';

        const nameCell = row.insertCell(1);
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

        const eloCell = row.insertCell(2);
        eloCell.textContent = userData.eloRate;
        eloCell.style.textAlign = 'center';

        const bestTimeCell = row.insertCell(3);
        bestTimeCell.textContent = userData.bestTimeRanked ? formatTime(userData.bestTimeRanked) : '-';
        bestTimeCell.style.textAlign = 'center';

        const avgTimeCell = row.insertCell(4);
        avgTimeCell.textContent = userData.avgTime ? formatTime(userData.avgTime) : '-';
        avgTimeCell.style.textAlign = 'center';

        let winRate = (userData.winsRanked + userData.losesRanked > 0) 
            ? (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 
            : 0;
        let ffRate = userData.ffRate.toFixed(2);

        const winRateCell = row.insertCell(5);
        winRateCell.textContent = winRate.toFixed(2) + "%";
        winRateCell.style.textAlign = 'center';

        const ffRateCell = row.insertCell(6);
        ffRateCell.textContent = `${ffRate}%`;
        ffRateCell.style.textAlign = 'center';

        if (userData.eloRate >= 2000) {
            eloCell.style.color = 'purple';
        } else if (userData.eloRate >= 1500 && userData.eloRate <= 1999) {
            eloCell.style.color = 'cyan';
        } else if (userData.eloRate >= 1200 && userData.eloRate <= 1499) {
            eloCell.style.color = 'lime';
        } else if (userData.eloRate >= 900 && userData.eloRate <= 1199) {
            eloCell.style.color = 'gold';
        } else if (userData.eloRate >= 600 && userData.eloRate <= 899) {
            eloCell.style.color = 'silver';
        } else {
            eloCell.style.color = 'black';
        }

        row.addEventListener('click', function () {
            openProfilePopup(userData.nickname);
        });

        row.classList.add('player-row');
    });
}

function convertToCSV() {
    const clickTime = new Date();
    const moment = window.moment;
    const timestamp = moment(clickTime).format('YYYY-MM-DD~HH:mm:ss');

    let csv = '#,Nickname,Elo Rate,Best Time,Avg Time,Win Rate,FF Rate\n';

    playerData.forEach((userData, index) => {
        let winRate = (userData.winsRanked + userData.losesRanked > 0) 
            ? (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 
            : 0;

        csv += `${index + 1},${userData.nickname},${userData.eloRate},${userData.bestTimeRanked ? formatTime(userData.bestTimeRanked) : '-'},${userData.avgTime ? formatTime(userData.avgTime) : '-'},${winRate.toFixed(2)}%,${userData.ffRate.toFixed(2)}%\n`;
    });

    csv += 'Downloaded at ' + timestamp;
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
      const filename = `ranked_table_${timestamp}.csv`;
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
  .then(data => {
    if (data.status === "success") {
      const seasonNumber = data.data.season.number;
     
      document.getElementById("tt").textContent = `Season ${seasonNumber}`;
     
      countDownDate = new Date(data.data.season.endsAt * 1000);
    } else {
      console.error("Error fetching data from API:", data.message);
    }
    let x = setInterval(function() {
    }, 1000);
  })
.catch(error => console.error("Error fetching data:", error));

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
        document.getElementById("time").innerText = "Season 4 is over";
    }
}, 1000);

var modal = document.getElementById('myModal');
var modal2 = document.getElementById('myModal-content');
var btn = document.getElementById("Sub");
var span = document.getElementsByClassName("close")[0]; 

btn.onclick = function() {
  modal.style.display = "flex";
}

span.onclick = function() {
  modal.classList.add('modal-exit2');
  modal2.classList.add('modal-exit');
  setTimeout(function() {
    modal.style.display = 'none';
    modal.classList.remove('modal-exit2');
    modal2.classList.remove('modal-exit');
  }, 500); 
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

const modalSidebar = document.getElementById('profileModal');
const dragHandle = document.getElementById('resizer');

if (dragHandle && modalSidebar) {
    dragHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        
        modalSidebar.style.animation = 'none';
        modalSidebar.style.transition = 'none';
        
        const closemodal = document.getElementById('close-modal');
        if (closemodal) {
            closemodal.style.animation = 'none';
        }
        
        document.body.classList.add('resizing-active');
        window.addEventListener('mousemove', resizeSidebar);
        window.addEventListener('mouseup', stopResizingSidebar);
    });

    function resizeSidebar(e) {
        let newWidth = window.innerWidth - e.clientX;

        if (newWidth > 200 && newWidth < window.innerWidth * 0.8) {
            modalSidebar.style.width = newWidth + 'px';
            // Lưu lại chiều rộng hiện tại vào biến CSS để animation đóng (scaleOut) mượt hơn
            modalSidebar.style.setProperty('--sidebar-width', newWidth + 'px');
        }
    }

    function stopResizingSidebar() {
        document.body.classList.remove('resizing-active');
        window.removeEventListener('mousemove', resizeSidebar);
        window.removeEventListener('mouseup', stopResizingSidebar);
    }
}