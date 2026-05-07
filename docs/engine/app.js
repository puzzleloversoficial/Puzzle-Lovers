const ENGINE_CONFIG = {
  activitiesTable: "puzzle_activities",
  rankingsTable: "puzzle_rankings",
  audioBucket: "puzzle-audio",
  ...(window.PUZZLE_ENGINE_CONFIG || {}),
};

const STORAGE_KEYS = {
  activities: "neo-puzzle-engine:activities",
  rankings: "neo-puzzle-engine:rankings",
  lastActivityId: "neo-puzzle-engine:last-activity-id",
};

const DEFAULTS = {
  lives: 3,
  timePerQuestion: 30,
};

const state = {
  activeTab: "editor-panel",
  editor: createEmptyEditorState(),
  lastSavedActivity: null,
  loadedActivity: null,
  leaderboard: [],
  game: null,
};

let elements = {};
let store;

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  store = new PuzzleStore(ENGINE_CONFIG);
  hydrateEditorForm();
  bindTabs();
  bindEditor();
  bindPlayer();
  updateStorageUI();
  renderQuestions();
  renderJsonPreview();

  const activityFromQuery = new URLSearchParams(window.location.search).get("activity");
  if (activityFromQuery) {
    elements.playerActivityId.value = activityFromQuery;
    activateTab("player-panel");
    loadActivityById(activityFromQuery, { autostart: false });
  }
});

function cacheElements() {
  elements = {
    tabButtons: Array.from(document.querySelectorAll("[data-tab-target]")),
    tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
    editorForm: document.getElementById("editor-form"),
    editorStatus: document.getElementById("editor-status"),
    questionList: document.getElementById("question-list"),
    addQuestionBtn: document.getElementById("add-question-btn"),
    loadDemoBtn: document.getElementById("load-demo-btn"),
    resetEditorBtn: document.getElementById("reset-editor-btn"),
    activityTitle: document.getElementById("activity-title"),
    activityCategory: document.getElementById("activity-category"),
    activityLives: document.getElementById("activity-lives"),
    activityTimer: document.getElementById("activity-timer"),
    activityDescription: document.getElementById("activity-description"),
    activityIdOutput: document.getElementById("activity-id-output"),
    activityLinkOutput: document.getElementById("activity-link-output"),
    copyActivityLinkBtn: document.getElementById("copy-activity-link-btn"),
    storageModePill: document.getElementById("storage-mode-pill"),
    storageModeCopy: document.getElementById("storage-mode-copy"),
    storageModeDetail: document.getElementById("storage-mode-detail"),
    jsonPreview: document.getElementById("json-preview"),
    playerActivityId: document.getElementById("player-activity-id"),
    loadActivityBtn: document.getElementById("load-activity-btn"),
    loadLastActivityBtn: document.getElementById("load-last-activity-btn"),
    playerLoadStatus: document.getElementById("player-load-status"),
    playerStage: document.getElementById("player-stage"),
    leaderboardList: document.getElementById("leaderboard-list"),
    leaderboardSubcopy: document.getElementById("leaderboard-subcopy"),
  };
}

function bindTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tabTarget);
    });
  });
}

function activateTab(targetId) {
  state.activeTab = targetId;
  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === targetId;
    button.classList.toggle("active", isActive);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });
}

function bindEditor() {
  elements.editorForm.addEventListener("submit", handleSaveActivity);
  elements.addQuestionBtn.addEventListener("click", () => {
    state.editor.questions.push(createEmptyQuestion());
    renderQuestions();
    renderJsonPreview();
  });
  elements.loadDemoBtn.addEventListener("click", loadDemoActivity);
  elements.resetEditorBtn.addEventListener("click", resetEditorState);
  elements.copyActivityLinkBtn.addEventListener("click", copyActivityLink);

  [
    elements.activityTitle,
    elements.activityCategory,
    elements.activityLives,
    elements.activityTimer,
    elements.activityDescription,
  ].forEach((field) => {
    field.addEventListener("input", syncEditorMetaFromForm);
  });

  elements.questionList.addEventListener("input", handleQuestionInput);
  elements.questionList.addEventListener("change", handleQuestionChange);
  elements.questionList.addEventListener("click", handleQuestionClick);
}

function bindPlayer() {
  elements.loadActivityBtn.addEventListener("click", () => {
    const id = elements.playerActivityId.value.trim();
    loadActivityById(id, { autostart: false });
  });

  elements.loadLastActivityBtn.addEventListener("click", () => {
    const lastId = localStorage.getItem(STORAGE_KEYS.lastActivityId) || state.lastSavedActivity?.id;
    if (!lastId) {
      setPlayerStatus("Todavía no existe una actividad guardada para cargar.", "error");
      return;
    }

    elements.playerActivityId.value = lastId;
    loadActivityById(lastId, { autostart: false });
  });

  elements.playerStage.addEventListener("click", handlePlayerStageClick);
  elements.leaderboardList.addEventListener("submit", handleRankingSubmit);
}

function syncEditorMetaFromForm() {
  state.editor.title = elements.activityTitle.value;
  state.editor.category = elements.activityCategory.value;
  state.editor.lives = Number(elements.activityLives.value) || DEFAULTS.lives;
  state.editor.timePerQuestion = Number(elements.activityTimer.value) || DEFAULTS.timePerQuestion;
  state.editor.description = elements.activityDescription.value;
  renderJsonPreview();
}

function hydrateEditorForm() {
  elements.activityTitle.value = state.editor.title;
  elements.activityCategory.value = state.editor.category;
  elements.activityLives.value = String(state.editor.lives);
  elements.activityTimer.value = String(state.editor.timePerQuestion);
  elements.activityDescription.value = state.editor.description;
  updateActivityOutput();
}

function resetEditorState() {
  if (state.game?.timerId) {
    clearInterval(state.game.timerId);
  }

  state.editor = createEmptyEditorState();
  state.lastSavedActivity = null;
  hydrateEditorForm();
  renderQuestions();
  renderJsonPreview();
  setEditorStatus("Editor limpio y listo para empezar otra actividad.", "success");
}

function loadDemoActivity() {
  state.editor = {
    id: "",
    title: "Neo Rhythm Rush",
    category: "Friday Night Funkin'",
    description: "Demo con video, audio y ranking para probar el motor.",
    lives: 3,
    timePerQuestion: 25,
    createdAt: "",
    questions: [
      {
        id: createQuestionId(),
        prompt: "¿Qué color domina el nuevo logo de Neo Puzzle Lovers junto con el azul?",
        options: ["Verde lima", "Rosa intenso", "Naranja", "Gris"],
        correctIndex: 1,
        explanation: "El rosa-magenta es una parte clave del gradiente del logo.",
        media: {
          type: "youtube",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          embedUrl: toYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
          url: "",
          audioFileName: "",
          audioFile: null,
        },
      },
      {
        id: createQuestionId(),
        prompt: "Selecciona la afirmación correcta sobre Puzzle Engine.",
        options: [
          "Solo funciona descargando archivos a mano",
          "No admite multimedia",
          "Puede guardar actividades por ID único",
          "No tiene ranking",
        ],
        correctIndex: 2,
        explanation: "Una de las bases del motor es precisamente generar un ID único publicable.",
        media: {
          type: "none",
          youtubeUrl: "",
          embedUrl: "",
          url: "",
          audioFileName: "",
          audioFile: null,
        },
      },
    ],
  };

  hydrateEditorForm();
  renderQuestions();
  renderJsonPreview();
  setEditorStatus("Demo cargada. Puedes editarla, guardarla o lanzarla al reproductor.", "success");
}

function renderQuestions() {
  if (state.editor.questions.length === 0) {
    elements.questionList.innerHTML = `
      <div class="question-card">
        <p class="card-kicker">Sin preguntas</p>
        <h3>Tu actividad todavía está vacía</h3>
        <p>Añade la primera tarjeta para empezar a construir el desafío.</p>
      </div>
    `;
    return;
  }

  elements.questionList.innerHTML = state.editor.questions
    .map((question, index) => {
      const mediaType = question.media.type;
      const audioSummary = question.media.audioFile
        ? `Archivo seleccionado: ${escapeHtml(question.media.audioFile.name)}`
        : question.media.audioFileName
          ? `Audio guardado: ${escapeHtml(question.media.audioFileName)}`
          : question.media.url
            ? "Audio remoto listo"
            : "Ningún audio cargado";

      return `
        <article class="question-card" data-question-index="${index}">
          <div class="question-card-header">
            <div>
              <span class="question-index">${index + 1}</span>
            </div>
            <button class="ghost-btn" type="button" data-action="remove-question" data-index="${index}">Eliminar</button>
          </div>

          <div class="question-grid">
            <label class="field">
              <span>Enunciado</span>
              <textarea rows="3" data-index="${index}" data-field="prompt" placeholder="Escribe aquí la pregunta.">${escapeHtml(question.prompt)}</textarea>
            </label>

            <div class="field">
              <span>Respuesta correcta</span>
              <select data-index="${index}" data-field="correctIndex">
                ${question.options
                  .map((option, optionIndex) => `
                    <option value="${optionIndex}" ${question.correctIndex === optionIndex ? "selected" : ""}>
                      Opción ${optionIndex + 1}
                    </option>
                  `)
                  .join("")}
              </select>
            </div>
          </div>

          <div class="question-options">
            ${question.options
              .map((option, optionIndex) => `
                <label class="field">
                  <span>Opción ${optionIndex + 1}</span>
                  <input
                    type="text"
                    value="${escapeHtml(option)}"
                    data-index="${index}"
                    data-field="option-${optionIndex}"
                    placeholder="Texto de la opción ${optionIndex + 1}"
                  >
                </label>
              `)
              .join("")}
          </div>

          <label class="field field-full">
            <span>Explicación o nota de feedback</span>
            <textarea rows="2" data-index="${index}" data-field="explanation" placeholder="Mensaje que verá el jugador después de responder.">${escapeHtml(question.explanation)}</textarea>
          </label>

          <div class="question-grid">
            <label class="field">
              <span>Tipo de media</span>
              <select data-index="${index}" data-field="mediaType">
                <option value="none" ${mediaType === "none" ? "selected" : ""}>Sin media</option>
                <option value="youtube" ${mediaType === "youtube" ? "selected" : ""}>YouTube</option>
                <option value="audio" ${mediaType === "audio" ? "selected" : ""}>Audio MP3</option>
              </select>
            </label>

            ${
              mediaType === "youtube"
                ? `
                  <label class="field">
                    <span>Enlace de YouTube</span>
                    <input
                      type="url"
                      value="${escapeHtml(question.media.youtubeUrl)}"
                      data-index="${index}"
                      data-field="youtubeUrl"
                      placeholder="https://www.youtube.com/watch?v=..."
                    >
                  </label>
                `
                : `
                  <label class="field">
                    <span>Archivo de audio</span>
                    <input
                      type="file"
                      accept=".mp3,audio/mpeg"
                      data-index="${index}"
                      data-field="audioFile"
                    >
                    <span class="audio-summary">${audioSummary}</span>
                  </label>
                `
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function handleQuestionInput(event) {
  const target = event.target;
  const index = Number(target.dataset.index);
  if (!Number.isInteger(index) || !state.editor.questions[index]) {
    return;
  }

  const question = state.editor.questions[index];
  const field = target.dataset.field;

  if (field === "prompt") {
    question.prompt = target.value;
  } else if (field?.startsWith("option-")) {
    const optionIndex = Number(field.split("-")[1]);
    question.options[optionIndex] = target.value;
  } else if (field === "explanation") {
    question.explanation = target.value;
  } else if (field === "youtubeUrl") {
    question.media.youtubeUrl = target.value;
    question.media.embedUrl = toYouTubeEmbedUrl(target.value);
  }

  renderJsonPreview();
}

function handleQuestionChange(event) {
  const target = event.target;
  const index = Number(target.dataset.index);
  if (!Number.isInteger(index) || !state.editor.questions[index]) {
    return;
  }

  const question = state.editor.questions[index];
  const field = target.dataset.field;

  if (field === "correctIndex") {
    question.correctIndex = Number(target.value);
  }

  if (field === "mediaType") {
    question.media.type = target.value;
    if (target.value !== "youtube") {
      question.media.youtubeUrl = "";
      question.media.embedUrl = "";
    }
    renderQuestions();
  }

  if (field === "audioFile") {
    const [file] = target.files || [];
    question.media.audioFile = file || null;
    question.media.audioFileName = file ? file.name : question.media.audioFileName;
    renderQuestions();
  }

  renderJsonPreview();
}

function handleQuestionClick(event) {
  const button = event.target.closest("[data-action='remove-question']");
  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);
  if (!Number.isInteger(index)) {
    return;
  }

  state.editor.questions.splice(index, 1);
  renderQuestions();
  renderJsonPreview();
}

async function handleSaveActivity(event) {
  event.preventDefault();
  syncEditorMetaFromForm();
  const validation = validateEditorState();

  if (!validation.ok) {
    setEditorStatus(validation.message, "error");
    return;
  }

  const payload = buildActivityPayload();

  try {
    const result = await store.saveActivity(payload, state.editor.questions);
    state.lastSavedActivity = result.activity;
    state.editor.id = result.activity.id;
    state.editor.createdAt = result.activity.createdAt;
    localStorage.setItem(STORAGE_KEYS.lastActivityId, result.activity.id);
    updateActivityOutput();
    renderJsonPreview(result.activity);
    setEditorStatus(`Actividad guardada en modo ${result.mode}. ID: ${result.activity.id}`, "success");
    elements.playerActivityId.value = result.activity.id;
  } catch (error) {
    console.error(error);
    setEditorStatus(`No se pudo guardar la actividad: ${error.message}`, "error");
  }
}

function validateEditorState() {
  if (!state.editor.title.trim()) {
    return { ok: false, message: "El título es obligatorio." };
  }

  if (!state.editor.category.trim()) {
    return { ok: false, message: "La categoría es obligatoria." };
  }

  if (state.editor.questions.length === 0) {
    return { ok: false, message: "Añade al menos una pregunta." };
  }

  for (const [index, question] of state.editor.questions.entries()) {
    if (!question.prompt.trim()) {
      return { ok: false, message: `La pregunta ${index + 1} necesita un enunciado.` };
    }

    if (question.options.some((option) => !option.trim())) {
      return { ok: false, message: `La pregunta ${index + 1} debe tener las 4 opciones completas.` };
    }

    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      return { ok: false, message: `La pregunta ${index + 1} necesita una respuesta correcta válida.` };
    }

    if (question.media.type === "youtube" && !toYouTubeEmbedUrl(question.media.youtubeUrl)) {
      return { ok: false, message: `La pregunta ${index + 1} tiene un enlace de YouTube inválido.` };
    }
  }

  return { ok: true };
}

function buildActivityPayload() {
  const id = state.editor.id || createActivityId(state.editor.title);
  const createdAt = state.editor.createdAt || new Date().toISOString();

  return {
    id,
    title: state.editor.title.trim(),
    category: state.editor.category.trim(),
    description: state.editor.description.trim(),
    lives: state.editor.lives,
    timePerQuestion: state.editor.timePerQuestion,
    createdAt,
    updatedAt: new Date().toISOString(),
    questions: state.editor.questions.map((question) => ({
      id: question.id || createQuestionId(),
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctIndex: question.correctIndex,
      explanation: question.explanation.trim(),
      media: {
        type: question.media.type,
        youtubeUrl: question.media.youtubeUrl || "",
        embedUrl: question.media.type === "youtube" ? toYouTubeEmbedUrl(question.media.youtubeUrl) : "",
        url: question.media.url || "",
        audioFileName: question.media.audioFile?.name || question.media.audioFileName || "",
      },
    })),
  };
}

async function loadActivityById(activityId, options = {}) {
  if (!activityId.trim()) {
    setPlayerStatus("Introduce un ID para cargar una actividad.", "error");
    return;
  }

  setPlayerStatus("Buscando actividad...", "success");

  try {
    const activity = await store.getActivity(activityId.trim());
    if (!activity) {
      setPlayerStatus("No encontré ninguna actividad con ese ID.", "error");
      return;
    }

    state.loadedActivity = activity;
    localStorage.setItem(STORAGE_KEYS.lastActivityId, activity.id);
    elements.playerActivityId.value = activity.id;
    setPlayerStatus(`Actividad cargada: ${activity.title}`, "success");
    renderPlayerOverview(activity);
    await renderLeaderboard(activity.id);

    if (options.autostart) {
      startGame(activity);
    }
  } catch (error) {
    console.error(error);
    setPlayerStatus(`Error al cargar la actividad: ${error.message}`, "error");
  }
}

function renderPlayerOverview(activity) {
  elements.playerStage.innerHTML = `
    <div class="player-overview">
      <div class="player-overview-header">
        <div>
          <p class="card-kicker">Actividad lista</p>
          <h3>${escapeHtml(activity.title)}</h3>
          <p>${escapeHtml(activity.description || "Sin descripción adicional.")}</p>
        </div>
        <div class="player-overview-tags">
          <span>${escapeHtml(activity.category)}</span>
          <span>${activity.questions.length} preguntas</span>
          <span>${activity.lives} vidas</span>
        </div>
      </div>
      <div class="summary-actions">
        <button class="primary-btn" type="button" data-action="start-game">Empezar reto</button>
        <button class="ghost-btn" type="button" data-action="load-into-editor">Cargar al editor</button>
      </div>
    </div>
  `;
}

function handlePlayerStageClick(event) {
  const startButton = event.target.closest("[data-action='start-game']");
  if (startButton && state.loadedActivity) {
    startGame(state.loadedActivity);
    return;
  }

  const loadEditorButton = event.target.closest("[data-action='load-into-editor']");
  if (loadEditorButton && state.loadedActivity) {
    loadActivityIntoEditor(state.loadedActivity);
    activateTab("editor-panel");
    return;
  }

  const answerButton = event.target.closest(".answer-btn");
  if (answerButton && state.game && !state.game.locked) {
    handleAnswer(Number(answerButton.dataset.answerIndex));
  }
}

function loadActivityIntoEditor(activity) {
  state.editor = {
    id: activity.id,
    title: activity.title || "",
    category: activity.category || "",
    description: activity.description || "",
    lives: activity.lives || DEFAULTS.lives,
    timePerQuestion: activity.timePerQuestion || DEFAULTS.timePerQuestion,
    createdAt: activity.createdAt || "",
    questions: (activity.questions || []).map((question) => ({
      id: question.id || createQuestionId(),
      prompt: question.prompt || "",
      options: Array.isArray(question.options) && question.options.length === 4
        ? question.options.slice(0, 4)
        : ["", "", "", ""],
      correctIndex: Number.isInteger(question.correctIndex) ? question.correctIndex : 0,
      explanation: question.explanation || "",
      media: {
        type: question.media?.type || "none",
        youtubeUrl: question.media?.youtubeUrl || "",
        embedUrl: question.media?.embedUrl || toYouTubeEmbedUrl(question.media?.youtubeUrl || ""),
        url: question.media?.url || "",
        audioFileName: question.media?.audioFileName || "",
        audioFile: null,
      },
    })),
  };

  hydrateEditorForm();
  renderQuestions();
  renderJsonPreview(activity);
  updateActivityOutput(activity);
  setEditorStatus(`Actividad ${activity.id} cargada en el editor.`, "success");
}

function startGame(activity) {
  if (state.game?.timerId) {
    clearInterval(state.game.timerId);
  }

  state.game = {
    activity,
    index: 0,
    score: 0,
    lives: activity.lives,
    correctAnswers: 0,
    startedAt: Date.now(),
    questionDeadline: 0,
    timerId: null,
    locked: false,
  };

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const game = state.game;
  const question = game.activity.questions[game.index];
  if (!question) {
    finishGame();
    return;
  }

  elements.playerStage.innerHTML = `
    <div class="player-card">
      <div class="player-stats">
        <div class="player-stats-list">
          <span>Pregunta ${game.index + 1}/${game.activity.questions.length}</span>
          <span>Vidas ${game.lives}</span>
          <span>Puntos ${game.score}</span>
        </div>
        <span>${escapeHtml(game.activity.category)}</span>
      </div>

      ${renderMedia(question.media)}

      <p class="player-prompt">${escapeHtml(question.prompt)}</p>

      <div class="player-options">
        ${question.options
          .map((option, index) => `
            <button class="answer-btn" type="button" data-answer-index="${index}">
              ${escapeHtml(option)}
            </button>
          `)
          .join("")}
      </div>

      <p class="player-feedback" id="player-feedback"></p>

      <div class="timer-wrap">
        <div class="timer-track">
          <div class="timer-fill" id="timer-fill"></div>
        </div>
      </div>
    </div>
  `;

  startQuestionTimer();
}

function startQuestionTimer() {
  const game = state.game;
  if (game.timerId) {
    clearInterval(game.timerId);
  }

  const durationMs = game.activity.timePerQuestion * 1000;
  game.questionDeadline = Date.now() + durationMs;
  game.locked = false;

  const timerFill = document.getElementById("timer-fill");
  const feedbackNode = document.getElementById("player-feedback");

  game.timerId = setInterval(() => {
    const remaining = Math.max(0, game.questionDeadline - Date.now());
    const ratio = remaining / durationMs;
    if (timerFill) {
      timerFill.style.transform = `scaleX(${ratio})`;
    }

    if (remaining <= 0) {
      clearInterval(game.timerId);
      feedbackNode.textContent = "Tiempo agotado. Pierdes una vida.";
      feedbackNode.className = "player-feedback is-bad";
      handleAnswer(-1, true);
    }
  }, 120);
}

function handleAnswer(answerIndex, timedOut = false) {
  const game = state.game;
  const question = game.activity.questions[game.index];
  if (!question || game.locked) {
    return;
  }

  game.locked = true;
  clearInterval(game.timerId);

  const feedbackNode = document.getElementById("player-feedback");
  const answerButtons = Array.from(document.querySelectorAll(".answer-btn"));
  const isCorrect = !timedOut && answerIndex === question.correctIndex;

  answerButtons.forEach((button, index) => {
    button.disabled = true;
    if (index === question.correctIndex) {
      button.classList.add("is-correct");
    }
    if (!timedOut && index === answerIndex && index !== question.correctIndex) {
      button.classList.add("is-wrong");
    }
  });

  if (isCorrect) {
    game.score += 100;
    game.correctAnswers += 1;
    feedbackNode.textContent = question.explanation || "Respuesta correcta.";
    feedbackNode.className = "player-feedback is-good";
  } else {
    game.lives -= 1;
    feedbackNode.textContent = timedOut
      ? question.explanation || "Se acabó el tiempo."
      : question.explanation || "Respuesta incorrecta.";
    feedbackNode.className = "player-feedback is-bad";
  }

  window.setTimeout(() => {
    if (game.lives <= 0 || game.index >= game.activity.questions.length - 1) {
      finishGame();
      return;
    }

    game.index += 1;
    renderCurrentQuestion();
  }, 1200);
}

function finishGame() {
  const game = state.game;
  if (!game) {
    return;
  }

  if (game.timerId) {
    clearInterval(game.timerId);
  }

  const elapsedMs = Date.now() - game.startedAt;
  const totalQuestions = game.activity.questions.length;
  const accuracy = totalQuestions > 0 ? Math.round((game.correctAnswers / totalQuestions) * 100) : 0;

  elements.playerStage.innerHTML = `
    <div class="summary-card">
      <p class="card-kicker">Resultado final</p>
      <h3>${escapeHtml(game.activity.title)}</h3>
      <p class="summary-copy">El reto terminó. Puedes registrar el puntaje en el ranking de esta actividad.</p>

      <div class="summary-stats">
        <div class="summary-stat">
          <span>Puntos</span>
          <strong>${game.score}</strong>
        </div>
        <div class="summary-stat">
          <span>Aciertos</span>
          <strong>${game.correctAnswers}/${totalQuestions}</strong>
        </div>
        <div class="summary-stat">
          <span>Precisión</span>
          <strong>${accuracy}%</strong>
        </div>
      </div>

      <div class="summary-actions">
        <button class="primary-btn" type="button" data-action="start-game">Jugar otra vez</button>
        <button class="ghost-btn" type="button" data-action="load-into-editor">Abrir en editor</button>
      </div>
    </div>
  `;

  renderRankingForm(game.activity.id, game.score, elapsedMs);
  state.game = null;
}

function renderRankingForm(activityId, score, timeMs) {
  elements.leaderboardSubcopy.textContent = `Ranking global para ${activityId}`;
  elements.leaderboardList.innerHTML = `
    <form class="rank-form" id="rank-form">
      <label class="field">
        <span>Alias del jugador</span>
        <input id="rank-player-name" type="text" placeholder="Ej: Peko_QuizMaster" required>
      </label>
      <input type="hidden" name="activityId" value="${escapeHtml(activityId)}">
      <input type="hidden" name="score" value="${score}">
      <input type="hidden" name="timeMs" value="${timeMs}">
      <button class="primary-btn" type="submit">Guardar puntaje</button>
    </form>
  `;
}

async function handleRankingSubmit(event) {
  event.preventDefault();
  const form = event.target.closest("#rank-form");
  if (!form) {
    return;
  }

  const playerName = form.querySelector("#rank-player-name").value.trim();
  const activityId = form.querySelector('input[name="activityId"]').value;
  const score = Number(form.querySelector('input[name="score"]').value);
  const timeMs = Number(form.querySelector('input[name="timeMs"]').value);

  if (!playerName) {
    return;
  }

  try {
    await store.saveRanking({
      activityId,
      playerName,
      score,
      timeMs,
    });
    setPlayerStatus("Puntaje guardado en el ranking.", "success");
    await renderLeaderboard(activityId);
  } catch (error) {
    console.error(error);
    setPlayerStatus(`No pude guardar el ranking: ${error.message}`, "error");
  }
}

async function renderLeaderboard(activityId) {
  elements.leaderboardSubcopy.textContent = `Top para ${activityId}`;
  const rankings = await store.getRankings(activityId);
  state.leaderboard = rankings;

  if (!rankings.length) {
    elements.leaderboardList.innerHTML = `
      <p class="leaderboard-empty">Todavía no hay posiciones registradas para esta actividad.</p>
    `;
    return;
  }

  elements.leaderboardList.innerHTML = rankings
    .map((entry, index) => `
      <div class="leaderboard-row">
        <span class="leaderboard-rank">#${index + 1}</span>
        <div>
          <div class="leaderboard-name">${escapeHtml(entry.player_name || entry.playerName)}</div>
          <div class="leaderboard-meta">${formatDuration(entry.time_ms || entry.timeMs)}</div>
        </div>
        <strong>${entry.score}</strong>
        <span class="leaderboard-meta">${formatDate(entry.created_at || entry.createdAt)}</span>
      </div>
    `)
    .join("");
}

function updateStorageUI() {
  if (store.isCloudEnabled) {
    elements.storageModePill.textContent = "Modo cloud";
    elements.storageModeCopy.textContent = "Supabase detectado y listo para guardar en la nube.";
    elements.storageModeDetail.textContent =
      "Las actividades se guardarán en la tabla configurada, los audios se subirán al bucket y los rankings vivirán en la base.";
  } else {
    elements.storageModePill.textContent = "Modo local";
    elements.storageModeCopy.textContent = "Sin credenciales cargadas. El motor usa localStorage como fallback.";
    elements.storageModeDetail.textContent =
      "Funciona para prototipar, probar flujos y guardar una versión local de actividades y rankings en este navegador.";
  }
}

function updateActivityOutput(activity = state.lastSavedActivity || buildPreviewPayload()) {
  if (!activity || !activity.id) {
    elements.activityIdOutput.textContent = "Aún no guardado";
    elements.activityLinkOutput.textContent = "Se generará al guardar una actividad.";
    return;
  }

  const activityLink = new URL(window.location.href);
  activityLink.searchParams.set("activity", activity.id);

  elements.activityIdOutput.textContent = activity.id;
  elements.activityLinkOutput.textContent = activityLink.toString();
}

function renderJsonPreview(activity = null) {
  const preview = activity || buildPreviewPayload();
  elements.jsonPreview.textContent = JSON.stringify(preview, null, 2);
  updateActivityOutput(activity || state.lastSavedActivity || preview);
}

function buildPreviewPayload() {
  try {
    return buildActivityPayload();
  } catch (error) {
    return {
      title: state.editor.title,
      category: state.editor.category,
      questions: state.editor.questions.length,
      note: "Completa más campos para ver el payload completo.",
    };
  }
}

function setEditorStatus(message, type = "") {
  elements.editorStatus.textContent = message;
  elements.editorStatus.className = `inline-status ${type ? `is-${type}` : ""}`.trim();
}

function setPlayerStatus(message, type = "") {
  elements.playerLoadStatus.textContent = message;
  elements.playerLoadStatus.className = `inline-status ${type ? `is-${type}` : ""}`.trim();
}

async function copyActivityLink() {
  const text = elements.activityLinkOutput.textContent.trim();
  if (!text || text.startsWith("Se generará")) {
    setEditorStatus("Primero guarda una actividad para poder copiar su enlace.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setEditorStatus("Enlace copiado al portapapeles.", "success");
  } catch (error) {
    setEditorStatus("No pude copiar automáticamente el enlace.", "error");
  }
}

function renderMedia(media) {
  if (!media || media.type === "none") {
    return "";
  }

  if (media.type === "youtube" && media.embedUrl) {
    return `
      <div class="player-media">
        <iframe
          src="${escapeHtml(media.embedUrl)}"
          title="Video de la pregunta"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  if (media.type === "audio" && media.url) {
    return `
      <div class="player-media">
        <audio controls src="${escapeHtml(media.url)}"></audio>
      </div>
    `;
  }

  return `<p class="player-media-note">La pregunta tiene media configurada, pero todavía no hay un recurso disponible.</p>`;
}

class PuzzleStore {
  constructor(config) {
    this.config = config;
    this.supabase = null;

    if (window.supabase?.createClient && config.supabaseUrl && config.supabaseAnonKey) {
      this.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
  }

  get isCloudEnabled() {
    return Boolean(this.supabase);
  }

  async saveActivity(activity, editorQuestions) {
    const payload = cloneData(activity);

    if (this.isCloudEnabled) {
      try {
        await this.attachSupabaseAudio(payload, editorQuestions);
        const { error } = await this.supabase
          .from(this.config.activitiesTable)
          .upsert({
            id: payload.id,
            title: payload.title,
            category: payload.category,
            payload,
            updated_at: payload.updatedAt,
          });

        if (error) {
          throw error;
        }

        return { mode: "cloud", activity: payload };
      } catch (error) {
        console.warn("Cloud save failed, falling back to local mode.", error);
      }
    }

    await this.attachLocalAudio(payload, editorQuestions);
    const allActivities = this.readLocalActivities();
    allActivities[payload.id] = payload;
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(allActivities));
    return { mode: "local", activity: payload };
  }

  async getActivity(id) {
    if (this.isCloudEnabled) {
      const { data, error } = await this.supabase
        .from(this.config.activitiesTable)
        .select("payload")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.payload) {
        return data.payload;
      }
    }

    const allActivities = this.readLocalActivities();
    return allActivities[id] || null;
  }

  async saveRanking(entry) {
    const payload = {
      activity_id: entry.activityId,
      player_name: entry.playerName,
      score: entry.score,
      time_ms: entry.timeMs,
    };

    if (this.isCloudEnabled) {
      try {
        const { error } = await this.supabase
          .from(this.config.rankingsTable)
          .insert(payload);
        if (error) {
          throw error;
        }
        return;
      } catch (error) {
        console.warn("Cloud ranking save failed, falling back to local mode.", error);
      }
    }

    const allRankings = this.readLocalRankings();
    const activityRankings = allRankings[entry.activityId] || [];
    activityRankings.push({
      playerName: entry.playerName,
      score: entry.score,
      timeMs: entry.timeMs,
      createdAt: new Date().toISOString(),
    });
    allRankings[entry.activityId] = activityRankings;
    localStorage.setItem(STORAGE_KEYS.rankings, JSON.stringify(allRankings));
  }

  async getRankings(activityId) {
    if (this.isCloudEnabled) {
      try {
        const { data, error } = await this.supabase
          .from(this.config.rankingsTable)
          .select("*")
          .eq("activity_id", activityId)
          .order("score", { ascending: false })
          .order("time_ms", { ascending: true })
          .limit(10);

        if (error) {
          throw error;
        }

        if (Array.isArray(data)) {
          return data;
        }
      } catch (error) {
        console.warn("Cloud rankings fetch failed, using local fallback.", error);
      }
    }

    const allRankings = this.readLocalRankings();
    const activityRankings = allRankings[activityId] || [];
    return activityRankings
      .slice()
      .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)
      .slice(0, 10);
  }

  readLocalActivities() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.activities) || "{}");
    } catch (error) {
      return {};
    }
  }

  readLocalRankings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.rankings) || "{}");
    } catch (error) {
      return {};
    }
  }

  async attachSupabaseAudio(activity, editorQuestions) {
    for (const [index, question] of editorQuestions.entries()) {
      if (question.media.type !== "audio") {
        continue;
      }

      const file = question.media.audioFile;
      if (!(file instanceof File)) {
        continue;
      }

      const sanitizedName = sanitizeFileName(file.name);
      const storagePath = `${activity.id}/${crypto.randomUUID()}-${sanitizedName}`;
      const { error } = await this.supabase.storage
        .from(this.config.audioBucket)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "audio/mpeg",
        });

      if (error) {
        throw error;
      }

      const { data } = this.supabase.storage
        .from(this.config.audioBucket)
        .getPublicUrl(storagePath);

      activity.questions[index].media.url = data.publicUrl;
      activity.questions[index].media.audioFileName = file.name;
    }
  }

  async attachLocalAudio(activity, editorQuestions) {
    for (const [index, question] of editorQuestions.entries()) {
      if (question.media.type !== "audio") {
        continue;
      }

      const file = question.media.audioFile;
      if (!(file instanceof File)) {
        continue;
      }

      activity.questions[index].media.url = await readFileAsDataUrl(file);
      activity.questions[index].media.audioFileName = file.name;
    }
  }
}

function createEmptyEditorState() {
  return {
    id: "",
    title: "",
    category: "",
    description: "",
    lives: DEFAULTS.lives,
    timePerQuestion: DEFAULTS.timePerQuestion,
    createdAt: "",
    questions: [createEmptyQuestion()],
  };
}

function createEmptyQuestion() {
  return {
    id: createQuestionId(),
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    media: {
      type: "none",
      youtubeUrl: "",
      embedUrl: "",
      url: "",
      audioFileName: "",
      audioFile: null,
    },
  };
}

function createActivityId(title) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "neo-activity";

  return `${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

function createQuestionId() {
  return `q-${Math.random().toString(36).slice(2, 10)}`;
}

function toYouTubeEmbedUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");
    let videoId = "";

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      videoId = parsed.searchParams.get("v") || "";
    }

    if (hostname === "youtu.be") {
      videoId = parsed.pathname.replace("/", "");
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  } catch (error) {
    return "";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No pude leer el archivo de audio."));
    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");
}

function cloneData(value) {
  if (window.structuredClone) {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDuration(timeMs) {
  const totalSeconds = Math.max(0, Math.round(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString("es-UY");
  } catch (error) {
    return "";
  }
}
