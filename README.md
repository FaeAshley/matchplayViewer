MatchPlay Tournament Viewer
The MatchPlay Tournament Viewer is a lightweight web app designed to display real-time tournament information from MatchPlay events. This app allows users to input a tournament ID, view active rounds, match details, and current standings, with additional features like collapsible headers and quick refresh functionality.

🚀 Features
View Tournament Details: Display tournament name, active round, and round status.
Match Information: Shows game names, player details, placements, elapsed time, and completion status.
Standings Overview: Displays player rankings with points.
Collapsible Header: Hide/show header for more screen space.
Quick Refresh Button: Refresh data without re-entering the tournament ID.
Loading Indicator: Visual feedback while data is being fetched.

⚙️ Getting Started

1️⃣ Clone the Repository

git clone https://github.com/yourusername/matchplay-tournament-viewer.git
cd matchplay-tournament-viewer

2️⃣ Setup
Ensure you have Flask installed to serve the app.

pip install flask

3️⃣ Run the App
python app.py

By default, the app will run at http://localhost:5000.

🗂️ Project Structure
matchplay-tournament-viewer/
├── static/
│   ├── styles.css
│   └── script.js
├── templates/
│   └── index.html
├── app.py
└── README.md
static/ - Holds CSS and JavaScript files.
templates/ - Contains the HTML template rendered by Flask.
app.py - Flask server handling API requests.

💻 Usage
Enter Tournament ID in the input field and click "View".
Tournament Data (matches and standings) will load automatically.
Use the refresh button to reload data without re-entering the ID.
Click the collapse button to hide/show the header for more screen space.

🔑 Key Components

1️⃣ JavaScript Functions
fetchTournament(tournamentId)
Fetches tournament data and updates the UI.

Refresh Button:

refreshBtn.addEventListener('click', function() {
    const storedTournamentId = bodyElement.getAttribute('data-tournament-id');
    if (storedTournamentId) {
        fetchTournament(storedTournamentId);
    }
});
Collapse Header:

document.getElementById('collapse-btn').addEventListener('click', function () {
    header.classList.toggle('hidden');
    openCaretHeader.classList.toggle('hidden');
});

2️⃣ HTML Structure
Tournament name and round display.
Dynamic match list and standings table.
Floating refresh button and loading spinner.

🎨 Styling
Custom styles are located in static/styles.css, including:

Responsive layout
Floating refresh button
Loading overlay for data fetching

⚡ Dependencies
FontAwesome for icons.
Flask (Python) for the backend API calls.

🐞 Known Issues
Currently designed for single tournament view per session.
Refresh depends on the data-tournament-id attribute, which resets on page reload.

🤝 Contributing
Fork the repository.
Create a new branch (git checkout -b feature-xyz).
Commit your changes (git commit -m 'Add new feature').
Push to the branch (git push origin feature-xyz).
Open a pull request.

📄 License
This project is open-source under the MIT License.

🙌 Acknowledgments
MatchPlay Events API for providing tournament data.
FontAwesome for the clean and intuitive icons.
