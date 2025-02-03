import json

import requests
from flask import Flask, render_template, request, jsonify
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

app = Flask(__name__)

# In-memory cache for arena data
tournament_cache = {
    'tournament': {
        'id': None,
        'name': '',
        'status': '',
    },
    'arenas': [],
    'players': []
}


# Home route to render the main page
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/get_data')
def get_data():
    tournament_id = 176659
    url = f"http://127.0.0.1:5000/get_tournament_api"  # Calling your own Flask route
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(url, json={'tournament_id': tournament_id}, headers=headers)
        response.raise_for_status()  # Check for HTTP errors

        data = response.json()  # Parse the JSON response
        return f"<h1>Data Refreshed:</h1><pre>{json.dumps(data, indent=4)}</pre>"

    except requests.exceptions.RequestException as e:
        return f"<h1>Error:</h1><p>{e}</p>"


# API route to fetch tournament data based on the ID
@app.route('/get_tournament', methods=['POST'])
def get_tournament():
    tournament_id = request.json.get('tournament_id')
    if not tournament_id:
        return jsonify({'error': 'Tournament ID is required'}), 400

    matches_url = f"https://app.matchplay.events/tournaments/{tournament_id}/matches"
    standings_url = f"https://app.matchplay.events/tournaments/{tournament_id}/standings"
    players_url = f"https://app.matchplay.events/tournaments/{tournament_id}/players"

    # Setup Selenium with headless Chrome per request
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)

    try:
        # ✅ Step 1: Scrape Players Page
        driver.get(players_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "table"))  # Adjust selector as needed
        )
        players_soup = BeautifulSoup(driver.page_source, 'html.parser')
        tournament = {
            'id': tournament_id,
            'status': '',
            'name': ''
        }

        tournament_status_tag = players_soup.find('div', class_='inline-flex', string=True)
        tournament['status'] = tournament_status_tag.get_text(strip=True) if tournament_status_tag else 'Unknown Status'

        # Extract Tournament Name
        tournament_name_tag = players_soup.find('h1')
        tournament['name'] = tournament_name_tag.get_text(strip=True) if tournament_name_tag else 'Unknown Tournament'

        players = []
        player_rows = players_soup.select('tbody tr')
        for row in player_rows:
            columns = row.find_all('td')
            if len(columns) >= 3:
                player_td = columns[0]
                player_link = player_td.find('a')
                player_name = player_link.get_text(strip=True) if player_link else "Unknown Player"
                players.append(player_name)


        # ✅ Step 2: Scrape Matches Page
        if tournament['status'] == 'In progress' or tournament['status'] == 'Completed':
            driver.get(matches_url)

            # Wait until matches are loaded (adjust selector if needed)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "border-b"))
            )

            # Parse the page content
            matches_soup = BeautifulSoup(driver.page_source, 'html.parser')

            # Extract Active Round
            active_round_section = matches_soup.find('h1', class_='text-base font-semibold')
            round_name, round_status = 'Unknown', 'Unknown Status'
            if active_round_section:
                # Get the full text from the active round section
                round_text = active_round_section.get_text(strip=True, separator=' ')

                # Check for both 'In progress' and 'Completed' statuses
                if ' In progress' in round_text:
                    round_name = round_text.split(' In progress')[0]
                    round_status = 'In progress'
                elif ' Completed' in round_text:
                    round_name = round_text.split(' Completed')[0]
                    round_status = 'Completed'
                else:
                    round_name = round_text  # Fallback if no status is present
                    round_status = 'Unknown'

            # Extract Game Names
            games = []
            game_sections = matches_soup.find_all('div', class_='overflow-hidden')

            for game_section in game_sections:
                # Extract Game Name
                game_link = game_section.find('a', href=lambda href: href and "/arenas/" in href)
                game_name = game_link.get_text(strip=True) if game_link else "Unknown Game"

                # Extract Status Tag (e.g., "NEW")
                game_html_tag = game_section.find('div', class_='inline-flex')
                game_tag = game_html_tag.get_text(strip=True) if game_html_tag else None

                # Extract Player Names and Placements
                match_players = []
                match_player_list = game_section.select('li.flex.items-center.truncate.px-3.sm\\:px-4')

                for player_item in match_player_list:
                    # Player Name
                    match_player_name_tag = player_item.find('a', href=lambda href: href and "/players/" in href)
                    match_player_name = match_player_name_tag.get_text(strip=True) if match_player_name_tag else "Unknown Player"

                    # Player Placement (e.g., "1st")
                    placement_tag = player_item.find('div', class_='text-green-500')
                    placement = placement_tag.get_text(strip=True) if placement_tag else None

                    match_players.append({
                        'name': match_player_name,
                        'placement': placement
                    })

                # Extract Elapsed Time (next to the SVG clock icon)
                elapsed_time_tag = game_section.find('div', class_='flex-none text-xs font-normal leading-none')
                elapsed_time = elapsed_time_tag.get_text(strip=True) if elapsed_time_tag else "N/A"

                # Check if Game is Completed
                completion_tag = game_section.find('div', class_='bg-green-50')
                is_completed = completion_tag is not None

                # Append game with players, elapsed time, and completion status
                games.append({
                    'game_name': game_name,
                    'game_tag': game_tag,
                    'players': match_players,
                    'elapsed_time': elapsed_time,
                    'is_completed': is_completed
                })

            # ✅ Step 3: Scrape Standings Page
            driver.get(standings_url)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "table"))  # Adjust selector as needed
            )
            standings_soup = BeautifulSoup(driver.page_source, 'html.parser')

            standings = []
            standings_rows = standings_soup.select('tbody tr')
            for row in standings_rows:
                columns = row.find_all('td')
                if len(columns) >= 3:
                    rank = columns[0].get_text(strip=True)
                    player_name = columns[1].get_text(strip=True)
                    points = columns[2].get_text(strip=True)
                    standings.append({'rank': rank, 'player': player_name, 'points': points})

            # Return JSON response
            return jsonify({
                'players': players,
                'tournament': tournament,
                'round_name': round_name,
                'round_status': round_status,
                'games': games,
                'standings': standings
            })
        else:
            return jsonify({
                'players': players,
                'tournament': tournament
            })

    finally:
        driver.quit()


# Replace this with your actual API token
API_TOKEN = "YOUR_API_TOKEN"

# Base URL for the Matchplay API
API_BASE_URL = "https://app.matchplay.events/api/tournaments"


# Not currently in use
@app.route('/get_tournament_api', methods=['POST'])
def get_tournament_api():
    data = request.get_json()
    tournament_id = data.get('tournament_id')
    if not tournament_id:
        return jsonify({'error': 'Tournament ID is required'}), 400

    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    # API Endpoints
    tournament_url = f"{API_BASE_URL}/{tournament_id}?includePlayers=1&includeArenas=true"
    matches_url = f"{API_BASE_URL}/{tournament_id}/games?round=activeOrLatest"
    standings_url = f"{API_BASE_URL}/{tournament_id}/standings"
    round_url = f"{API_BASE_URL}/{tournament_id}/rounds?cacheEligible = true"

    # Cache Check
    if tournament_cache['tournament']['id'] == tournament_id:
        print("Using cached data.")
        tournament = tournament_cache['tournament']
        players = tournament_cache['players']
        arenas = tournament_cache['arenas']
    else:
        try:
            response = requests.get(tournament_url, headers=headers)
            response.raise_for_status()
            t_info = response.json().get('data', {})

            # Tournament Info
            tournament = {
                'id': tournament_id,
                'name': t_info.get('name', 'Unknown Name'),
                'status': t_info.get('status', 'Unknown Status'),
            }
            tournament_cache['tournament'] = tournament

            # Players
            players = [
                {
                    "id": player.get('playerId', 'N/A'),
                    "name": player.get('name', 'Unknown Player'),
                    "standing": None,
                    "points": None,
                }
                for player in t_info.get('players', [])
            ]
            tournament_cache['players'] = players

            # Arenas
            arenas = [
                {
                    "id": arena.get('arenaId', 'N/A'),
                    "name": arena.get('name', 'Unknown Game Name'),
                    "label": arena.get('tournamentArena', {}).get('labels', [])
                }
                for arena in t_info.get('arenas', [])
            ]
            tournament_cache['arenas'] = arenas

        except (requests.exceptions.RequestException, ValueError) as e:
            print(f"Error fetching tournament data: {e}")
            return jsonify({'error': str(e)}), 500

    # Matches
    try:
        m_response = requests.get(matches_url, headers=headers)
        m_response.raise_for_status()
        m_data = m_response.json().get("data", [])

        matches = []
        for match in m_data:
            arena = next((a for a in arenas if a['id'] == match.get("arenaId")), None)
            if arena:
                placement_map = {pid: idx + 1 for idx, pid in enumerate(match.get('resultPositions', []))}
                match_players = [
                    {
                        "id": pid,
                        "name": next((p['name'] for p in players if p['id'] == pid), 'Unknown Player'),
                        "player": idx + 1,
                        "placement": placement_map.get(pid)
                    }
                    for idx, pid in enumerate(match.get('playerIds', []))
                ]

                matches.append({
                    "id": arena["id"],
                    "gameName": arena["name"],
                    "label": arena.get("label", []),
                    "duration": match.get("duration", 0),
                    "matchPlayers": match_players,
                    "status": match.get("status", "unknown")
                })

    except requests.exceptions.RequestException as e:
        print(f"Error fetching match data: {e}")
        return jsonify({'error': str(e)}), 500

    # Standings
    try:
        s_response = requests.get(standings_url, headers=headers)
        s_response.raise_for_status()
        standings = s_response.json()

        for standing in standings:
            player = next((p for p in players if p['id'] == standing.get('playerId')), None)
            if player:
                player['standing'] = standing.get('position')
                player['points'] = standing.get('points')

        players.sort(key=lambda player: player.get('name', float('inf')))

    except requests.exceptions.RequestException as e:
        print(f"Error fetching standings: {e}")
        return jsonify({'error': str(e)}), 500

    try:
        r_response = requests.get(round_url, headers=headers)
        r_response.raise_for_status()
        r_data = r_response.json().get("data", [])

        current_round = {
            'index': r_data[0]['index'] + 1,
            'status': r_data[0]['status']
        }


    except requests.exceptions.RequestException as e:
        print(f"Error fetching rounds data: {e}")
        return jsonify({'error': str(e)}), 500

    return jsonify({
        'players': players,
        'tournament': tournament,
        'matches': matches,
        'currentRound': current_round
    })



if __name__ == '__main__':
    app.run(debug=True)
