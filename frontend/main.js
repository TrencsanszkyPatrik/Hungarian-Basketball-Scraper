let matches = [];
let standings = [];

let matchesTable = null;
let standingsTable = null;
let teamFilter = null;
let dateFilter = null;
let statusFilter = null;
let matchesByMonth = null;

let winRateChart = null;
let pointsChart = null;

document.addEventListener('DOMContentLoaded', () => {
    matchesTable = document.querySelector('#matchesTable');
    standingsTable = document.querySelector('#standingsTable');
    teamFilter = document.getElementById('teamFilter');
    dateFilter = document.getElementById('dateFilter');
    statusFilter = document.getElementById('statusFilter');
    matchesByMonth = document.querySelector('#matchesByMonth');

    setupEventListeners();
    loadMatches();
    loadStandings();
});

function setupEventListeners() {
    if (teamFilter) teamFilter.addEventListener('change', filterMatches);
    if (dateFilter) dateFilter.addEventListener('change', filterMatches);
    if (statusFilter) statusFilter.addEventListener('change', filterMatches);
}

async function loadStandings() {
    try {
        const response = await fetch('http://localhost:5000/api/standings');
        if (!response.ok) {
            throw new Error('Error loading standings');
        }
        const data = await response.json();
        console.log('Standings data:', data);
        if (!Array.isArray(data)) {
            throw new Error('Invalid standings data');
        }
        standings = data;
        renderStandings(standings);
        addLog('Standings loaded successfully');
    } catch (error) {
        console.error('Error:', error);
        showError('Error loading standings');
        addLog('Error loading standings: ' + error.message);
    }
}

function renderStandings(standings) {
    if (!standingsTable) {
        console.error('Standings table not found');
        addLog('Error: Standings table not found');
        return;
    }
    
    standingsTable.innerHTML = '';
    
    standings.forEach((team, index) => {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="font-medium">${team.team}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${team.matches}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.win_percentage}%</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.points}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.wins}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.losses}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.points_for}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.points_against}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.series}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.home_record}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.away_record}</td>
            <td class="px-6 py-4 whitespace-nowrap">${team.last_five}</td>
        `;
        
        standingsTable.appendChild(row);
    });
    
    addLog(`${standings.length} teams displayed in standings`);
}

async function loadMatches() {
    try {
        const response = await fetch('http://localhost:5000/api/matches');
        if (!response.ok) {
            throw new Error('Error loading matches');
        }
        const data = await response.json();
        console.log('Match data:', data);
        if (!Array.isArray(data)) {
            throw new Error('Invalid match data');
        }
        matches = data;
        renderMatches(matches);
        updateTeamFilter(matches);
        updateDateFilter(matches);
        updateCharts(matches);
        addLog('Matches loaded successfully');
    } catch (error) {
        console.error('Error:', error);
        showError('Error loading matches');
        addLog('Error loading matches: ' + error.message);
    }
}

function updateTeamFilter(matches) {
    if (!teamFilter) {
        console.error('Team filter not found');
        return;
    }

    const teams = new Set();
    matches.forEach(match => {
        teams.add(match.home_team);
        teams.add(match.away_team);
    });

    teamFilter.innerHTML = '<option value="">All teams</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

function updateDateFilter(matches) {
    if (!dateFilter) {
        console.error('Date filter not found');
        return;
    }

    const dates = new Set();
    matches.forEach(match => {
        dates.add(match.date);
    });

    dateFilter.innerHTML = '<option value="">All dates</option>';
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        dateFilter.appendChild(option);
    });
}

function renderMatches(matches) {
    if (!matchesByMonth) {
        console.error('Matches table not found');
        return;
    }

    const matchesByMonthObj = {};
    const upcomingMatches = [];
    
    matches.forEach(match => {
        if (match.home_score === null) {
            upcomingMatches.push(match);
            return;
        }
        
        const date = new Date(match.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!matchesByMonthObj[monthKey]) {
            matchesByMonthObj[monthKey] = [];
        }
        matchesByMonthObj[monthKey].push(match);
    });

    const sortedMonths = Object.keys(matchesByMonthObj).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        
        if (yearA === yearB) {
            if (monthA >= 9 && monthB >= 9) {
                return monthB - monthA;
            }
            if (monthA < 9 && monthB < 9) {
                return monthB - monthA;
            }
            return monthA < 9 ? 1 : -1;
        }
        return yearB - yearA;
    });

    matchesByMonth.innerHTML = '';

    if (upcomingMatches.length > 0) {
        const upcomingSection = document.createElement('div');
        upcomingSection.className = 'mb-8';
        
        const upcomingHeader = document.createElement('h3');
        upcomingHeader.className = 'text-lg font-semibold mb-4 px-6';
        upcomingHeader.textContent = 'Upcoming matches';
        upcomingSection.appendChild(upcomingHeader);

        const table = createMatchesTable(upcomingMatches);
        upcomingSection.appendChild(table);
        matchesByMonth.appendChild(upcomingSection);
    }

    sortedMonths.forEach(monthKey => {
        const monthMatches = matchesByMonthObj[monthKey];
        const monthName = new Date(monthKey + '-01').toLocaleString('hu-HU', { month: 'long', year: 'numeric' });
        
        const monthSection = document.createElement('div');
        monthSection.className = 'mb-8 month-section';
        
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header flex items-center justify-between p-6 bg-gray-50 rounded-t-lg';
        monthHeader.innerHTML = `
            <h3 class="text-lg font-semibold">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h3>
            <i class="fas fa-chevron-down toggle-icon"></i>
        `;
        monthSection.appendChild(monthHeader);

        const monthContent = document.createElement('div');
        monthContent.className = 'month-content';
        
        const table = createMatchesTable(monthMatches);
        monthContent.appendChild(table);
        monthSection.appendChild(monthContent);
        
        if (sortedMonths.indexOf(monthKey) === 0) {
            monthContent.classList.add('expanded');
            monthHeader.querySelector('.toggle-icon').classList.add('expanded');
        }
        
        monthHeader.addEventListener('click', () => {
            const isExpanded = monthContent.classList.contains('expanded');
            monthContent.classList.toggle('expanded');
            monthHeader.querySelector('.toggle-icon').classList.toggle('expanded');
            
            if (!isExpanded) {
                monthContent.style.maxHeight = monthContent.scrollHeight + 'px';
            } else {
                monthContent.style.maxHeight = '0';
            }
        });
        
        matchesByMonth.appendChild(monthSection);
    });
}

function createMatchesTable(matches) {
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Away</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referees</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    
    matches.forEach(match => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(match.date)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${match.time || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${match.home_team}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${match.home_score !== null ? `${match.home_score} - ${match.away_score}` : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${match.away_team}</td>
            <td class="px-6 py-4 whitespace-nowrap">${match.venue || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${match.referees || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function addLog(message) {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'text-sm text-gray-600';
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (!errorContainer) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
    errorDiv.innerHTML = `
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">${message}</span>
        <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
        </span>
    `;
    
    errorContainer.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function filterMatches() {
    const team = teamFilter.value;
    const date = dateFilter.value;
    const status = statusFilter.value;
    
    let filteredMatches = matches;
    
    if (team) {
        filteredMatches = filteredMatches.filter(match => 
            match.home_team === team || match.away_team === team
        );
    }
    
    if (date) {
        filteredMatches = filteredMatches.filter(match => match.date === date);
    }
    
    if (status) {
        if (status === 'upcoming') {
            filteredMatches = filteredMatches.filter(match => match.home_score === null);
        } else if (status === 'completed') {
            filteredMatches = filteredMatches.filter(match => match.home_score !== null);
        }
    }
    
    renderMatches(filteredMatches);
    updateCharts(filteredMatches);
}

function updateCharts(filteredMatches = matches) {
    const winRates = calculateWinRates(filteredMatches);
    const pointAverages = calculatePointAverages(filteredMatches);
    
    // Win Rate Chart
    if (winRateChart) {
        winRateChart.destroy();
    }
    
    const winRateCtx = document.getElementById('winRateChart').getContext('2d');
    winRateChart = new Chart(winRateCtx, {
        type: 'bar',
        data: {
            labels: winRates.map(team => team.team),
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates.map(team => team.winRate),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Points Chart
    if (pointsChart) {
        pointsChart.destroy();
    }
    
    const pointsCtx = document.getElementById('pointsChart').getContext('2d');
    pointsChart = new Chart(pointsCtx, {
        type: 'bar',
        data: {
            labels: pointAverages.map(team => team.team),
            datasets: [{
                label: 'Points per Game',
                data: pointAverages.map(team => team.pointsPerGame),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function calculateWinRates(matches) {
    const teamStats = {};
    
    matches.forEach(match => {
        if (match.home_score === null) return;
        
        if (!teamStats[match.home_team]) {
            teamStats[match.home_team] = { wins: 0, games: 0 };
        }
        if (!teamStats[match.away_team]) {
            teamStats[match.away_team] = { wins: 0, games: 0 };
        }
        
        teamStats[match.home_team].games++;
        teamStats[match.away_team].games++;
        
        if (match.home_score > match.away_score) {
            teamStats[match.home_team].wins++;
        } else {
            teamStats[match.away_team].wins++;
        }
    });
    
    return Object.entries(teamStats).map(([team, stats]) => ({
        team,
        winRate: stats.games > 0 ? (stats.wins / stats.games * 100).toFixed(1) : 0
    })).sort((a, b) => b.winRate - a.winRate);
}

function calculatePointAverages(matches) {
    const teamStats = {};
    
    matches.forEach(match => {
        if (match.home_score === null) return;
        
        if (!teamStats[match.home_team]) {
            teamStats[match.home_team] = { points: 0, games: 0 };
        }
        if (!teamStats[match.away_team]) {
            teamStats[match.away_team] = { points: 0, games: 0 };
        }
        
        teamStats[match.home_team].points += match.home_score;
        teamStats[match.away_team].points += match.away_score;
        teamStats[match.home_team].games++;
        teamStats[match.away_team].games++;
    });
    
    return Object.entries(teamStats).map(([team, stats]) => ({
        team,
        pointsPerGame: stats.games > 0 ? (stats.points / stats.games).toFixed(1) : 0
    })).sort((a, b) => b.pointsPerGame - a.pointsPerGame);
} 