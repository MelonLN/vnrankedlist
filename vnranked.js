
let playerData = []; // Array to store fetched player data
let sortT = 1; // Flag to track sorting type

async function fetchUUIDs() {
    try {
        const response = await fetch('https://gist.githubusercontent.com/babeoban/b7b4db7f956878666740924864fdbb02/raw/663c46d38519d3607e2a9a718de8cd49e1bafd44/uuids.json'); // Fetch the JSON file
        const uuids = await response.json(); // Parse JSON response
        return uuids;
    } catch (error) {
        console.error('Error fetching UUIDs:', error);
        return [];
    }
}

document.getElementById('search').addEventListener('click', fetchDataUser);

const subscribeButton = document.getElementById('btsm');
subscribeButton.disabled = true;
subscribeButton.classList.add('off');

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
        const apiUrlS = `https://mcsrranked.com/api/users/${userinGameName}`;
        const userDataResponseS = await fetch(apiUrlS);
        if (!userDataResponseS.ok) {
            throw new Error('Network response was not ok');
        }
        const userDataS = await userDataResponseS.json();
        const { nickname, eloRate, eloRank, uuid } = userDataS.data;

        if (eloRate !== null && eloRank !== null) {
            playerData.push({ nickname, eloRate, eloRank, uuid });
            subscribeButton.disabled = false;
            subscribeButton.classList.remove('off');
        } else {
            subscribeButton.disabled = true;
            subscribeButton.classList.add('off');
        }

        displayPlayerDataS(playerData);
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
    try {
        const uuids = await fetchUUIDs();
        for (const uuid of uuids) {
            const apiUrl = `https://mcsrranked.com/api/users/${uuid}`;
            const userDataResponse = await fetch(apiUrl);
            const userData = await userDataResponse.json();
            const eloRate = userData.data.eloRate;
            const bestTimeRanked = userData.data.statistics.season.bestTime.ranked;
            const winsRanked = userData.data.statistics.season.wins.ranked;
            const losesRanked = userData.data.statistics.season.loses.ranked;
            const forfeitsRanked = userData.data.statistics.season.forfeits.ranked;
            const playedMatchesRanked = userData.data.statistics.season.playedMatches.ranked;

            if (eloRate !== null && eloRate !== "null" && playedMatchesRanked !== 0) {
                const ffRate = (forfeitsRanked / playedMatchesRanked) * 100; // Calculate FF rate
                let nickname = userData.data.nickname;
                if (uuid === 'dbaeeaf62a9348698a3604cded144298') {
                    nickname = "Ét Ka Dái"; // Easter egg
                } else if (uuid === 'd602ce8abdd04560a6e48fa4afee8a17') {
                    nickname = "Anh Kiên 1M sup";
                } else if (uuid === '5c616ce347da454292bf6015a6c3c9d9') {
                    nickname = "PHMC bi be de";
                }
                playerData.push({ uuid, nickname, eloRate, bestTimeRanked, winsRanked, losesRanked, ffRate });
            }
        }

        sortPlayerData();
        displayPlayerData();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function sortPlayerData() {
    if (sortT == 1) {
        playerData.sort((a, b) => b.eloRate - a.eloRate);
    } else {
        playerData.sort((a, b) => {
            // Handle cases where best time is null
            if (!a.bestTimeRanked && !b.bestTimeRanked) return 0;
            if (!a.bestTimeRanked) return 1;
            if (!b.bestTimeRanked) return -1;
            return a.bestTimeRanked - b.bestTimeRanked;
        });
    }
}

// Function to format time in mm:ss.xxx format
function formatTime(timeInMs) {
    const minutes = Math.floor(timeInMs / (60 * 1000));
    const seconds = Math.floor((timeInMs % (60 * 1000)) / 1000);
    const milliseconds = Math.floor((timeInMs % 1000));
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

document.addEventListener('DOMContentLoaded', function() {
    const eloHeader = document.querySelector('th:nth-child(3)');
    const bestTimeHeader = document.querySelector('th:nth-child(4)');
    const ffRateHeader = document.querySelector('th:nth-child(5)');
    const winRateHeader = document.querySelector('th:nth-child(6)');

    eloHeader.addEventListener('click', function() {
        sortT = 1;
        sortPlayerData(); // Sort player data based on Elo Rate
        displayPlayerData(); // Display sorted player data
    });

    bestTimeHeader.addEventListener('click', function() {
        sortT = 2;
        sortPlayerData(); // Sort player data based on Best Time
        displayPlayerData(); // Display sorted player data
    });
});

fetchDataForUUIDs();

setInterval(function() {
    fetchDataForUUIDs(); // Fetch new data
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

        const winRate = (userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 || 0;
        const winRateCell = row.insertCell(4);
        winRateCell.textContent = winRate.toFixed(2) + "%";
        winRateCell.style.textAlign = 'center';

        const ffRate = userData.ffRate.toFixed(2);
        const ffRateCell = row.insertCell(5); // New column for FF rate
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

        row.addEventListener('click', function (event) {
            const profileUrl = `https://mcsrrankedtracker.vercel.app/users/${userData.uuid}`;
            window.open(profileUrl, '_blank');
        });

        row.classList.add('player-row');
    });
}

// Function to convert player data to CSV format
function convertToCSV() {
    const clickTime = new Date();
    const moment = window.moment;
    const timestamp = moment(clickTime).format('YYYY-MM-DD~HH:mm:ss');
    let csv = '#,Nickname,Elo Rate,Best Time,Win Rate,FF Rate\n';
    playerData.forEach((userData, index) => {
        csv += `${index + 1},${userData.nickname},${userData.eloRate},${userData.bestTimeRanked ? formatTime(userData.bestTimeRanked) : '-'},${(userData.winsRanked / (userData.winsRanked + userData.losesRanked)) * 100 || 0}%,${userData.ffRate.toFixed(2)}%\n`;
    });
    csv += 'Downloaded at ' + timestamp;
    return csv;
}

// Function to initiate download of CSV file
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

// Fetch data from the API
fetch('https://mcsrranked.com/api/leaderboard?season=current')
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      countDownDate = new Date(data.data.season.endsAt * 1000);
    } else {
      console.error("Error fetching data from API:", data.message);
    }
    // Rest of your code remains the same
    let x = setInterval(function() {
      // ... (rest of your countdown logic)
    }, 1000);
  })
  .catch(error => console.error("Error fetching data:", error));

let x = setInterval(function() {
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
