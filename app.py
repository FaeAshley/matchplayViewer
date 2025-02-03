import requests
from flask import Flask, render_template, request, jsonify
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

app = Flask(__name__)


# Home route to render the main page
@app.route('/')
def index():
    return render_template('index.html')


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
    tournament_id = request.json.get('tournament_id')
    if not tournament_id:
        return jsonify({'error': 'Tournament ID is required'}), 400

    tournament_url = f"{API_BASE_URL}/{tournament_id}?includePlayers=1&includeArenas=true"
    matches_url = f"{API_BASE_URL}/{tournament_id}/games?round=activeOrLatest"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        # response = requests.get(matches_url, headers=headers)
        # response.raise_for_status()  # Raises an HTTPError for bad responses
        #
        # data = response.json()  # Attempt to parse JSON
        response = requests.get(tournament_url, headers=headers)
        response.raise_for_status()
        data = response.json()

        print(data)
        return jsonify(data)

    except requests.exceptions.RequestException as e:
        # Log the error in the server console
        print(f"Error fetching data from Matchplay API: {e}")
        return jsonify({'error': str(e)}), 500

    except ValueError as json_error:
        # JSON decoding error
        print(f"JSON Decode Error: {json_error}")
        return jsonify({'error': 'Invalid JSON response from API'}), 500


if __name__ == '__main__':
    app.run(debug=True)
