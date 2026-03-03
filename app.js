let content = null;
let currentModule = null;
let currentChapter = null;
let currentQuestionIndex = 0;
let helpLevelUsed = "none";

const app = document.getElementById("app");

async function loadContent() {
  const res = await fetch("content.json");
  content = await res.json();
  showHome();
}

function showHome() {
  app.innerHTML = `
    <h1>Welcome Ani!</h1>
    <div class="quote-box">${getRandomHomeQuote()}</div>
    <button onclick="showModules()">Start Practicing</button>
    <button onclick="showProgress()">View Progress</button>
    <button onclick="masterReset()">Master Reset</button>
  `;
}

function getRandomHomeQuote() {
  const q = content.homeQuotes;
  return q[Math.floor(Math.random() * q.length)];
}

function showModules() {
  app.innerHTML = `<h2>Select a Module</h2>`;
  content.modules.forEach(m => {
    const div = document.createElement("div");
    div.className = "module-card";
    div.innerHTML = `<strong>${m.title}</strong>`;
    div.onclick = () => showChapters(m);
    app.appendChild(div);
  });
}

function showChapters(module) {
  currentModule = module;
  app.innerHTML = `<h2>${module.title}</h2>`;
  module.chapters.forEach(ch => {
    const div = document.createElement("div");
    div.className = "chapter-card";
    div.innerHTML = `<strong>${ch.title}</strong>`;
    div.onclick = () => showChapterIntro(ch);
    app.appendChild(div);
  });
}

function showChapterIntro(chapter) {
  currentChapter = chapter;
  currentQuestionIndex = 0;
  app.innerHTML = `
    <h2>${chapter.title}</h2>
    <div class="quote-box">${chapter.introQuote}</div>
    <button onclick="startQuestions()">Let's Begin</button>
  `;
}

function startQuestions() {
  showQuestion();
}

function showProgressBar() {
  const total = currentChapter.questions.length;
  const current = currentQuestionIndex;
  const percent = Math.floor((current / total) * 100);

  return `
    <div class="progress-container">
      <div class="progress-bar" style="width:${percent}%"></div>
    </div>
  `;
}

function showQuestion() {
  const q = currentChapter.questions[currentQuestionIndex];
  helpLevelUsed = "none";

  app.innerHTML = `
    <h2>${currentChapter.title}</h2>

    ${showProgressBar()}

    <p><strong>Question ${currentQuestionIndex + 1} of ${currentChapter.questions.length}</strong></p>
    <p>${q.questionText}</p>

    ${q.choices.map((c, i) => `
      <div class="choice" onclick="submitAnswer(${i})">${c}</div>
    `).join("")}

    <button onclick="showHint()">Hint</button>
    <button onclick="showHelp()">Help</button>
    <button onclick="showSolution()">Solve</button>
  `;
}

function showHint() {
  helpLevelUsed = helpLevelUsed === "none" ? "hint" : helpLevelUsed;
  alert(currentChapter.questions[currentQuestionIndex].hint);
}

function showHelp() {
  helpLevelUsed = (helpLevelUsed === "none" || helpLevelUsed === "hint") ? "help" : helpLevelUsed;
  alert(currentChapter.questions[currentQuestionIndex].help);
}

function showSolution() {
  helpLevelUsed = "solve";
  alert(currentChapter.questions[currentQuestionIndex].solution);
}

function submitAnswer(choiceIndex) {
  const q = currentChapter.questions[currentQuestionIndex];
  const correct = q.correctIndex === choiceIndex;

  let score = 0;

  if (correct) {
    if (helpLevelUsed === "none") score = 10;
    else if (helpLevelUsed === "hint") score = 8;
    else if (helpLevelUsed === "help") score = 5;
    else if (helpLevelUsed === "solve") score = 0;
  } else {
    score = 0;
  }

  saveScore(currentChapter.id, q.id, score);

  showFeedback(correct);
}

function showFeedback(correct) {
  const message = correct ? "Correct! Great job!" : "Incorrect. Keep trying!";
  const color = correct ? "green" : "red";

  app.innerHTML += `
    <div class="feedback" style="color:${color}; font-weight:bold; margin-top:20px;">
      ${message}
    </div>
    <button onclick="nextQuestion()" style="margin-top:20px;">Next</button>
  `;
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= currentChapter.questions.length) {
    showChapterSummary();
  } else {
    showQuestion();
  }
}

function saveScore(chapterId, questionId, score) {
  const key = "ani-progress";
  let data = JSON.parse(localStorage.getItem(key) || "{}");

  if (!data[chapterId]) data[chapterId] = {};
  data[chapterId][questionId] = Math.max(data[chapterId][questionId] || 0, score);

  localStorage.setItem(key, JSON.stringify(data));
}

function showChapterSummary() {
  const key = "ani-progress";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  const chapterScores = data[currentChapter.id] || {};

  const scores = Object.values(chapterScores);
  const total = scores.reduce((a, b) => a + b, 0);
  const avg = (total / currentChapter.questions.length).toFixed(2);

  app.innerHTML = `
    <h2>${currentChapter.title} — Summary</h2>
    <div class="score-box">
      <p><strong>Total Score:</strong> ${total}</p>
      <p><strong>Average Score:</strong> ${avg}</p>
    </div>
    <button onclick="resetChapter()">Reset This Chapter</button>
    <button onclick="showModules()">Back to Modules</button>
  `;
}

function resetChapter() {
  if (!confirm("Reset this chapter?")) return;

  const key = "ani-progress";
  let data = JSON.parse(localStorage.getItem(key) || "{}");
  delete data[currentChapter.id];
  localStorage.setItem(key, JSON.stringify(data));

  showChapters(currentModule);
}

function masterReset() {
  if (!confirm("This will erase ALL progress. Continue?")) return;
  localStorage.clear();
  alert("All progress cleared.");
  showHome();
}

function showProgress() {
  const key = "ani-progress";
  const data = JSON.parse(localStorage.getItem(key) || "{}");

  app.innerHTML = `<h2>Progress</h2>`;

  content.modules.forEach(m => {
    const h = document.createElement("h3");
    h.textContent = m.title;
    app.appendChild(h);

    m.chapters.forEach(ch => {
      const scores = data[ch.id] ? Object.values(data[ch.id]) : [];
      const total = scores.reduce((a, b) => a + b, 0);
      const avg = scores.length ? (total / ch.questions.length).toFixed(2) : "0.00";

      const div = document.createElement("div");
      div.className = "chapter-card";
      div.innerHTML = `<strong>${ch.title}</strong><br>Average Score: ${avg}`;
      app.appendChild(div);
    });
  });

  const back = document.createElement("button");
  back.textContent = "Back";
  back.onclick = showHome;
  app.appendChild(back);
}

loadContent();
