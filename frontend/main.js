// Data storage
let matches = [];
let standings = [];

// DOM elements
let matchesTable = null;
let standingsTable = null;
let teamFilter = null;
let dateFilter = null;
let statusFilter = null;
let matchesByMonth = null;

// Chart.js instances
let winRateChart = null;
let pointsChart = null;

// Initialization
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

// Event listeners setup
function setupEventListeners() {
    if (teamFilter) teamFilter.addEventListener('change', filterMatches);
    if (dateFilter) dateFilter.addEventListener('change', filterMatches);
    if (statusFilter) statusFilter.addEventListener('change', filterMatches);
}

// Load standings
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

// Render standings
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

// Load matches
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

// Update team filter
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

// Update date filter
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

// Render matches
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

// Create matches table
function createMatchesTable(matches) {
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home Team</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Away Team</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    matches.forEach(match => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(match.date)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${match.time || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${match.home_team}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${match.away_team}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${match.home_score !== null ? `${match.home_score} - ${match.away_score}` : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${match.venue || '-'}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    return table;
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU');
}

function addLog(message) {
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        const logDiv = document.createElement('div');
        logDiv.className = 'text-sm text-gray-600';
        logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logDiv);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
        errorDiv.innerHTML = `
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">${message}</span>
        `;
        errorContainer.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Filter matches
function filterMatches() {
    const selectedTeam = teamFilter.value;
    const selectedDate = dateFilter.value;
    const selectedStatus = statusFilter.value;

    let filteredMatches = matches;

    if (selectedTeam) {
        filteredMatches = filteredMatches.filter(match => 
            match.home_team === selectedTeam || match.away_team === selectedTeam
        );
    }

    if (selectedDate) {
        filteredMatches = filteredMatches.filter(match => 
            match.date === selectedDate
        );
    }

    if (selectedStatus) {
        filteredMatches = filteredMatches.filter(match => {
            if (selectedStatus === 'upcoming') {
                return match.home_score === null;
            } else if (selectedStatus === 'completed') {
                return match.home_score !== null;
            }
            return true;
        });
    }

    renderMatches(filteredMatches);
    addLog(`${filteredMatches.length} matches displayed after filtering`);
}

// Update charts
function updateCharts(filteredMatches = matches) {
    // Calculate win rates
    const winRates = calculateWinRates(filteredMatches);
    
    // Destroy existing charts if they exist
    if (winRateChart) {
        winRateChart.destroy();
    }
    if (pointsChart) {
        pointsChart.destroy();
    }
    
    // Create win rate chart
    const winRateCtx = document.getElementById('winRateChart').getContext('2d');
    winRateChart = new Chart(winRateCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(winRates),
            datasets: [{
                label: 'Win Rate (%)',
                data: Object.values(winRates),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Teams',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
    
    // Calculate point averages
    const pointAverages = calculatePointAverages(filteredMatches);
    
    // Create points chart
    const pointsCtx = document.getElementById('pointsChart').getContext('2d');
    pointsChart = new Chart(pointsCtx, {
        type: 'line',
        data: {
            labels: Object.keys(pointAverages),
            datasets: [{
                label: 'Point Average',
                data: Object.values(pointAverages),
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                pointBackgroundColor: 'rgb(75, 192, 192)',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Points per Game',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Teams',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + ' points';
                        }
                    }
                }
            }
        }
    });
}

// Calculate win rates
function calculateWinRates(matches) {
    const winRates = {};
    const teamStats = {};
    
    // Initialize stats for all teams
    matches.forEach(match => {
        if (!teamStats[match.home_team]) {
            teamStats[match.home_team] = { wins: 0, total: 0 };
        }
        if (!teamStats[match.away_team]) {
            teamStats[match.away_team] = { wins: 0, total: 0 };
        }
    });
    
    // Calculate wins and total games
    matches.forEach(match => {
        if (match.home_score !== null && match.away_score !== null) {
            teamStats[match.home_team].total++;
            teamStats[match.away_team].total++;
            
            if (match.home_score > match.away_score) {
                teamStats[match.home_team].wins++;
            } else if (match.home_score < match.away_score) {
                teamStats[match.away_team].wins++;
            }
        }
    });
    
    // Calculate win rates
    Object.entries(teamStats).forEach(([team, stats]) => {
        winRates[team] = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
    });
    
    return winRates;
}

// Calculate point averages
function calculatePointAverages(matches) {
    const pointAverages = {};
    const teamStats = {};
    
    // Initialize stats for all teams
    matches.forEach(match => {
        if (!teamStats[match.home_team]) {
            teamStats[match.home_team] = { total: 0, count: 0 };
        }
        if (!teamStats[match.away_team]) {
            teamStats[match.away_team] = { total: 0, count: 0 };
        }
    });
    
    // Calculate points and games
    matches.forEach(match => {
        if (match.home_score !== null && match.away_score !== null) {
            teamStats[match.home_team].total += match.home_score;
            teamStats[match.home_team].count++;
            teamStats[match.away_team].total += match.away_score;
            teamStats[match.away_team].count++;
        }
    });
    
    // Calculate averages
    Object.entries(teamStats).forEach(([team, stats]) => {
        pointAverages[team] = stats.count > 0 ? stats.total / stats.count : 0;
    });
    
    return pointAverages;
} 