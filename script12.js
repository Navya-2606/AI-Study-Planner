let currentUser = "";
let currentChat = "";
const socket = io();

const unreadCounts = {};

window.onload = async () => {
  const res = await fetch("/user");
  const data = await res.json();

  if (data.username) {
    currentUser = data.username;
    document.getElementById("currentUser").innerText = currentUser;
    renderUser(data);
    socket.emit("join", currentUser);
  }
};

socket.on("receive-message", (data) => {
  if (data.to === currentUser || data.from === currentUser) {
    if (data.from === currentChat) {
      addMessageToChat(data, false);
    } else if (data.to === currentUser) {
      unreadCounts[data.from] = (unreadCounts[data.from] || 0) + 1;
      updateFriendListUnreadBadge(data.from);
    }
  }
});

socket.on("newRequest", (fromUser) => {
  const requestsList = document.getElementById("requests");
  const li = document.createElement("li");
  li.innerHTML = `${fromUser} <button onclick="acceptRequest('${fromUser}')">Accept</button>`;
  requestsList.appendChild(li);
});

function renderUser(user) {
  const requestsList = document.getElementById("requests");
  const friendsList = document.getElementById("friends");
  requestsList.innerHTML = "";
  friendsList.innerHTML = "";

  user.requests.forEach(req => {
    const li = document.createElement("li");
    li.innerHTML = `${req} <button onclick="acceptRequest('${req}')">Accept</button>`;
    requestsList.appendChild(li);
  });

  user.friends.forEach(friend => {
    if (!(friend in unreadCounts)) {
      unreadCounts[friend] = 0;
    }

    const li = document.createElement("li");
    li.className = "friend-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "friend-name";
    nameSpan.innerText = friend;

    const badge = document.createElement("span");
    badge.className = "unread-badge";

    li.onclick = () => loadChat(friend);
    li.appendChild(nameSpan);
    li.appendChild(badge);
    friendsList.appendChild(li);

    // ✅ Ensure the badge is updated AFTER the DOM is ready
    updateFriendListUnreadBadge(friend);
  });
}

async function sendRequest() {
  const to = document.getElementById("addUser").value;
  const res = await fetch("/send-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to })
  });

  const data = await res.json();
  alert(data.success ? "Request sent!" : data.error);
}

async function acceptRequest(from) {
  const res = await fetch("/accept-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from })
  });

  const data = await res.json();
  if (data.success) {
    const res = await fetch("/user");
    const updatedUser = await res.json();
    renderUser(updatedUser);
  }
}

async function loadChat(friend) {
  currentChat = friend;
  document.getElementById("chatWith").innerText = friend;

  unreadCounts[friend] = 0;
  updateFriendListUnreadBadge(friend);

  const res = await fetch(`/messages/${friend}`);
  const messages = await res.json();

  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = "";

  messages.forEach(msg => {
    addMessageToChat(msg, msg.from === currentUser);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

function addMessageToChat(msg, isSentByMe) {
  const chatBox = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.classList.add("message", isSentByMe ? "sent" : "received");

  const contentDiv = document.createElement("div");
  contentDiv.innerText = msg.content;
  div.appendChild(contentDiv);

  const timeDiv = document.createElement("div");
  timeDiv.classList.add("timestamp");
  const dateObj = new Date(msg.timestamp);
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHour = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
  timeDiv.innerText = `${formattedHour}:${formattedMinutes} ${ampm}`;

  div.appendChild(timeDiv);
  chatBox.appendChild(div);
}

function sendMessage() {
  const content = document.getElementById("chatInput").value;
  if (!content || !currentChat) return;

  socket.emit("send-message", {
    to: currentChat,
    content
  });

  addMessageToChat({ content, timestamp: new Date() }, true);
  const chatBox = document.getElementById("chatBox");
  chatBox.scrollTop = chatBox.scrollHeight;
  document.getElementById("chatInput").value = "";
}

function updateFriendListUnreadBadge(friend) {
  const friendsList = document.getElementById("friends");
  const items = friendsList.getElementsByClassName("friend-item");

  for (const item of items) {
    const name = item.querySelector(".friend-name").innerText;
    if (name === friend) {
      const badge = item.querySelector(".unread-badge");
      const count = unreadCounts[friend] || 0;
      if (count > 0) {
        badge.style.display = "inline-block";
        badge.innerText = count > 99 ? "99+" : count;
      } else {
        badge.style.display = "none";
        badge.innerText = "";
      }
      break;
    }
  }
}