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


loadTournamentBtn.addEventListener('click', function() {
    const tournamentId = document.getElementById('tournament-id').value;
    if (tournamentId) {
        fetchTournamentApi(tournamentId);
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

    fetch('/get_tournament', {
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
        if (!data.tournament?.name) {  // Optional chaining for safety
            throw new Error('Invalid response structure');
        }

        tournamentHeader.innerText = `${data.tournament.name}`;

        playersList.innerHTML = '';  // Clear previous content
        data.players.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="player-name">${player}</span>`;
            li.classList.add('player-li');
            playersList.appendChild(li);
        });

        if (['In progress', 'Completed'].includes(data.tournament.status)) {
            currentRoundText.forEach(roundText => {
                roundText.innerText = `${data.round_name} - ${data.round_status}`;
            });

            matchListContainer.innerHTML = ''; // Clear previous results
            data.games.forEach(game => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="game-header"><h3 class="game-name"><strong>${game.game_name}</strong></h3>
                    <em>${game.elapsed_time}</em></span>
                    <ul>
                        ${game.players.map(player => `
                            <li class="player">
                                ${player.placement ? `<span class="player-placement"><strong>${player.placement}</strong></span> - ` : `<span class="player-placement"></span>`}
                                ${player.name}
                            </li>
                        `).join('')}
                    </ul>
                    ${game.is_completed ? '<span class="completed-game">✔ Completed</span>' : ''}
                `;
                li.classList.add('match-container');
                matchListContainer.appendChild(li);
            });

            standingsTable.innerHTML = '';
            data.standings.forEach(standing => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="rank">${standing.rank}</span></td>
                    <td><span class="player">${standing.player}</span></td>
                    <td><span class="points">${standing.points}</span></td>
                `;
                tr.classList.add('standing-row');
                standingsTable.appendChild(tr);
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        return Promise.resolve(); // Add this to ensure .finally() still runs
    })
    .finally(() => {
        loadingOverlay.classList.remove('active'); // This will always run now
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

let isFetching = false;  // Lock variable

setInterval(() => {
    const storedTournamentId = bodyElement.getAttribute('data-tournament-id');
    if (storedTournamentId && !isFetching) {  // Only fetch if not already fetching
        isFetching = true;  // Lock

        fetchTournamentApi(storedTournamentId).finally(() => {
            isFetching = false;  // Unlock after fetch is done
        });
    }
}, 15000);

