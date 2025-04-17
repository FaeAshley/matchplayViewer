const tournamentHeader = document.getElementById('tournament-name');
const currentRoundText = document.querySelectorAll('.current-round');
const matchListContainer = document.getElementById('match-list');
const standingsTable = document.getElementById('standings-body');
const header = document.querySelector('.collapsible-header');
const openCaretHeader = document.getElementById('open-caret');
const openBtn = document.getElementById('open-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const bodyElement = document.body;
const refreshBtn = document.getElementById('refresh-btn');
const switchBtns = document.querySelectorAll('.switch-view-btn');
const roundContainer = document.getElementById('matches-and-standings-container');
const playersContainer = document.getElementById('players-container');
const playersList = document.getElementById('players-list');
const loadTournamentBtn = document.getElementById('load-tournament')

const API_TOKEN = "400|uRGl8JjoGNNS0hflfBck8RSFHLxZndn8d3bTPbBzccdc6720"; // Replace with your real token
const API_BASE_URL = "https://app.matchplay.events/api/tournaments";

async function fetchTournamentData(tournamentId) {
    const headers = {
            "Authorization": `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
    };

    const tournamentUrl = `${API_BASE_URL}/${tournamentId}?includePlayers=1&includeArenas=true`;
    const matchesUrl = `${API_BASE_URL}/${tournamentId}/games?round=activeOrLatest`;
    const standingsUrl = `${API_BASE_URL}/${tournamentId}/standings`;
    const roundUrl = `${API_BASE_URL}/${tournamentId}/rounds?cacheEligible=true`;

    try {
        // Fetch Tournament Info
        const tournamentRes = await fetch(tournamentUrl, { headers });
        const tInfo = (await tournamentRes.json()).data;

        const tournament = {
            id: tournamentId,
            name: tInfo.name || "Unknown Name",
            status: tInfo.status || "Unknown Status"
        };

        const players = (tInfo.players || []).map(p => ({
            id: p.playerId,
            name: p.name,
            standing: null,
            points: null
    }));

    const arenas = (tInfo.arenas || []).map(a => ({
        id: a.arenaId,
        name: a.name,
        label: a.tournamentArena?.labels || []
    }));

    // Fetch Matches
    const matchesRes = await fetch(matchesUrl, { headers });
    const matchData = (await matchesRes.json()).data || [];

    const matches = matchData.map(match => {
        const arena = arenas.find(a => a.id === match.arenaId);
        const placementMap = {};
        (match.resultPositions || []).forEach((pid, idx) => placementMap[pid] = idx + 1);

        const matchPlayers = (match.playerIds || []).map((pid, idx) => ({
                id: pid,
                name: players.find(p => p.id === pid)?.name || "Unknown Player",
                player: idx + 1,
                placement: placementMap[pid]
        }));

        return {
                id: arena?.id,
                gameName: arena?.name || "Unknown Game",
                label: arena?.label || [],
                duration: match.duration || 0,
                matchPlayers,
                status: match.status || "unknown"
        };
    });

    // Fetch Standings
    const standingsRes = await fetch(standingsUrl, { headers });
    const standings = await standingsRes.json();
    standings.forEach(s => {
        const player = players.find(p => p.id === s.playerId);
        if (player) {
            player.standing = s.position;
            player.points = s.points;
        }
    });
    players.sort((a, b) => a.name.localeCompare(b.name));

    // Fetch Current Round
    const roundRes = await fetch(roundUrl, { headers });
    const rData = (await roundRes.json()).data || [];
    const currentRound = rData[0]
        ? { index: rData[0].index + 1, status: rData[0].status }
        : { index: null, status: "Unknown" };

    return {
        tournament,
        players,
        matches,
        currentRound
    };

    } catch (error) {
        console.error("Error fetching tournament data:", error);
        return { error: error.message };
    }
}

loadTournamentBtn.addEventListener('click', function() {
    const tournamentId = document.getElementById('tournament-id').value;
    if (tournamentId) {
        fetchTournament(tournamentId);
    } else {
        alert('Please enter a tournament ID.');
    }
});

switchBtns.forEach( btn => {
    btn.addEventListener('click', () => {
        roundContainer.classList.toggle('hidden');
        playersContainer.classList.toggle('hidden');

        if (roundContainer.classList.contains('hidden')){
            switchBtns.forEach(btn => {
                btn.innerHTML = 'View Active Round';
            })
        } else {
            switchBtns.forEach(btn => {
                btn.innerHTML = 'View All Players';
            })
        }
    })
})

refreshBtn.addEventListener('click', function() {
    const storedTournamentId = bodyElement.getAttribute('data-tournament-id');
    if (storedTournamentId) {
        fetchTournamentApi(storedTournamentId);
    } else {
        alert('Please enter a tournament ID.');
    }
});

document.getElementById('collapse-btn').addEventListener('click', function () {
    header.classList.toggle('hidden'); // Toggle the collapsed class
    openCaretHeader.classList.toggle('hidden');
});

openBtn.addEventListener('click', function () {
    header.classList.toggle('hidden'); // Toggle the collapsed class
    openCaretHeader.classList.toggle('hidden');
});

function fetchTournament(tournamentId) {
    header.classList.add('hidden');
    openCaretHeader.classList.remove('hidden');
    loadingOverlay.classList.add('active');
    bodyElement.setAttribute('data-tournament-id', tournamentId);

    fetchTournamentData(tournamentId)
        .then(data => {
        if (!data.tournament?.name) {
            throw new Error('Invalid response structure');
        }

        console.log("Tournament Loaded:", data);
        tournamentHeader.innerText = `${data.tournament.name}`;

        playersList.innerHTML = '';
        data.players.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="player-name">${player.name}</span>`;
            li.classList.add('player-li');
            playersList.appendChild(li);
        });

        if (['in progress', 'completed'].includes(data.tournament.status)) {
            currentRoundText.forEach(roundText => {
            roundText.innerText = `Round ${data.currentRound.index} - ${data.currentRound.status}`;
            });

            matchListContainer.innerHTML = '';
            data.matches.forEach(game => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="game-header">
                <h3 class="game-name"><strong>${game.gameName}</strong></h3>
                <em>${game.duration} sec</em>
                </span>
                <ul>
                ${game.matchPlayers.map(player => `
                    <li class="player">
                    ${player.placement ? `<span class="player-placement"><strong>${player.placement}</strong></span> - ` : `<span class="player-placement"></span>`}
                    ${player.name}
                    </li>
                `).join('')}
                </ul>
                ${game.status === 'completed' ? '<span class="completed-game">✔ Completed</span>' : ''}
            `;
            li.classList.add('match-container');
            matchListContainer.appendChild(li);
            });

            standingsTable.innerHTML = '';
            data.players.forEach(player => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="rank">${player.standing || '-'}</span></td>
                <td><span class="player">${player.name}</span></td>
                <td><span class="points">${player.points ?? '-'}</span></td>
            `;
            tr.classList.add('standing-row');
            standingsTable.appendChild(tr);
            });
        }

        loadingOverlay.classList.remove('active');
    })
    .catch(error => {
    console.error("Failed to load tournament data:", error);
    loadingOverlay.classList.remove('active');
    });
}

function fetchTournamentApi(tournamentId) {
    header.classList.add('hidden');
    openCaretHeader.classList.remove('hidden');
    loadingOverlay.classList.add('active');
    bodyElement.setAttribute('data-tournament-id', tournamentId);

    fetch('/get_tournament_api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        try {
            if (!data.tournament?.name) {
                throw new Error('Invalid response structure');
            }

            tournamentHeader.innerText = `${data.tournament.name}`;

            playersList.innerHTML = '';
            data.players.forEach(player => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="player-name">${player.name}</span>`;
                li.classList.add('player-li');
                playersList.appendChild(li);
            });

            if (['in progress', 'completed'].includes(data.tournament.status)) {
                currentRoundText.forEach(roundText => {
                    roundText.innerText = `Round ${data.currentRound.index} - ${data.currentRound.status}`;
                });
                matchListContainer.innerHTML = '';
                data.matches.sort((a, b) => {
                    if (a.status === "completed" && b.status !== "completed") return 1;   // Move 'a' after 'b'
                    if (a.status !== "completed" && b.status === "completed") return -1;  // Move 'a' before 'b'
                    return 0;  // Keep original order if both are 'completed' or both are not
                });


                data.matches.forEach(match => {
                    const li = document.createElement('li');
                    const ul = document.createElement('ul');
                    const timerElement = document.createElement('em');
                    timerElement.textContent = formatDuration(match.duration);

                    li.innerHTML = `
                        <span class="game-header">
                            <h3 class="game-name"><strong>${match.gameName}</strong></h3>
                        </span>
                        <ul class="player-list">
                            ${match.matchPlayers.map(player => `
                                <li class="player">
                                    ${player.placement ? `<span class="player-placement"><strong>${player.placement}</strong></span> ` : `<span class="player-placement"></span>`}
                                    ${player.name}
                                </li>
                            `).join('')}
                        </ul>
                        ${match.status === 'completed' ? '<span class="completed-game">✔ Completed</span>' : ''}
                    `;

                    li.querySelector('.game-header').appendChild(timerElement);
                    li.classList.add('match-container');
                    matchListContainer.appendChild(li);

                    if (match.status !== 'completed') {
                        let currentDuration = match.duration;

                        const timer = setInterval(() => {
                            currentDuration++; // Increase duration every second
                            timerElement.textContent = formatDuration(currentDuration);
                        }, 1000);
                    }
                });

                data.players.sort((a, b) => {
                    if (a.standing === null && b.standing === null) return 0;
                    if (a.standing === null) return 1;
                    if (b.standing === null) return -1;
                    return a.standing - b.standing;
                });

                standingsTable.innerHTML = '';
                data.players.forEach(player => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="rank">${player.standing !== null ? player.standing : '-'}</span></td>
                        <td><span class="player">${player.name}</span></td>
                        <td><span class="points">${player.points}</span></td>
                    `;
                    tr.classList.add('standing-row');
                    standingsTable.appendChild(tr);
                });
            }
        } catch (error) {
            console.error('Processing error:', error);
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
    })
    .finally(() => {
        loadingOverlay.classList.remove('active');
    });
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

let scrollDirection = 'down';
function autoScroll() {
    if (scrollDirection === 'down') {
        matchListContainer.scrollTo({
            top: matchListContainer.scrollHeight,
            behavior: 'smooth' // Enables smooth scrolling
        });
        scrollDirection = 'up'; // Next time, scroll up
    } else {
        matchListContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        scrollDirection = 'down'; // Next time, scroll down
    }
}

let isFetching = false;  // Lock variable

setInterval(() => {
    const storedTournamentId = bodyElement.getAttribute('data-tournament-id');
    if (storedTournamentId && !isFetching) {  // Only fetch if not already fetching
        isFetching = true;  // Lock

        fetchTournament(storedTournamentId).finally(() => {
            isFetching = false;  // Unlock after fetch is done
        });
    }
    autoScroll();
}, 15000);

