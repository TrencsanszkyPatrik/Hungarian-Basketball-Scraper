# Hungarian Basketball Scraper

A web application for tracking and displaying Hungarian basketball league (NB I/A) matches and statistics.

## Features

- Real-time match data display
- Monthly match grouping
- Team and date filtering
- Match status filtering (upcoming/completed)
- Detailed match statistics
- League standings
- Win rate and point average charts
- Favorite teams functionality

## Technologies Used

- Frontend:
  - HTML5
  - CSS3 (Tailwind CSS)
  - JavaScript
  - Chart.js for statistics visualization
  - Font Awesome for icons

- Backend:
  - Python
  - Flask
  - SQLite

## Installation

1. Clone the repository
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the backend server:
   ```bash
   python backend/app.py
   ```
4. Open the frontend/index.html in your browser

## Project Structure

```
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── data/
│   └── matches.db
└── README.md
```

## Usage

- The application automatically loads match data from the database
- Use the filters to sort matches by team, date, or status
- Click on month headers to expand/collapse match lists
- View detailed statistics in the charts section
- Check the league standings in the standings table

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License.
