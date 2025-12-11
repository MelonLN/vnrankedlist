let playerData = []; 
let sortT = 1; 

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

            outerRing.radius = Math.min(Math.floor(progress * outerRing.maxRadius), outerRing.maxRadius);
            innerRing.radius = Math.min(Math.floor(progress * innerRing.maxRadius), innerRing.maxRadius);
            if (typeof render === 'function') render();
        } else {
            const txt = document.getElementById('loading-progress-text');
            if (txt) txt.textContent = `Loading ${loaded}/${total} (${Math.round(progress*100)}%)`;
        }
    } catch (e) {
        console.warn('Error updating rings:', e);
    }

    if (loaded >= total) {
        console.log('[LoadingProgress] All UUIDs processed - hiding loading UI (with small delay for UX).');
        setTimeout(() => {
            hideLoading();
        }, 300);
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('loadingCanvas');
    const ctx = canvas.getContext('2d');
    const radius = 10;
    const size = radius * 2 + 1;
    const speedMultiplier = size * size / 1000;
    let chunks = null;
    let outerRing = null;
    let innerRing = null;
    let prevTime = null;

    function generateRing(randomProbability, maxRadius, speed, loader) {
        return expandRing({
            radius: -1,
            maxRadius,
            neighbourUnloaded: [],
            allUnloaded: [],
            randomProbability: 0.08,
            speed: 200,
            needsLoading: 0,
            loader
        });
    }

    function expandRing(ring) {
        const center = Math.floor(size / 2);
        if (ring.radius >= ring.maxRadius) return ring;

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

    function update(delta) {
        if (!outerRing || !innerRing) return;

        outerRing.needsLoading += outerRing.speed * delta * speedMultiplier;
        innerRing.needsLoading += innerRing.speed * delta * speedMultiplier;

        loadMultipleFromRing(outerRing);
        loadMultipleFromRing(innerRing);
    }

    function render() {
        if (!canvas || !chunks) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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

                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    function outerLoader(pos) {
        if (!chunks) return false;

        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const level = 3 - Math.max(Math.abs(dx), Math.abs(dy));
                const newPos = { x: pos.x + dx, y: pos.y + dy };

                chunks[newPos.x][newPos.y] = Math.max(chunks[newPos.x][newPos.y], level);
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

        outerRing = generateRing(0.1, radius - 2, 1000, outerLoader);
        innerRing = generateRing(0.5, radius - 1, 500, innerLoader);
    }

    init();
    requestAnimationFrame(animate);
});

async function fetchUUIDs() {
    let uuidsFromGist = [];
    let uuidsFromFirestore = [];
    let uuidsRankedVN = [];

    // GIST
    try {
        const response = await fetch(
          'https://gist.githubusercontent.com/babeoban/b7b4db7f956878666740924864fdbb02/raw/663c46d38519d3607e2a9a718de8cd49e1bafd44/uuids.json'
        );
        uuidsFromGist = await response.json();
    } catch (error) {
        console.error('Error fetching UUIDs from gist:', error);
    }

    // FIRESTORE
    try {
        const snapshot = await window.getDocs(window.collection(window.db, "uuids"));
        uuidsFromFirestore = snapshot.docs.map(doc => doc.data().uuid);
    } catch (error) {
        console.error('Error fetching UUIDs from Firestore:', error);
    }

    // RANKED VN
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
            ...uuidsFromFirestore,
            ...uuidsRankedVN
        ])
    ];

    return combined;
}

document.getElementById('search').addEventListener('click', fetchDataUser);

const subscribeButton = document.getElementById('btsm');
subscribeButton.disabled = true;
subscribeButton.classList.add('off');

subscribeButton.addEventListener('click', async function () {
    if (!window.currentUUID) {
        document.getElementById('message').innerText = "No UUID to subscribe.";
        document.getElementById('message').style.display = 'block';
        return;
    }

    try {
        const response = await fetch('https://gist.githubusercontent.com/babeoban/b7b4db7f956878666740924864fdbb02/raw/663c46d38519d3607e2a9a718de8cd49e1bafd44/uuids.json');
        const gistUUIDs = await response.json();

        if (gistUUIDs.includes(window.currentUUID)) {
            document.getElementById('message').innerText = "This UUID already exists.";
            document.getElementById('message').style.display = 'block';
            return;
        }

        const docRef = await window.addDoc(
            window.collection(window.db, "uuids"),
            {
                uuid: window.currentUUID,
                createdAt: window.serverTimestamp()
            }
        );

        console.log("UUID saved with ID:", docRef.id);
        document.getElementById('message').innerText = "Subscribed!";
        document.getElementById('message').style.display = 'block';

    } catch (error) {
        console.error("Error subscribing:", error);
        document.getElementById('message').innerText = "Failed to subscribe.";
        document.getElementById('message').style.display = 'block';
    }
});


async function saveUUIDToFirestore(uuid) {
  try {
    const docRef = await window.addDoc(
      window.collection(window.db, "uuids"),
      {
        uuid: uuid,
        createdAt: window.serverTimestamp()
      }
    );
    console.log("UUID written with ID:", docRef.id);
    return true;
  } catch (err) {
    console.error("Error adding UUID to Firestore:", err);
    return false;
  }
}


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

        if (!country || String(country).toLowerCase() !== "vn") {
            document.getElementById('message').innerHTML =
              `Sorry, your account does not meet the requirements to subscribe to this leaderboard. Please try again or contact a moderator for assistance. (Detected country: ${country || 'unknown'})`;
            subscribeButton.disabled = true;
            subscribeButton.classList.add('off');
            console.log('Subscription blocked — country:', country);
            document.getElementById('message').style.display = 'block'
            return;
        }  else {
            subscribeButton.disabled = false;
            subscribeButton.classList.remove('off');
            document.getElementById('message').style.display = 'none'
        }
        window.currentUUID = uuid;
 
    } catch (error) {
        document.getElementById('info').innerHTML = `This name was not found, please try again!`;
        subscribeButton.disabled = true;
        subscribeButton.classList.add('off');
        console.error('Error fetching data:', error);
    }
}


function displayPlayerDataS(playerData) {
    const info = document.getElementById('info');
    subscribeButton.classList.remove('off');
    info.innerHTML = '';

    playerData.forEach((userDataS) => {
        const profilePic = document.createElement('img');
        profilePic.src = `https://mc-heads.net/avatar/${userDataS.uuid}`;
        profilePic.width = 32;
        profilePic.height = 32;
        profilePic.alt = 'Profile Picture';
        profilePic.style.marginRight = '4px';

        const playerName = document.createElement('span');
        playerName.textContent = userDataS.nickname;

        const rank = document.createElement('div');
        if (userDataS.eloRate >= 2000) {
            rank.style.color = 'purple';
            rank.textContent = "NETHERITE";
        } else if (userDataS.eloRate >= 1500 && userDataS.eloRate <= 1999) {
            rank.style.color = 'cyan';
            rank.textContent = "DIAMOND";
        } else if (userDataS.eloRate >= 1200 && userDataS.eloRate <= 1499) {
            rank.style.color = 'lime';
            rank.textContent = "EMERALD";
        } else if (userDataS.eloRate >= 900 && userDataS.eloRate <= 1199) {
            rank.style.color = 'gold';
            rank.textContent = "GOLD";
        } else if (userDataS.eloRate >= 600 && userDataS.eloRate <= 899) {
            rank.style.color = 'silver';
            rank.textContent = "IRON";
        } else {
            rank.style.color = 'black';
            rank.textContent = "COAL";
        }

        const ladder = document.createElement('div');
        ladder.textContent = "Ladder Rank " + userDataS.eloRank;

        const elo = document.createElement('div');
        elo.textContent = "Elo " + userDataS.eloRate;

        info.appendChild(profilePic);
        info.appendChild(playerName);
        info.appendChild(rank);
        info.appendChild(ladder);
        info.appendChild(elo);

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

        const BATCH_SIZE = 6;      
        const BATCH_DELAY_MS = 250; 

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
            const uuid = data.uuid;

            let includePlayer = (eloRate !== null && eloRate !== "null" && playedMatchesRanked !== 0);

            if (includePlayer) {
                let nickname = data.nickname;
                let ffRate = (playedMatchesRanked > 0) ? (forfeitsRanked / playedMatchesRanked) * 100 : 0;

                playerData.push({ uuid, nickname, eloRate, bestTimeRanked, winsRanked, losesRanked, ffRate });
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
        playerData.sort((a, b) => b.eloRate - a.eloRate);
    } else {
        playerData.sort((a, b) => {
            if (!a.bestTimeRanked && !b.bestTimeRanked) return 0;
            if (!a.bestTimeRanked) return 1;
            if (!b.bestTimeRanked) return -1;
            return a.bestTimeRanked - b.bestTimeRanked;
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

    eloHeader.addEventListener('click', function() {
        sortT = 1;
        sortPlayerData();
        displayPlayerData();
    });

    bestTimeHeader.addEventListener('click', function() {
        sortT = 2;
        sortPlayerData();
        displayPlayerData();
    });

    fetchDataForUUIDs(); 
});

setInterval(function() {
    fetchDataForUUIDs();
}, 180000);

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

        let winRate = (userData.winsRanked + userData.losesRanked > 0) 
            ? (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 
            : 0;
        let ffRate = userData.ffRate.toFixed(2);

        const winRateCell = row.insertCell(4);
        winRateCell.textContent = winRate.toFixed(2) + "%";
        winRateCell.style.textAlign = 'center';

        const ffRateCell = row.insertCell(5);
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
            const profileUrl = `https://mcsrranked.com/stats/${userData.uuid}`;
            window.open(profileUrl, '_blank');
        });

        row.classList.add('player-row');
    });
}

function convertToCSV() {
    const clickTime = new Date();
    const moment = window.moment;
    const timestamp = moment(clickTime).format('YYYY-MM-DD~HH:mm:ss');

    let csv = '#,Nickname,Elo Rate,Best Time,Win Rate,FF Rate\n';

    playerData.forEach((userData, index) => {
        let winRate = (userData.winsRanked + userData.losesRanked > 0) 
            ? (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 
            : 0;

        csv += `${index + 1},${userData.nickname},${userData.eloRate},${userData.bestTimeRanked ? formatTime(userData.bestTimeRanked) : '-'},${winRate.toFixed(2)}%,${userData.ffRate.toFixed(2)}%\n`;
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
    
    document.getElementById("time").innerText = "The season will end in " + days + " days " + formattedHours + ":"
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

document.getElementById('userForm').addEventListener('submit', function(event) {
  event.preventDefault();
});
