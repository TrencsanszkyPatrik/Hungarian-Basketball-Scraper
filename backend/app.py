from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from pathlib import Path
import os

app = Flask(__name__)
CORS(app)  # Engedélyezzük a CORS-t a frontend számára

# Adatbázis útvonal
DB_PATH = Path("data/matches.db")

def get_db_connection():
    """Létrehozza az adatbázis kapcsolatot"""
    conn = sqlite3.connect(DB_PATH)
    conn.text_factory = str  # UTF-8 szöveg kezelés
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/standings', methods=['GET'])
def get_standings():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM standings 
            ORDER BY points DESC, win_percentage DESC
        ''')
        
        standings = cursor.fetchall()
        conn.close()
        
        if not standings:
            print("Nincs adat a standings táblában")
            return jsonify([])
            
        print(f"Standings adatok száma: {len(standings)}")
        return jsonify([{
            'team': row['team'],
            'matches': row['matches'],
            'win_percentage': row['win_percentage'],
            'points': row['points'],
            'wins': row['wins'],
            'losses': row['losses'],
            'points_for': row['points_for'],
            'points_against': row['points_against'],
            'series': row['series'],
            'home_record': row['home_record'],
            'away_record': row['away_record'],
            'last_five': row['last_five']
        } for row in standings])
        
    except Exception as e:
        print(f"Hiba a standings lekérdezése során: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/matches', methods=['GET'])
def get_matches():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM matches 
            ORDER BY date DESC, time DESC
        ''')
        
        matches = cursor.fetchall()
        conn.close()
        
        if not matches:
            print("Nincs adat a matches táblában")
            return jsonify([])
            
        print(f"Matches adatok száma: {len(matches)}")
        return jsonify([{
            'id': row['id'],
            'date': row['date'],
            'time': row['time'],
            'home_team': row['home_team'],
            'away_team': row['away_team'],
            'home_score': row['home_score'],
            'away_score': row['away_score'],
            'venue': row['venue']
        } for row in matches])
        
    except Exception as e:
        print(f"Hiba a matches lekérdezése során: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/matches/<int:match_id>', methods=['GET'])
def get_match(match_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM matches 
            WHERE id = ?
        ''', (match_id,))
        
        match = cursor.fetchone()
        conn.close()
        
        if match is None:
            return jsonify({'error': 'Match not found'}), 404
            
        return jsonify({
            'id': match['id'],
            'date': match['date'],
            'time': match['time'],
            'home_team': match['home_team'],
            'away_team': match['away_team'],
            'home_score': match['home_score'],
            'away_score': match['away_score'],
            'home_2p': match['home_2p'],
            'home_3p': match['home_3p'],
            'home_ft': match['home_ft'],
            'home_rebounds': match['home_rebounds'],
            'away_2p': match['away_2p'],
            'away_3p': match['away_3p'],
            'away_ft': match['away_ft'],
            'away_rebounds': match['away_rebounds'],
            'venue': match['venue'],
            'referees': match['referees'],
            'is_playoff': bool(match['is_playoff'])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """Visszaadja az összes csapatot"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT home_team as team FROM matches
            UNION
            SELECT DISTINCT away_team as team FROM matches
            ORDER BY team
        """)
        
        teams = [row['team'] for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(teams)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Visszaadja a csapatok statisztikáit"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Nyerési arányok
        cursor.execute("""
            SELECT 
                team,
                COUNT(*) as total_matches,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins
            FROM (
                SELECT 
                    home_team as team,
                    CASE WHEN home_score > away_score THEN 'win' ELSE 'loss' END as result
                FROM matches
                UNION ALL
                SELECT 
                    away_team as team,
                    CASE WHEN away_score > home_score THEN 'win' ELSE 'loss' END as result
                FROM matches
            )
            GROUP BY team
        """)
        
        win_rates = {row['team']: (row['wins'] / row['total_matches'] * 100) 
                    for row in cursor.fetchall()}
        
        # Pontátlagok
        cursor.execute("""
            SELECT 
                team,
                AVG(points) as avg_points
            FROM (
                SELECT home_team as team, home_score as points FROM matches
                UNION ALL
                SELECT away_team as team, away_score as points FROM matches
            )
            GROUP BY team
        """)
        
        point_averages = {row['team']: row['avg_points'] 
                         for row in cursor.fetchall()}
        
        conn.close()
        return jsonify({
            "win_rates": win_rates,
            "point_averages": point_averages
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 