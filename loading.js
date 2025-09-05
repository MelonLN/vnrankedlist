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
            speed: 80,
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
    setTimeout(function() {
        var loadingScreen = document.getElementById('loading-contai');
        var table = document.getElementById('rankedTable');
        table.style.display = 'table';
        loadingScreen.style.display = 'none';
    }, 9500);

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