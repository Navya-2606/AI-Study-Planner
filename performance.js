document.addEventListener("DOMContentLoaded", () => {
  const summaryBox = document.getElementById("summaryBox");
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toggleSummaryBtn";
  toggleBtn.textContent = "Hide Summary";
  toggleBtn.style.marginBottom = "15px";
  toggleBtn.style.padding = "8px 16px";
  toggleBtn.style.borderRadius = "12px";
  toggleBtn.style.border = "none";
  toggleBtn.style.background = "rgba(124, 58, 237, 0.8)";
  toggleBtn.style.color = "#fff";
  toggleBtn.style.fontWeight = "600";
  toggleBtn.style.cursor = "pointer";
  toggleBtn.style.transition = "background 0.3s ease";

  toggleBtn.addEventListener("mouseenter", () => toggleBtn.style.background = "rgba(124, 58, 237, 1)");
  toggleBtn.addEventListener("mouseleave", () => toggleBtn.style.background = "rgba(124, 58, 237, 0.8)");

  toggleBtn.addEventListener("click", () => {
    if (summaryBox.style.display === "none") {
      summaryBox.style.display = "block";
      toggleBtn.textContent = "Hide Summary";
    } else {
      summaryBox.style.display = "none";
      toggleBtn.textContent = "Show Summary";
    }
  });

  summaryBox.parentNode.insertBefore(toggleBtn, summaryBox);

  const allTimetables = JSON.parse(localStorage.getItem("allTimetables") || "[]");

  if (allTimetables.length === 0) {
    summaryBox.textContent = "No study plans found. Please create and save a timetable first.";
    return;
  }

  let totalTopics = 0;
  let completedTopics = 0;

  const dailyProgress = {};
  const weeklyProgress = {};
  const studyDates = [];

  function generateTimetableId(plan) {
    const planString = JSON.stringify(plan);
    let hash = 0;
    for (let i = 0; i < planString.length; i++) {
      const char = planString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'timetable-' + Math.abs(hash).toString(16);
  }

  allTimetables.forEach(plan => {
    const timetableId = generateTimetableId(plan);

    plan.forEach((day, dayIndex) => {
      if (!Array.isArray(day.topics)) return;

      const dayKey = day.day;
      const dateObj = new Date(dayKey);
      studyDates.push(dateObj);

      day.topics.forEach((topic, topicIndex) => {
        totalTopics++;

        const topicKey = `progress-${timetableId}-day${dayIndex}-topic${topicIndex}`;

        const localStorageCompleted = localStorage.getItem(topicKey) === "true";
        const topicCompleted = topic.completed === true;

        if (localStorageCompleted || topicCompleted) {
          completedTopics++;

          dailyProgress[dayKey] = (dailyProgress[dayKey] || 0) + 1;
        }
      });
    });
  });

  const uniqueDates = [...new Set(studyDates.map(d => d.toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => a - b);

  const startDate = uniqueDates[0];
  const relativeWeekMap = {};

  uniqueDates.forEach(date => {
    const daysDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysDiff / 7) + 1;
    relativeWeekMap[date.toDateString()] = week;
  });

  Object.entries(dailyProgress).forEach(([dateStr, count]) => {
    const week = relativeWeekMap[new Date(dateStr).toDateString()] || 1;
    weeklyProgress[week] = (weeklyProgress[week] || 0) + count;
  });

  const pendingTopics = totalTopics - completedTopics;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const progressBarHTML = `
    <div class="progress-container">
      <div class="progress-bar" style="--progress-width: ${progressPercent}%;"></div>
    </div>
    <p><strong>Progress:</strong> ${progressPercent}%</p>
  `;

  const dailyList = Object.entries(dailyProgress)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, count]) => `<li>${date}: ${count} topics completed</li>`).join('');

  const weeklyList = Object.entries(weeklyProgress)
    .sort((a, b) => a[0] - b[0])
    .map(([week, count]) => `<li>Week ${week}: ${count} topics completed</li>`).join('');

  summaryBox.innerHTML = `
    <p><strong>Total Topics:</strong> ${totalTopics}</p>
    <p><strong>✅ Completed:</strong> ${completedTopics}</p>
    <p><strong>⏳ Pending:</strong> ${pendingTopics}</p>
    ${progressBarHTML}
  `;

  document.getElementById('dailyList').innerHTML = dailyList || '<li>No daily progress yet</li>';
  document.getElementById('weeklyList').innerHTML = weeklyList || '<li>No weekly progress yet</li>';

  // Make daily and weekly list items clickable with alert
  document.querySelectorAll('#dailyList li, #weeklyList li').forEach(li => {
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      alert(li.textContent + ' — Keep up the great work!');
    });
  });

  // ---- Chart.js visualizations ----
  const dailyCtx = document.getElementById('dailyChart').getContext('2d');
  const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
  const pieCtx = document.getElementById('completionPie').getContext('2d');

  const dailyLabels = Object.keys(dailyProgress).sort((a, b) => new Date(a) - new Date(b));
  const dailyData = dailyLabels.map(date => dailyProgress[date] || 0);

  const weeklyLabels = Object.keys(weeklyProgress).sort((a, b) => a - b).map(weekNum => 'Week ' + weekNum);
  const weeklyData = weeklyLabels.map(label => {
    const weekNum = parseInt(label.replace('Week ', ''), 10);
    return weeklyProgress[weekNum] || 0;
  });

  new Chart(dailyCtx, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: 'Topics Completed',
        data: dailyData,
        borderColor: '#a87bff',
        backgroundColor: 'rgba(124, 58, 237, 0.3)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: '#ddd' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#ddd' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });

  new Chart(weeklyCtx, {
    type: 'bar',
    data: {
      labels: weeklyLabels,
      datasets: [{
        label: 'Topics Completed',
        data: weeklyData,
        backgroundColor: '#7c3aed',
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: '#ddd' },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#ddd' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });

  new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [completedTopics, pendingTopics],
        backgroundColor: ['#7c3aed', 'rgba(124, 58, 237, 0.3)'],
        hoverOffset: 30,
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff', font: { weight: 'bold' } } },
        tooltip: { enabled: true }
      },
      cutout: '70%',
    }
  });
  const earnedBadges = [];

if (progressPercent >= 10) earnedBadges.push({ icon: "🏁", label: "Getting Started" });
if (progressPercent >= 50) earnedBadges.push({ icon: "⏩", label: "Halfway There" });
if (progressPercent >= 75) earnedBadges.push({ icon: "🎯", label: "75% Complete" });
if (progressPercent === 100) earnedBadges.push({ icon: "🏆", label: "All Done!" });
if (completedTopics >= 10) earnedBadges.push({ icon: "🔥", label: "10+ Topics" });
if (completedTopics >= 25) earnedBadges.push({ icon: "🚀", label: "25+ Topics" });


  const badgesContainer = document.getElementById("badgesContainer");

if (badgesContainer) {
  if (earnedBadges.length > 0) {
    badgesContainer.innerHTML = earnedBadges.map(badge => `
      <div class="badge" title="${badge.label}">
        <span class="badge-icon">${badge.icon}</span> ${badge.label}
      </div>
    `).join('');
  } else {
    badgesContainer.innerHTML = `<p>No badges earned yet. Keep going! 💪</p>`;
  }
}
// Feedback generation
const feedbackMessage = document.getElementById("feedbackMessage");
let feedbackText = "";

if (progressPercent === 0) {
  feedbackText = "You haven’t started yet. Let’s make today count! 🚀";
} else if (progressPercent < 25) {
  feedbackText = "Good start! Keep the momentum going. 💪";
} else if (progressPercent < 50) {
  feedbackText = "You’re making progress. Stay consistent! 📈";
} else if (progressPercent < 75) {
  feedbackText = "You’re more than halfway there. Great job! 🏃‍♂️";
} else if (progressPercent < 100) {
  feedbackText = "Almost there! Don’t lose focus now. 🎯";
} else {
  feedbackText = "🎉 Incredible! You’ve completed everything. Time to celebrate!";
}

if (feedbackMessage) {
  feedbackMessage.textContent = feedbackText;
}



  

});

