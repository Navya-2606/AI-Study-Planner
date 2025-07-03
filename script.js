// Toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

// Hover sound
const hoverSound = document.getElementById("hoverSound");
document.querySelectorAll("button, .nav li a").forEach(el => {
  el.addEventListener("mouseenter", () => {
    hoverSound.currentTime = 0;
    hoverSound.play();
  });
});

console.log("Dashboard loaded successfully!");

// Scroll reveal cards
const cards = document.querySelectorAll('.card');

function revealOnScroll() {
  const triggerBottom = window.innerHeight * 0.9;
  cards.forEach(card => {
    const cardTop = card.getBoundingClientRect().top;
    if (cardTop < triggerBottom) {
      card.classList.add('reveal');
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
revealOnScroll(); // call once on load

// Save only timetable (not input form)
function saveTimetable(name) {
  const timetable = document.getElementById('timetable'); // timetable grid
  const timetableHTML = timetable.innerHTML; // only inner HTML
  const savedPlans = JSON.parse(localStorage.getItem("savedPlans") || "{}");
  
  savedPlans[name] = { table: timetableHTML };
  localStorage.setItem("savedPlans", JSON.stringify(savedPlans));
}

// Load saved timetables list
function loadSavedTimetables() {
  const savedPlans = JSON.parse(localStorage.getItem("savedPlans") || "{}");
  const savedTimetablesList = document.getElementById("savedTimetablesList");
  savedTimetablesList.innerHTML = "";

  if (Object.keys(savedPlans).length === 0) {
    savedTimetablesList.innerHTML = "<p>No saved timetables yet!</p>";
    return;
  }

  for (const [name, plan] of Object.entries(savedPlans)) {
    const li = document.createElement("li");
    li.style.marginBottom = "10px";

    const btn = document.createElement("button");
    btn.textContent = name;
    btn.style.backgroundColor = "#6a0dad";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "10px 15px";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.fontWeight = "bold";

    btn.addEventListener("click", () => {
      localStorage.setItem("selectedStudyPlan", JSON.stringify(plan));
      window.location.href = "index1.html";
    });

    li.appendChild(btn);
    savedTimetablesList.appendChild(li);
  }
}

// Load selected timetable into timetable page
function loadSelectedTimetable() {
  const selectedPlan = JSON.parse(localStorage.getItem("selectedStudyPlan") || "{}");
  if (selectedPlan && selectedPlan.table) {
    const timetable = document.getElementById('timetable');
    timetable.innerHTML = selectedPlan.table;

    // Hide input form if exists
    const inputForm = document.getElementById('inputForm');
    if (inputForm) inputForm.style.display = 'none';
  }
}

// Track resource access - stores only 3 most recent
function trackResourceAccess(topic, subtopic = null) {
  let recentResources = JSON.parse(localStorage.getItem("recentResources") || "[]");
  
  // Remove if already exists
  recentResources = recentResources.filter(res => 
    !(res.topic === topic && res.subtopic === subtopic)
  );
  
  // Add to beginning
  recentResources.unshift({
    topic: topic,
    subtopic: subtopic,
    timestamp: new Date().getTime()
  });
  
  // Keep only last 3
  if (recentResources.length > 3) {
    recentResources = recentResources.slice(0, 3);
  }
  
  localStorage.setItem("recentResources", JSON.stringify(recentResources));
}

// Display recent resources with dynamic redirect
function displayRecentResources() {
  const recentResourcesList = document.getElementById("recentResourcesList");
  if (!recentResourcesList) return;
  
  const recentResources = JSON.parse(localStorage.getItem("recentResources") || "[]");
  recentResourcesList.innerHTML = "";
  
  if (recentResources.length === 0) {
    recentResourcesList.innerHTML = "<p>No recently accessed resources</p>";
    return;
  }
  
  recentResources.forEach(res => {
    const li = document.createElement("li");
    li.style.marginBottom = "10px";
    
    const btn = document.createElement("button");
    btn.textContent = res.subtopic ? `${res.topic} - ${res.subtopic}` : res.topic;
    btn.style.backgroundColor = "#6a0dad";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "10px 15px";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    
    btn.addEventListener("click", () => {
      // Store the resource we're about to visit
      trackResourceAccess(res.topic, res.subtopic);
      
      // Store the target resource to be loaded
      localStorage.setItem("targetResource", JSON.stringify({
        topic: res.topic,
        subtopic: res.subtopic
      }));
      
      // Redirect to resources page
      window.location.href = "resources.html";
    });
    
    li.appendChild(btn);
    recentResourcesList.appendChild(li);
  });
}

// Load target resource on resources page
function loadTargetResource() {
  const targetResource = JSON.parse(localStorage.getItem("targetResource"));
  if (!targetResource) return;
  
  // Clear the target resource after loading
  localStorage.removeItem("targetResource");
  
  const { topic, subtopic } = targetResource;
  
  // Show the main topic section
  showResources(topic);
  
  // If there's a subtopic, show it after a small delay
  if (subtopic) {
    setTimeout(() => {
      if (topic === 'coding') {
        showCodingTopic(subtopic);
      } else if (topic === 'maths') {
        showMathsTopic(subtopic);
      } else if (topic === 'languages') {
        showContent(subtopic);
      }
    }, 100);
  }
}

// Run right things on page load
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("savedTimetablesList")) {
    loadSavedTimetables();
  }
  if (document.getElementById("timetable")) {
    loadSelectedTimetable();
  }
  if (document.getElementById("recentResourcesList")) {
    displayRecentResources();
  }
  if (window.location.pathname.includes("resources.html")) {
    loadTargetResource();
  }
});