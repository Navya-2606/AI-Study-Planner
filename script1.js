// --- DOMContentLoaded: Load selected plan if exists ---
window.addEventListener('DOMContentLoaded', () => {
  const selectedPlan = JSON.parse(localStorage.getItem("selectedStudyPlan"));
  if (selectedPlan) {
    displayTimeTable(selectedPlan);

    // Hide elements not needed when displaying selected plan
    const elementsToHide = [
      "summary",
      "timetableForm",
      "savedTimetables",
      "downloadPdfBtn",
      "saveBtnContainer"
    ];
    elementsToHide.forEach(id => document.getElementById(id).style.display = "none");

    // Hide first two divs after header
    const divs = document.querySelectorAll('div');
    if (divs.length > 3) {
      divs[1].style.display = "none";
      divs[2].style.display = "none";
    }

    localStorage.removeItem("selectedStudyPlan");
  }

  displaySavedTimetables();
});

// --- Form Submission ---
document.getElementById('timetableForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const daysLeft = parseInt(document.getElementById('daysLeft').value);
  const topicsPriority = document.getElementById('topicsPriority').value.split(',').map(item => item.trim());
  const difficultyLevels = document.getElementById('difficulty').value.split(',').map(item => item.trim());
  const studyHoursPerDay = parseInt(document.getElementById('studyHoursPerDay').value);

  if (topicsPriority.length !== difficultyLevels.length) {
    alert('Number of topics and difficulty levels must match!');
    return;
  }

  const topicDetails = topicsPriority.map((topic, i) => ({
    topic,
    level: difficultyLevels[i].toLowerCase(),
    difficultyScore:
      difficultyLevels[i].toLowerCase() === 'easy' ? 1 :
      difficultyLevels[i].toLowerCase() === 'medium' ? 2 : 3
  }));

  const studyPlan = generateStudyPlan(topicDetails, daysLeft, studyHoursPerDay);
  displaySummary(daysLeft, studyHoursPerDay, topicsPriority.length);
  displayTimeTable(studyPlan);
});

// --- Generate Study Plan ---
function generateStudyPlan(topicDetails, days, studyHoursPerDay) {
  const totalStudyMinutes = days * studyHoursPerDay * 60;
  topicDetails.sort((a, b) => b.difficultyScore - a.difficultyScore);

  const minutesPerTopic = allocateStudyTime(topicDetails, totalStudyMinutes * 0.6);
  const today = new Date();
  const studyPlans = [];
  const topicsCompleted = [];
  let topicQueue = topicDetails.map((topic, i) => ({
    ...topic,
    minutes: minutesPerTopic[i]
  }));

  // Study Phase
  while (topicQueue.length > 0) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() + studyPlans.length);

    let remainingMinutes = studyHoursPerDay * 60;
    const dailyTopics = [];

    while (remainingMinutes > 0 && topicQueue.length > 0) {
      let currentTopic = topicQueue[0];
      const assignMinutes = Math.min(currentTopic.minutes, remainingMinutes);

      dailyTopics.push({
        topic: currentTopic.topic,
        level: currentTopic.level,
        time: roundMinutes(assignMinutes),
        completed: false // ⬅️ NEW
      });

      remainingMinutes -= roundMinutes(assignMinutes);
      currentTopic.minutes -= assignMinutes;

      if (currentTopic.minutes <= 0) {
        topicsCompleted.push(currentTopic.topic);
        topicQueue.shift();
      } else {
        break;
      }
    }

    studyPlans.push({
      day: formatDate(dayDate),
      topics: dailyTopics
    });
  }

  // Revision Phase
  let usedDays = studyPlans.length;
  let remainingDays = days - usedDays;

  if (remainingDays > 0 && topicsCompleted.length > 0) {
    const revisionTopicsPerDay = Math.ceil(topicsCompleted.length / remainingDays);
    let revIndex = 0;

    for (let r = 0; r < remainingDays; r++) {
      const revisionToday = [];
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + studyPlans.length);

      for (let j = 0; j < revisionTopicsPerDay && revIndex < topicsCompleted.length; j++, revIndex++) {
        revisionToday.push({
          topic: `Revise: ${topicsCompleted[revIndex]}`,
          level: 'revision',
          time: Math.floor((studyHoursPerDay * 60) / revisionTopicsPerDay),
          completed: false // ⬅️ NEW
        });
      }

      studyPlans.push({
        day: formatDate(targetDate),
        topics: revisionToday
      });
    }
  }

  localStorage.setItem("lastStudyPlan", JSON.stringify(studyPlans));

  // ⬇️ NEW: Save to allTimetables
  const allTimetables = JSON.parse(localStorage.getItem("allTimetables") || "[]");
  allTimetables.push(studyPlans);
  localStorage.setItem("allTimetables", JSON.stringify(allTimetables));

  return studyPlans;
}

// --- Display Time Table ---
function displayTimeTable(plan) {
  const tbody = document.querySelector("#timeTableData tbody");
  tbody.innerHTML = "";
  document.getElementById("saveBtnContainer").innerHTML = "";

  // Generate a consistent identifier based on the plan content
  const planString = JSON.stringify(plan);
  let hash = 0;
  for (let i = 0; i < planString.length; i++) {
    const char = planString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const timetableId = 'timetable-' + Math.abs(hash).toString(16);

  plan.forEach((day, dayIndex) => {
    const row = document.createElement("tr");

    const dayCell = document.createElement("td");
    dayCell.textContent = day.day;
    row.appendChild(dayCell);

    const topicsCell = document.createElement("td");
    const timeCell = document.createElement("td");

    day.topics.forEach((topicObj, topicIndex) => {
      const topicId = `${timetableId}-day${dayIndex}-topic${topicIndex}`;
      const isCompleted = localStorage.getItem(`progress-${topicId}`) === "true";

      const wrapper = document.createElement("div");
      const shortLevel = topicObj.level === 'easy' ? 'e' :
                         topicObj.level === 'medium' ? 'm' :
                         topicObj.level === 'hard' ? 'h' : 'r';
      wrapper.classList.add("topic-item", `difficulty-${shortLevel}`);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = topicId;
      checkbox.checked = isCompleted;

      const label = document.createElement("label");
      label.setAttribute("for", topicId);
      label.innerHTML = `${topicObj.topic} (${topicObj.level.toUpperCase()})`;

      const status = document.createElement("span");
      status.innerHTML = isCompleted ? "✅" : "🕓";
      status.style.color = isCompleted ? "green" : "crimson";

      if (isCompleted) {
        label.style.textDecoration = "line-through";
        label.style.color = "gray";
      }

      checkbox.addEventListener("change", () => {
  localStorage.setItem(`progress-${topicId}`, checkbox.checked);
  status.innerHTML = checkbox.checked ? "✅" : "🕓";
  status.style.color = checkbox.checked ? "green" : "crimson";
  label.style.textDecoration = checkbox.checked ? "line-through" : "none";
  label.style.color = checkbox.checked ? "gray" : "";

  // ✅ Update in allTimetables
  const allTimetables = JSON.parse(localStorage.getItem("allTimetables") || "[]");
  const latestTimetable = allTimetables[allTimetables.length - 1];
  if (
    latestTimetable &&
    latestTimetable[dayIndex] &&
    latestTimetable[dayIndex].topics[topicIndex]
  ) {
    latestTimetable[dayIndex].topics[topicIndex].completed = checkbox.checked;
    localStorage.setItem("allTimetables", JSON.stringify(allTimetables));
  }
});


      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      wrapper.appendChild(status);
      topicsCell.appendChild(wrapper);

      const timeInfo = document.createElement("div");
      timeInfo.textContent = formatTime(topicObj.time);
      timeCell.appendChild(timeInfo);
    });

    row.appendChild(topicsCell);
    row.appendChild(timeCell);
    tbody.appendChild(row);
  });

  addSaveButton();
  enableRightClickEditing();
}

// --- Save Button ---
function addSaveButton() {
  const container = document.getElementById("saveBtnContainer");
  container.innerHTML = "";

  const saveButton = document.createElement("button");
  saveButton.textContent = "💾 Save Time Table";
  Object.assign(saveButton.style, {
    marginTop: "20px",
    width: "100%",
    backgroundColor: "#8e44ad",
    borderRadius: "10px",
    padding: "14px",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.3s ease, transform 0.2s ease"
  });

  saveButton.addEventListener("mouseenter", () => {
    saveButton.style.backgroundColor = "#6a0dad";
    saveButton.style.transform = "translateY(-2px)";
  });

  saveButton.addEventListener("mouseleave", () => {
    saveButton.style.backgroundColor = "#8e44ad";
    saveButton.style.transform = "translateY(0)";
  });

  saveButton.addEventListener("click", () => {
    const filename = prompt("Enter a name for your Time Table:");
    if (filename) {
      const existingPlans = JSON.parse(localStorage.getItem("savedPlans") || "{}");
      const lastPlan = JSON.parse(localStorage.getItem("lastStudyPlan") || "[]");
      existingPlans[filename] = lastPlan;
      localStorage.setItem("savedPlans", JSON.stringify(existingPlans));
      alert(`✅ Saved as "${filename}"!`);
      displaySavedTimetables();
    }
  });

  container.appendChild(saveButton);
}

// --- Enable Editing Topic Names ---
function enableRightClickEditing() {
  const labels = document.querySelectorAll("#timeTableData tbody .topic-item label");

  labels.forEach(label => {
    label.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      label.setAttribute("contenteditable", "true");
      Object.assign(label.style, {
        backgroundColor: "#fff5f5",
        border: "1px dashed #6a0dad",
        padding: "4px"
      });
      label.focus();
      alert("✏ You can now edit the topic! Press Enter after editing to save.");

      label.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          label.setAttribute("contenteditable", "false");
          label.style = "";
          alert("✅ Topic updated!");
        }
      }, { once: true });
    });
  });
}

// --- Display Summary Info ---
function displaySummary(days, hours, totalTopics) {
  const summaryBox = document.getElementById("summary");
  summaryBox.innerHTML = `
    📝 <strong>Summary:</strong><br>
    📆 Total Days: <strong>${days}</strong><br>
    ⏰ Hours/Day: <strong>${hours} hrs</strong><br>
    📚 Total Topics: <strong>${totalTopics}</strong>
  `;
}

// --- Display Saved Timetables ---
function displaySavedTimetables() {
  const savedContainer = document.getElementById("savedTimetables");
  const savedPlans = JSON.parse(localStorage.getItem("savedPlans") || "{}");
  savedContainer.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "📚 Saved Time Tables";
  title.style.color = "#6a0dad";
  savedContainer.appendChild(title);

  if (Object.keys(savedPlans).length === 0) {
    savedContainer.innerHTML += "<p>No Saved Time Tables Yet!</p>";
    return;
  }

  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.padding = "0";

  for (const [name, plan] of Object.entries(savedPlans)) {
    const listItem = document.createElement("li");
    Object.assign(listItem.style, {
      marginBottom: "10px",
      display: "flex",
      alignItems: "center",
      gap: "10px"
    });

    const btn = document.createElement("button");
    btn.textContent = name;
    Object.assign(btn.style, {
      backgroundColor: "#8e44ad",
      color: "white",
      border: "none",
      padding: "10px 15px",
      borderRadius: "8px",
      cursor: "pointer",
      flexGrow: "1",
      textAlign: "left",
      fontWeight: "bold"
    });

    btn.addEventListener("click", () => {
      displayTimeTable(plan);
      document.getElementById("summary").innerHTML = "";
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑";
    Object.assign(deleteBtn.style, {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: "24px",
      color: "crimson"
    });

    deleteBtn.addEventListener("click", () => {
      if (confirm(`🗑 Are you sure you want to delete "${name}"?`)) {
        delete savedPlans[name];
        localStorage.setItem("savedPlans", JSON.stringify(savedPlans));
        alert(`Deleted "${name}" successfully! 🚀`);
        displaySavedTimetables();
      }
    });

    listItem.appendChild(btn);
    listItem.appendChild(deleteBtn);
    list.appendChild(listItem);
  }

  savedContainer.appendChild(list);
}

// --- Utilities ---
function formatDate(date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function allocateStudyTime(topicDetails, totalMinutes) {
  const totalScore = topicDetails.reduce((sum, t) => sum + t.difficultyScore, 0);
  return topicDetails.map(topic => Math.round((totalMinutes * topic.difficultyScore) / totalScore));
}

function roundMinutes(minutes) {
  if (minutes <= 45) return 30;
  if (minutes <= 90) return 60;
  if (minutes <= 135) return 90;
  if (minutes <= 180) return 120;
  return minutes;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} hr ${m} min` :
         h ? `${h} hr${h > 1 ? 's' : ''}` :
         `${m} min`;
}
// When generating a new timetable
let newTimetable = [ /* your generated timetable data */ ];

let existingTimetables = JSON.parse(localStorage.getItem("allTimetables")) || [];
existingTimetables.push(newTimetable);
localStorage.setItem("allTimetables", JSON.stringify(existingTimetables));
function toggleTopicCompletion(dayIndex, topicIndex) {
  const allTimetables = JSON.parse(localStorage.getItem("allTimetables")) || [];
  allTimetables[allTimetables.length - 1][dayIndex][topicIndex].completed = 
    !allTimetables[allTimetables.length - 1][dayIndex][topicIndex].completed;
  localStorage.setItem("allTimetables", JSON.stringify(allTimetables));
}
