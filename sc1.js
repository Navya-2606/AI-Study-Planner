document.addEventListener("DOMContentLoaded", () => {
    
        const supportBtn = document.querySelector('.support-btn');
        const chatPopup = document.getElementById('chatPopup');
        const closeChatBtn = document.getElementById('closeChatBtn');
        const sendBtn = document.getElementById('sendBtn');
        const userInput = document.getElementById('userInput');
        const chatBody = document.getElementById('chatBody');
      
        // Toggle Chat Popup
        supportBtn.addEventListener('click', () => {
          chatPopup.classList.add('show');
          chatPopup.classList.remove('hidden');
        });
      
        closeChatBtn.addEventListener('click', () => {
          chatPopup.classList.add('hidden');
          chatPopup.classList.remove('show');
        });
      
        sendBtn.addEventListener('click', () => {
          const userText = userInput.value.trim();
          if (userText !== "") {
            addUserMessage(userText);
            setTimeout(() => {
              addBotMessage(generateBotReply(userText));
            }, 500); // simulate bot typing delay
            userInput.value = "";
          }
        });
      
        function addUserMessage(text) {
          const message = document.createElement('div');
          message.classList.add('user-message');
          message.textContent = text;
          chatBody.appendChild(message);
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      
        function addBotMessage(text) {
          const message = document.createElement('div');
          message.classList.add('bot-message');
          message.textContent = text;
          chatBody.appendChild(message);
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      
        function generateBotReply(userText) {
          const faqs = [
            { question: ["hello", "hi", "hey"], answer: "Hello! 👋 How can I assist you today?" },
            { question: ["upload file", "upload notes", "how to upload"], answer: "You can upload your study material using the 'Create a Study Set' section 📚." },
            { question: ["start quiz", "quiz", "take quiz"], answer: "To start a quiz, head over to the 'Interactive Quizzes' section 🧠." },
            { question: ["flashcard", "static flashcards", "dynamic flashcards"], answer: "You can choose between Static or Dynamic Flashcards based on your preference! 📖" },
            { question: ["progress", "track progress", "my progress"], answer: "You can track your progress easily in the 'Insights' section 📈." },
            { question: ["bye", "goodbye", "see you"], answer: "Goodbye! 👋 Happy studying and good luck!" }
          ];
      
          const userInput = userText.toLowerCase();
      
          for (const faq of faqs) {
            for (const keyword of faq.question) {
              if (userInput.includes(keyword)) {
                return faq.answer;
              }
            }
          }
      
          return "I'm still learning 🤖! Could you please rephrase your question?";
        }
    
      
    console.log("Study Fetch Clone Loaded ✅");

    // Text rotation animation
    const words = ["notes", "quizzes", "recommendations", "flashcards"];
    let index = 0;
    const changingWord = document.querySelector(".changing-word");

    function rotateText() {
        changingWord.classList.add("fade-out");
        setTimeout(() => {
            changingWord.textContent = words[index];
            changingWord.classList.remove("fade-out");
            changingWord.classList.add("fade-in");
            setTimeout(() => changingWord.classList.remove("fade-in"), 500);
            index = (index + 1) % words.length;
        }, 300);
    }

    setInterval(rotateText, 2500);
    changingWord.textContent = words[0];

    // Upload box interaction
    const uploadBox = document.querySelector('.upload-box');
    uploadBox.addEventListener('click', () => {
        alert('Upload your files here. (Feature coming soon!)');
    });

    // Hover effects on buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
    });

    // Tilt effect on cards
    const cards = document.querySelectorAll('.feature-card, .stat-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.transform = `perspective(600px) rotateY(${(x - rect.width/2)/20}deg) rotateX(${-(y - rect.height/2)/20}deg) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
        });
    });

    // Insights button
    const insightsBtn = document.querySelector('.insights-btn');
    insightsBtn.addEventListener('click', () => {
        alert('View detailed insights and analytics!');
    });

    // Login and Signup Redirection
    document.querySelector(".login-btn")?.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    document.querySelector(".signup-btn")?.addEventListener("click", () => {
        window.location.href = "signup.html";
    });

    // Loader animation (optional if you have a loading screen)
    window.addEventListener("load", () => {
        const loader = document.getElementById('loader-wrapper');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    });

   
});
