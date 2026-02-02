let allVnRuns = [];
let filteredRuns = [];
let currentIndex = 0;
const CHUNK_SIZE = 100;
let currentStatusFilter = 'verified';

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    fetchSpeedrunData();
});

function initUI() {
    const filterBtn = document.getElementById('filterBtnSr');
    const filterSidebar = document.getElementById('filterSidebar');
    const closeFilter = document.getElementById('closeFilter');
    const resetBtn = document.getElementById('resetFiltersSr');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const moreBtn = document.getElementById('moreBtn');
    const moreMenu = document.getElementById('moreMenu');
    const statusSelect = document.getElementById('statusFilterSr');

    if (moreBtn) {
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            moreMenu.style.display =
                moreMenu.style.display === 'block' ? 'none' : 'block';
        };
    }

    document.addEventListener('click', (e) => {
        if (moreMenu && !e.target.closest('.more-container')) {
            moreMenu.style.display = 'none';
        }
    });

    if (filterBtn && filterSidebar) {
        filterBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            filterSidebar.classList.add('active');
            filterSidebar.classList.remove('filter-close');
        };
    }

    if (closeFilter && filterSidebar) {
        closeFilter.onclick = () => {
            filterSidebar.classList.add('filter-close');
            setTimeout(() => filterSidebar.classList.remove('active'), 500);
        };
    }

    if (statusSelect) {
        statusSelect.value = currentStatusFilter;
        statusSelect.onchange = (e) => {
            currentStatusFilter = e.target.value;
            applyFilters();
        };
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            if (statusSelect) {
                statusSelect.value = 'verified';
                currentStatusFilter = 'verified';
                applyFilters();
            }
        };
    }

    if (loadMoreBtn) {
        loadMoreBtn.onclick = renderNextBatch;
    }

    const filterDragHandle = document.getElementById('filterDragHandle');
    if (filterDragHandle && filterSidebar) {
        filterDragHandle.onmousedown = (e) => {
            if (e.target.id === 'closeFilter') return;
            e.preventDefault();
            const rect = filterSidebar.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const onMove = (ev) => {
                const newLeft = ev.clientX - offsetX;
                const newTop = ev.clientY - offsetY;
                filterSidebar.style.left = newLeft + 'px';
                filterSidebar.style.top = newTop + 'px';
                filterSidebar.style.right = 'auto';
            };
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };
    }
}

async function fetchSpeedrunData() {
    const loading = document.getElementById('loading-contai');
    const table = document.getElementById('rankedTable');

    if (loading) loading.style.display = 'block';
    if (table) table.style.display = 'none';

    const LB_URL = "https://www.speedrun.com/api/v1/leaderboards/j1npme6p/category/mkeyl926?var-r8rg67rn=21d4zvp1&var-wl33kewl=4qye4731&embed=players";
    
    const PENDING_URL = "https://www.speedrun.com/api/v1/runs?category=mkeyl926&status=new&max=200&embed=players";

    try {
        const [lbRes, pendingRes] = await Promise.all([
            fetch(LB_URL).then(r => r.json()),
            fetch(PENDING_URL).then(r => r.json())
        ]);

        const playerMap = {};
        
        if (lbRes.data.players && lbRes.data.players.data) {
            lbRes.data.players.data.forEach(p => {
                if (p.id) {
                    playerMap[p.id] = {
                        name: p.names ? p.names.international : (p.name || "Guest"),
                        countryCode: (p.location && p.location.country) ? p.location.country.code : null,
                    };
                }
            });
        }

        if (pendingRes.data) {
            pendingRes.data.forEach(run => {
                if (run.players && run.players.data) {
                    run.players.data.forEach(p => {
                        if (p.id && !playerMap[p.id]) {
                            playerMap[p.id] = {
                                name: p.names ? p.names.international : (p.name || "Guest"),
                                countryCode: (p.location && p.location.country) ? p.location.country.code : null,
                            };
                        }
                    });
                }
            });
        }

        const verifiedRuns = lbRes.data.runs.filter(run => {
            const firstPlayer = run.run.players[0];
            if (!firstPlayer || firstPlayer.rel === 'guest') return false;
            const info = playerMap[firstPlayer.id];
            return info && info.countryCode === 'vn';
        }).map(run => {
            const pInfo = playerMap[run.run.players[0].id];
            return {
                name: pInfo.name,
                igt: run.run.times.ingame_t,
                rta: run.run.times.realtime_t,
                status: run.run.status.status,
                date: run.run.date,
                weblink: run.run.weblink,
                sortTime: run.run.times.ingame_t || run.run.times.realtime_t
            };
        });

        const pendingRuns = pendingRes.data.filter(run => {

            const vars = run.values || {};
            const is116 = vars['wl33kewl'] === '4qye4731';
            const isWR = vars['r8rg67rn'] === '21d4zvp1';
            
            if (Object.keys(vars).length > 0 && !is116) return false;

            const players = run.players.data || [];
            const firstPlayer = players[0];
            if (!firstPlayer || firstPlayer.rel === 'guest') return false;
            
            const info = playerMap[firstPlayer.id];
            return info && info.countryCode === 'vn';
        }).map(run => {
            const pId = run.players.data[0].id;
            const pInfo = playerMap[pId];
            return {
                name: pInfo.name,
                igt: run.times.ingame_t,
                rta: run.times.realtime_t,
                status: run.status.status,
                date: run.date,
                weblink: run.weblink,
                sortTime: run.times.ingame_t || run.times.realtime_t
            };
        });

        allVnRuns = [...verifiedRuns, ...pendingRuns];

        allVnRuns.sort((a, b) => {
            const timeA = a.sortTime || 999999;
            const timeB = b.sortTime || 999999;
            return timeA - timeB;
        });

        applyFilters();
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'table';

    } catch (error) {
        console.error("SR.C Fetch Error:", error);
        const progressText = document.getElementById('loading-progress-text');
        if (progressText) progressText.innerHTML = '<span style="color:red">Lỗi tải dữ liệu từ Speedrun.com.</span>';
    }
}

function applyFilters() {
    if (currentStatusFilter === 'verified') {
        filteredRuns = allVnRuns.filter(r => r.status === 'verified');
    } else {
        filteredRuns = [...allVnRuns];
    }

    currentIndex = 0;
    const tableBody = document.getElementById('srccomBody');
    if (tableBody) tableBody.innerHTML = '';
    renderNextBatch();
}

function renderNextBatch() {
    const tableBody = document.getElementById('srccomBody');
    if (!tableBody) return;

    const nextBatch = filteredRuns.slice(currentIndex, currentIndex + CHUNK_SIZE);

    nextBatch.forEach((data, index) => {
        const row = tableBody.insertRow();
        row.style.cursor = 'pointer';
        row.onclick = () => window.open(data.weblink, '_blank');

        row.insertCell(0).textContent = currentIndex + index + 1;

        const nameCell = row.insertCell(1);
        nameCell.style.textAlign = 'left';
        nameCell.textContent = data.name;

        const igtCell = row.insertCell(2);
        igtCell.textContent = data.igt ? formatSeconds(data.igt) : '-';
        igtCell.style.color = 'lime';

        row.insertCell(3).textContent = data.rta ? formatSeconds(data.rta) : '-';

        const statusCell = row.insertCell(4);
        const isVerified = data.status === 'verified';
        statusCell.textContent = isVerified ? 'VERIFIED' : 'PENDING';
        statusCell.style.color = isVerified ? 'lime' : 'gold';

        row.insertCell(5).textContent = formatDate(data.date);
    });

    currentIndex += CHUNK_SIZE;
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) {
        loadMoreContainer.style.display = currentIndex < filteredRuns.length ? 'block' : 'none';
    }
}

function formatSeconds(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return '-';
    
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    
    const timeParts = [];
    
    if (hrs > 0) {
        timeParts.push(hrs.toString().padStart(2, '0'));
    }
    
    timeParts.push(mins.toString().padStart(2, '0'));
    timeParts.push(secs.toString().padStart(2, '0'));

    const timeStr = timeParts.join(':');
    return `${timeStr}.${ms.toString().padStart(3, '0')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}