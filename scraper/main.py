import requests
from bs4 import BeautifulSoup
import sqlite3
from datetime import datetime
import schedule
import time
import os
from pathlib import Path
import locale
import re
import json
from typing import List, Dict, Any, Optional
import logging
import traceback

class HunBasketScraper:
    def __init__(self):
        self.base_url = "https://mkosz.hu"
        self.standings_url = "https://mkosz.hu/bajnoksag/x2425/hun2a"
        self.regular_season_url = "https://mkosz.hu/bajnoksag-musor/x2425/hun2a/"
        self.playoff_url = "https://mkosz.hu/bajnoksag-musor/x2425/hun2a_ply/"
        # Abszolút útvonal használata
        self.db_path = Path(__file__).parent.parent / "data" / "matches.db"
        # Magyar nyelv beállítása a dátumokhoz
        try:
            locale.setlocale(locale.LC_TIME, 'hu_HU.UTF-8')
        except locale.Error:
            print("Nem sikerült beállítani a magyar lokalizációt, a dátumok kezelése nem lesz pontos")
        self.init_db()
        self.data_dir = "data"
        self.setup_logging()
        self.setup_directories()

    def init_db(self):
        """Inicializálja az SQLite adatbázist"""
        os.makedirs(self.db_path.parent, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Először töröljük a régi táblát, ha létezik
        cursor.execute('DROP TABLE IF EXISTS matches')
        cursor.execute('DROP TABLE IF EXISTS standings')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT,
            home_team TEXT NOT NULL,
            away_team TEXT NOT NULL,
            home_score INTEGER,
            away_score INTEGER,
            home_2p INTEGER,
            home_3p INTEGER,
            home_ft INTEGER,
            home_rebounds INTEGER,
            away_2p INTEGER,
            away_3p INTEGER,
            away_ft INTEGER,
            away_rebounds INTEGER,
            venue TEXT,
            referees TEXT,
            is_playoff BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS standings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team TEXT NOT NULL,
            matches INTEGER DEFAULT 0,
            win_percentage REAL DEFAULT 0,
            points INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            points_for INTEGER DEFAULT 0,
            points_against INTEGER DEFAULT 0,
            series TEXT,
            home_record TEXT,
            away_record TEXT,
            last_five TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        conn.close()

    def parse_date(self, date_str):
        """Dátum string feldolgozása"""
        # Magyar hónapnevek és angol megfelelőik
        month_map = {
            'január': '01', 'február': '02', 'március': '03', 'április': '04',
            'május': '05', 'június': '06', 'július': '07', 'augusztus': '08',
            'szeptember': '09', 'október': '10', 'november': '11', 'december': '12'
        }
        
        try:
            # Dátum regex mintázat
            pattern = r'(\d{4})\.\s+([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+)\s+(\d{1,2})\.'
            match = re.match(pattern, date_str)
            
            if not match:
                print(f"Nem megfelelő dátumformátum: {date_str}")
                return None
                
            year = match.group(1)
            month = month_map.get(match.group(2).lower())
            day = match.group(3).zfill(2)
            
            if not all([year, month, day]):
                print(f"Hibás dátum részek: {year}, {month}, {day}")
                return None
                
            return f"{year}-{month}-{day}"
        except Exception as e:
            print(f"Hiba a dátum feldolgozása során: {str(e)}")
            return None

    def scrape_standings(self):
        """Kinyeri a tabella adatokat a weboldalról"""
        try:
            response = requests.get(self.standings_url)
            response.encoding = 'utf-8'  # UTF-8 kódolás beállítása
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Tabella táblázat megkeresése
            table = soup.find('table', {'class': 'champ_tabella'})
            if not table:
                print("Nem található tabella táblázat")
                return
                
            standings = []
            # Sorok feldolgozása
            for row in table.find_all('tr')[1:]:  # Az első sor a fejléc
                cols = row.find_all('td')
                if len(cols) < 13:  # Ellenőrizzük, hogy van-e elég oszlop
                    continue
                    
                # Csapat neve
                team_cell = cols[2]
                team_name = team_cell.find('div', {'class': 'main-tabella-name'}).text.strip()
                
                # Statisztikák kinyerése
                matches = int(cols[3].text.strip())
                win_percentage = float(cols[4].text.strip().replace(',', '.'))
                points = int(cols[5].text.strip())
                wins = int(cols[6].text.strip())
                losses = int(cols[7].text.strip())
                points_for = int(cols[8].text.strip())
                points_against = int(cols[9].text.strip())
                series = cols[10].text.strip()
                home_record = cols[11].text.strip()
                away_record = cols[12].text.strip()
                last_five = cols[13].text.strip() if len(cols) > 13 else ''
                
                standings.append({
                    'team': team_name,
                    'matches': matches,
                    'win_percentage': win_percentage,
                    'points': points,
                    'wins': wins,
                    'losses': losses,
                    'points_for': points_for,
                    'points_against': points_against,
                    'series': series,
                    'home_record': home_record,
                    'away_record': away_record,
                    'last_five': last_five
                })
                
            # Adatok mentése az adatbázisba
            self.save_standings(standings)
            print(f"{len(standings)} csapat adatai sikeresen mentve")
            
        except Exception as e:
            print(f"Hiba a tabella adatok kinyerése során: {str(e)}")
            
    def save_standings(self, standings):
        """Menti a tabella adatokat az adatbázisba"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.text_factory = str  # UTF-8 szöveg kezelés
            cursor = conn.cursor()
            
            for team in standings:
                cursor.execute('''
                    INSERT INTO standings (
                        team, matches, win_percentage, points,
                        wins, losses, points_for, points_against,
                        series, home_record, away_record, last_five
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    team['team'], team['matches'],
                    team['win_percentage'], team['points'], team['wins'],
                    team['losses'], team['points_for'], team['points_against'],
                    team['series'], team['home_record'], team['away_record'],
                    team['last_five']
                ))
                
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Hiba a tabella adatok mentése során: {str(e)}")

    def scrape_matches(self):
        """Lekéri és menti a meccseket mindkét URL-ről"""
        try:
            # Tabella adatok
            print(f"Tabella URL lekérése: {self.standings_url}")
            self.scrape_standings()
            
            # Alapszakasz meccsek
            print(f"Alapszakasz URL lekérése: {self.regular_season_url}")
            self.scrape_url(self.regular_season_url, is_playoff=False)
            
            # Playoff meccsek
            print(f"Playoff URL lekérése: {self.playoff_url}")
            self.scrape_url(self.playoff_url, is_playoff=True)
            
        except Exception as e:
            print(f"Hiba történt a scraping során: {str(e)}")

    def scrape_url(self, url, is_playoff):
        """Lekéri és menti a meccseket egy adott URL-ről"""
        try:
            response = requests.get(url)
            response.encoding = 'utf-8'  # UTF-8 karakterkódolás beállítása
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            matches = []
            
            # A meccsek táblázatának kiválasztása
            matches_table = soup.find('table', {'class': 'box-table'})
            
            if not matches_table:
                print(f"Nem található meccsek táblázat ({'Playoff' if is_playoff else 'Alapszakasz'})")
                return
            
            print(f"Meccsek táblázata megtalálva ({'Playoff' if is_playoff else 'Alapszakasz'})")
            
            # Debug: Kiírjuk a táblázat HTML tartalmát
            print("\nTáblázat HTML tartalma:")
            print(matches_table.prettify()[:1000])  # Csak az első 1000 karaktert írjuk ki
            
            # Meccsek feldolgozása
            current_match = None
            for row in matches_table.find_all('tr'):
                print("\nSor feldolgozása:")
                print(f"Row HTML: {row.prettify()}")
                print(f"Row class: {row.get('class', [])}")
                
                # Ha ez egy játékvezető sor
                if 'referee' in row.get('class', []):
                    print("Játékvezető sor található")
                    if current_match:
                        referees = row.find('td').text.replace('Játékvezetők:', '').strip()
                        current_match['referees'] = referees
                        matches.append(current_match)
                        current_match = None
                    continue
                
                # Ha ez egy meccs sor
                cols = row.find_all(['td', 'th'])
                print(f"Oszlopok száma: {len(cols)}")
                
                if len(cols) >= 6:
                    try:
                        # Csapatok kinyerése
                        home_team_elem = cols[0].find('a')
                        away_team_elem = cols[1].find('a')
                        
                        print(f"Home team elem: {home_team_elem}")
                        print(f"Away team elem: {away_team_elem}")
                        
                        if not home_team_elem or not away_team_elem:
                            print("Nem található csapat elem")
                            continue
                            
                        home_team = home_team_elem.text.strip()
                        away_team = away_team_elem.text.strip()
                        
                        print(f"Home team: {home_team}")
                        print(f"Away team: {away_team}")
                        
                        # Dátum és idő
                        date_elem = cols[2].find('b')
                        if not date_elem:
                            print("Nem található dátum elem")
                            continue
                            
                        date_str = date_elem.text.strip()
                        time_str = cols[3].text.strip()
                        
                        print(f"Dátum string: {date_str}")
                        print(f"Idő string: {time_str}")
                        
                        # Dátum feldolgozása
                        date = self.parse_date(date_str)
                        if not date:
                            print(f"Nem sikerült feldolgozni a dátumot: {date_str}")
                            continue
                        
                        print(f"Feldolgozott dátum: {date}")
                        
                        # Eredmény
                        score_link = cols[4].find('a')
                        if score_link:
                            score = score_link.text.strip()
                            print(f"Eredmény: {score}")
                            if ' - ' in score:
                                home_score, away_score = map(int, score.split(' - '))
                            else:
                                home_score = away_score = None
                        else:
                            home_score = away_score = None
                            print("Nincs eredmény")
                        
                        # Csarnok
                        venue = cols[5].text.strip()
                        print(f"Csarnok: {venue}")
                        
                        current_match = {
                            'date': date,
                            'time': time_str,
                            'home_team': home_team,
                            'away_team': away_team,
                            'home_score': home_score,
                            'away_score': away_score,
                            'venue': venue,
                            'is_playoff': is_playoff
                        }
                        
                        print(f"Meccs létrehozva: {current_match}")
                        
                        # Ha nincs játékvezető sor, akkor azonnal mentjük a meccset
                        if not any('referee' in next_row.get('class', []) for next_row in row.find_next_siblings('tr')):
                            matches.append(current_match)
                            current_match = None
                            print("Meccs mentve (nincs játékvezető)")
                        
                    except Exception as e:
                        print(f"Hiba a meccs feldolgozása során: {str(e)}")
                        continue
            
            if matches:
                self.save_matches(matches)
                print(f"{len(matches)} meccs sikeresen mentve ({'Playoff' if is_playoff else 'Alapszakasz'}).")
            else:
                print(f"Nem találhatóak meccsek a táblázatban ({'Playoff' if is_playoff else 'Alapszakasz'})")
            
        except Exception as e:
            print(f"Hiba történt a scraping során ({'Playoff' if is_playoff else 'Alapszakasz'}): {str(e)}")

    def save_matches(self, matches):
        """Menti a meccseket az adatbázisba"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for match in matches:
            # Ellenőrizzük, hogy létezik-e már a meccs
            cursor.execute('''
                SELECT id FROM matches 
                WHERE date = ? AND home_team = ? AND away_team = ? AND is_playoff = ?
            ''', (match['date'], match['home_team'], match['away_team'], match['is_playoff']))
            
            if not cursor.fetchone():
                cursor.execute('''
                INSERT INTO matches (date, time, home_team, away_team, home_score, away_score, venue, referees, is_playoff)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    match['date'],
                    match['time'],
                    match['home_team'],
                    match['away_team'],
                    match['home_score'],
                    match['away_score'],
                    match['venue'],
                    match.get('referees'),
                    match['is_playoff']
                ))
                print(f"Meccs mentve: {match['home_team']} vs {match['away_team']} ({'Playoff' if match['is_playoff'] else 'Alapszakasz'})")
        
        conn.commit()
        conn.close()

    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('scraper.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def setup_directories(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            self.logger.info(f"Created data directory: {self.data_dir}")

    def scrape_all(self):
        try:
            self.logger.info("Starting scraping process")
            
            standings = self.parse_standings()
            self.logger.info(f"Scraped {len(standings)} standings entries")
            
            regular_season_matches = self.parse_matches(self.regular_season_url)
            self.logger.info(f"Scraped {len(regular_season_matches)} regular season matches")
            
            playoff_matches = self.parse_matches(self.playoff_url)
            self.logger.info(f"Scraped {len(playoff_matches)} playoff matches")
            
            all_matches = regular_season_matches + playoff_matches
            self.save_to_database(all_matches, standings)
            
            self.logger.info("Scraping process completed successfully")
        except Exception as e:
            self.logger.error(f"Error in scraping process: {str(e)}")

    def scrape_player_stats(self, url: str, stat_type: str) -> List[Dict[str, Any]]:
        return []

    def save_player_stats(self, stats: List[Dict[str, Any]], stat_type: str) -> None:
        pass

    def scrape_all_player_stats(self) -> None:
        pass

def main():
    scraper = HunBasketScraper()
    
    # Azonnal futtat egy scraping-et
    scraper.scrape_matches()
    
    # Beállítja a napi frissítést
    schedule.every().day.at("00:00").do(scraper.scrape_matches)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main() 