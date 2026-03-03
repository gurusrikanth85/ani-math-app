let content = null;              // holds homeQuotes + module metadata from content.json
let modulesCache = {};           // cache for loaded module files (module1.json, module2.json, etc.)
let currentModule = null;
let currentModuleIndex = null;
let currentChapter = null;
let currentQuestionIndex = 0;
let helpLevelUsed = "none";
let questionLocked = false;

const app = document.getElementById("app");

// Load top-level content: homeQuotes + module list (metadata only)
async function loadContent() {
  const res = await fetch("content.json");
  content = await res.json();
  showHome();
}

// Load a specific module file from content/moduleX.json
async function loadModuleByIndex(moduleIndex) {
  // moduleIndex: 0 -> module1.json, 1 -> module2.json, etc.
  if (modulesCache[moduleIndex]) {
    return modulesCache[moduleIndex];
  }

  const fileName = `content/module${moduleIndex + 1}.json`;
  const response = await fetch(fileName);

  if (!response.ok) {
    console.error("Failed to load module file:", fileName, response.status);
    throw new Error("Could not load module file " + fileName);
  }

  const moduleData = await response.json();
  modulesCache[moduleIndex] = moduleData;
  return moduleData;
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
  content.modules.forEach((m, index) => {
    const div = document.createElement("div");
    div.className = "module-card";
    div.innerHTML = `<strong>${m.title}</strong>`;
    div.onclick = () => showChaptersForIndex(index);
    app.appendChild(div);
  });
}

// New: show chapters for a module by index (loads moduleX.json)
async function showChaptersForIndex(moduleIndex) {
  try {
    const moduleData = await loadModuleByIndex(moduleIndex);
    currentModule = moduleData;
    currentModuleIndex = moduleIndex;

    app.innerHTML = `<h2>${moduleData.title}</h2>`;
    moduleData.chapters.forEach(ch => {
      const div = document.createElement("div");
      div.className = "chapter-card";
      div.innerHTML = `<strong>${ch.title}</strong>`;
      div.onclick = () => showChapterIntro(ch);
      app.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    app.innerHTML = `<h2>Error loading module. Please try again.</h2>`;
  }
}

function showChapterIntro(chapter) {
  currentChapter = chapter;
  currentQuestionIndex = 0;
  app.innerHTML = `
    <h2>${chapter.title}</h2>
    <div class="quote-box">${chapter.introQuote || ""}</div>
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
  questionLocked = false;

  app.innerHTML = `
    <h2>${currentChapter.title}</h2>

    ${showProgressBar()}

    <p><strong>Question ${currentQuestionIndex + 1} of ${currentChapter.questions.length}</strong></p>
    <p>${q.questionText}</p>

    ${q.choices.map((c, i) => `
      <div class="choice" id="choice-${i}" onclick="submitAnswer(${i})">${c}</div>
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
  if (questionLocked) return;
  questionLocked = true;

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

  lockChoices();
  showFeedback(correct);
}

function lockChoices() {
  document.querySelectorAll(".choice").forEach(c => {
    c.style.pointerEvents = "none";
    c.style.opacity = "0.6";
  });
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
