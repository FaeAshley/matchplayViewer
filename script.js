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


document.getElementById('load-tournament').addEventListener('click', function() {
    const tournamentId = document.getElementById('tournament-id').value;
    if (tournamentId) {
        fetchTournament(tournamentId);
    } else {
        alert('Please enter a tournament ID.');
    }
});

refreshBtn.addEventListener('click', function() {
    const storedTournamentId = bodyElement.getAttribute('data-tournament-id');
    if (storedTournamentId) {
        fetchTournament(storedTournamentId);
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
        console.log('Received data:', data);  // Debugging log

        if (!data.tournament_name || !data.games) {
            throw new Error('Invalid response structure');
        }

        tournamentHeader.innerText = `${data.tournament_name}`;
        currentRoundText.forEach(roundText => {
            roundText.innerText = `${data.round_name} - ${data.round_status}`;
        })

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
        standingsTable.innerHTML='';
        data.standings.forEach(standing => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td><span class="rank">${standing.rank}</span></td>
            <td><span class="player">${standing.player}</span></td>
            <td><span class="points">${standing.points}</span></td>
            `;
            tr.classList.add('standing-row');
            standingsTable.appendChild(tr);
        })

    })
    .catch(error => console.error('Error:', error))
    .finally(() => {
        // Hide the loading overlay when the request is complete
        loadingOverlay.classList.remove('active');
    });
}


//function fetchTournamentApi(tournamentId) {
//    fetch('/get_tournament_api', {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json' },
//        body: JSON.stringify({ tournament_id: tournamentId })
//    })
//    .then(response => {
//        if (!response.ok) {
//            throw new Error(`HTTP error! status: ${response.status}`);
//        }
//        return response.json();
//    })
//    .then(data => {
//        console.log('Received data:', data);
//    })
//}