const startBtn = document.getElementById("start-btn");
const btnText = document.getElementById("btn-text");
const btnIcon = document.getElementById("btn-icon");
const resultCard = document.getElementById("result-card");
const resultStatus = document.getElementById("result-status");
const winnerDisplay = document.getElementById("winner-display");
const congratsMsg = document.getElementById("congrats-msg");
const poolPreviewContainer = document.getElementById("pool-preview");
const drawCount = document.getElementById("draw-count");
const drawSessionState = document.getElementById("draw-session-state");
const drawStatusNote = document.getElementById("draw-status-note");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const drumRollSound = new Audio("/static/drum-roll.mp3");
const victorySound = new Audio("/static/victory.mp3");

drumRollSound.volume = 0;
drumRollSound.muted = true;
victorySound.volume = 0;
victorySound.muted = true;

const { Engine, Render, Runner, Bodies, Composite, Body } = Matter;
const canvasSize = Math.min(window.innerWidth < 640 ? 320 : 420, 420);
const radius = canvasSize / 2;
const paperColors = ["#38bdf8", "#818cf8", "#a78bfa", "#c084fc", "#f472b6"];
const totalSegments = 72;
const thickness = 40;
const boundaryRadius = radius + thickness / 2 - 4;

const state = {
  authenticated: false,
  totalPossible: 0,
  remainingPossible: 0,
  numbers: [],
  engine: null,
  render: null,
  runner: null,
  papersById: new Map(),
  papersList: [],
  isDrawing: false,
  mixerInterval: null,
  ready: false,
};

function getThemePreference() {
  const savedTheme = window.localStorage.getItem("lottery-theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;

  if (!themeToggleBtn) {
    return;
  }

  themeToggleBtn.textContent = theme === "light" ? "Dark mode" : "Light mode";
  themeToggleBtn.setAttribute(
    "aria-label",
    theme === "light" ? "Switch to dark theme" : "Switch to light theme",
  );
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
  window.localStorage.setItem("lottery-theme", nextTheme);
  applyTheme(nextTheme);
}

function setDrawSessionState(message) {
  if (drawSessionState) {
    drawSessionState.innerText = message;
  }
}

function setDrawStatus(message) {
  if (drawStatusNote) {
    drawStatusNote.innerText = message;
  }
}

function setButtonIdle() {
  startBtn.disabled = !state.authenticated || !state.remainingPossible;
  startBtn.classList.toggle("opacity-50", startBtn.disabled);
  startBtn.classList.toggle("cursor-not-allowed", startBtn.disabled);
  btnText.innerText = state.authenticated
    ? state.remainingPossible
      ? "Start"
      : "No More Numbers"
    : "Login Required";
  btnIcon.innerHTML = `<svg id="btn-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
}

function setButtonLoading() {
  startBtn.disabled = true;
  startBtn.classList.add("opacity-50", "cursor-not-allowed");
  btnText.innerText = "Mixing Intensely...";
  btnIcon.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function startDrumRoll() {
  drumRollSound.loop = true;
  drumRollSound.currentTime = 0;
  drumRollSound.play().catch(() => {});
}

function stopDrumRoll() {
  drumRollSound.pause();
  drumRollSound.currentTime = 0;
}

function playVictorySound() {
  victorySound.loop = false;
  victorySound.currentTime = 0;

  return new Promise((resolve) => {
    const handleEnded = () => {
      victorySound.removeEventListener("ended", handleEnded);
      resolve();
    };

    victorySound.addEventListener("ended", handleEnded);
    victorySound.play().catch(() => {
      victorySound.removeEventListener("ended", handleEnded);
      resolve();
    });
  });
}

function renderPoolPreview(numbers) {
  if (!poolPreviewContainer) {
    return;
  }

  poolPreviewContainer.innerHTML = "";

  if (!numbers.length) {
    const span = document.createElement("span");
    span.className =
      "px-2 py-0.5 bg-slate-900 rounded border border-slate-800/60 font-semibold";
    span.innerText = "No active numbers";
    poolPreviewContainer.appendChild(span);
    return;
  }

  numbers.forEach((number) => {
    const span = document.createElement("span");
    span.className =
      "px-2 py-0.5 bg-slate-900 rounded border border-slate-800/60 font-semibold";
    span.innerText = `#${number}`;
    poolPreviewContainer.appendChild(span);
  });
}

function updateCounters() {
  if (drawCount) {
    drawCount.innerText = `${state.remainingPossible} / ${state.totalPossible}`;
  }
}

function updateSessionState() {
  if (!drawSessionState && !drawStatusNote) {
    return;
  }

  if (!state.authenticated) {
    setDrawSessionState("Admin session required to draw");
    setDrawStatus("Open the admin page, log in, then return here to draw.");
    return;
  }

  setDrawSessionState(
    state.remainingPossible
      ? "Session authenticated"
      : "Authenticated, but no numbers remain",
  );
  setDrawStatus(
    state.remainingPossible
      ? "Only active and undrawn numbers within the current constraint can be selected."
      : "No more numbers are available to draw under the current filters.",
  );
}

function clearScene() {
  if (state.mixerInterval) {
    clearInterval(state.mixerInterval);
    state.mixerInterval = null;
  }

  stopDrumRoll();
  victorySound.pause();
  victorySound.currentTime = 0;

  if (state.render) {
    Render.stop(state.render);
  }

  if (state.runner) {
    Runner.stop(state.runner);
  }

  if (state.engine) {
    Composite.clear(state.engine.world, false);
    Engine.clear(state.engine);
  }

  state.engine = null;
  state.render = null;
  state.runner = null;
  state.papersById.clear();
  state.papersList = [];
  state.ready = false;
}

function initializeScene(numbers) {
  clearScene();
  state.numbers = numbers;

  const engine = Engine.create({ gravity: { y: 1.2 } });
  const render = Render.create({
    element: document.getElementById("canvas-container"),
    engine,
    options: {
      width: canvasSize,
      height: canvasSize,
      background: "transparent",
      wireframes: false,
    },
  });

  const runner = Runner.create();

  state.engine = engine;
  state.render = render;
  state.runner = runner;

  Render.run(render);
  Runner.run(runner, engine);

  for (let i = 0; i < totalSegments; i += 1) {
    const angle = (i / totalSegments) * Math.PI * 2;
    const x = radius + Math.cos(angle) * boundaryRadius;
    const y = radius + Math.sin(angle) * boundaryRadius;

    const segment = Bodies.rectangle(x, y, thickness, canvasSize / 6, {
      isStatic: true,
      angle,
      render: { visible: false },
    });

    Composite.add(engine.world, segment);
  }

  numbers.forEach((entry, index) => {
    const offsetAngle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (radius * 0.5);
    const posX = radius + Math.cos(offsetAngle) * dist;
    const posY = radius + Math.sin(offsetAngle) * dist;
    const width = Math.random() * 4 + 12;
    const height = Math.random() * 3 + 8;

    const paper = Bodies.rectangle(posX, posY, width, height, {
      restitution: 0.8,
      friction: 0.01,
      frictionAir: 0.01,
      chamfer: { radius: 2 },
      render: {
        fillStyle: paperColors[index % paperColors.length],
        strokeStyle: "#0f172a",
        lineWidth: 1.5,
      },
    });

    paper.ticketId = entry.id;
    paper.ticketValue = entry.number;
    state.papersById.set(entry.id, paper);
    state.papersList.push(paper);
    Composite.add(engine.world, paper);
  });

  renderPoolPreview(numbers.map((entry) => entry.number));
  state.ready = true;
  updateCounters();
  updateSessionState();
  setButtonIdle();

  if (!numbers.length) {
    resultStatus.innerText = "No more numbers left to draw";
    winnerDisplay.innerText = "-";
  }
}

async function loadDrawStatus() {
  const response = await fetch("/api/draw/status", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to load draw status");
  }

  return response.json();
}

async function loadAuthState() {
  const response = await fetch("/api/admin/me", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    return false;
  }

  const payload = await response.json();
  return Boolean(payload.authenticated);
}

function removePaperFromScene(numberId) {
  const paper = state.papersById.get(numberId);

  if (!paper || !state.engine) {
    return;
  }

  paper.render.fillStyle = "#ffffff";
  paper.render.strokeStyle = "#10b981";
  paper.render.lineWidth = 2;
  paper.render.opacity = 0.35;

  Body.setStatic(paper, true);
}

async function requestNextDraw() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("/api/draw/next", {
      method: "POST",
      credentials: "same-origin",
      signal: controller.signal,
    });

    const payload = await response.json();

    if (!response.ok) {
      const error = new Error(payload.message || "Draw failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Draw request timed out.");
      timeoutError.status = 408;
      throw timeoutError;
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function resetResultCardForDraw() {
  resultCard.classList.remove(
    "opacity-100",
    "border-indigo-500/50",
    "shadow-indigo-500/10",
  );
  resultCard.classList.add("opacity-40", "border-slate-800");
  resultStatus.innerText = "Grinding...";
  resultStatus.className =
    "text-xs font-semibold tracking-widest text-amber-500 uppercase mb-2";
  winnerDisplay.className =
    "w-56 h-20 md:w-72 md:h-24 flex items-center justify-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-600 font-black text-3xl md:text-4xl leading-none shadow-inner transition-all duration-300 animate-pulse";
  winnerDisplay.innerText = "?";
  congratsMsg.classList.add("opacity-0");
}

function revealWinner(drawResult) {
  const chosenBody = state.papersById.get(drawResult.id);

  if (chosenBody) {
    chosenBody.render.fillStyle = "#ffffff";
    chosenBody.render.strokeStyle = "#10b981";
    chosenBody.render.lineWidth = 3;

    Body.applyForce(chosenBody, chosenBody.position, {
      x: (Math.random() - 0.5) * 0.02 * chosenBody.mass,
      y: -0.06 * chosenBody.mass,
    });
  }
}

async function triggerDraw() {
  if (!state.ready || state.isDrawing || !state.authenticated) {
    if (!state.authenticated) {
      setDrawStatus("Sign in through the admin page to draw numbers.");
    }

    return;
  }

  if (!state.remainingPossible) {
    setDrawStatus("No more numbers left to draw.");
    setButtonIdle();
    return;
  }

  state.isDrawing = true;
  setButtonLoading();
  resetResultCardForDraw();
  startDrumRoll();
  setDrawStatus("Drum roll started...");

  let drawResult = null;
  let drawError = null;
  const drawPromise = requestNextDraw()
    .then((result) => {
      drawResult = result;
    })
    .catch((error) => {
      drawError = error;
    });

  let durationCounter = 0;
  state.mixerInterval = setInterval(() => {
    state.papersList.forEach((paper) => {
      const angle = Math.random() * Math.PI * 2;
      const forceMagnitude = 0.022 * paper.mass;

      Body.applyForce(paper, paper.position, {
        x: Math.cos(angle) * forceMagnitude,
        y: Math.sin(angle) * forceMagnitude - 0.012 * paper.mass,
      });

      Body.setAngularVelocity(paper, (Math.random() - 0.5) * 1.2);
    });

    durationCounter += 30;
  }, 30);

  await drawPromise;

  if (drawError) {
    clearInterval(state.mixerInterval);
    state.mixerInterval = null;
    stopDrumRoll();
    state.isDrawing = false;

    if (drawError.status === 401) {
      state.authenticated = false;
      setDrawSessionState("Admin session required to draw");
      setDrawStatus("Your session is not authenticated anymore.");
      setButtonIdle();
      return;
    }

    if (drawError.status === 409) {
      state.remainingPossible = 0;
      updateCounters();
      updateSessionState();
      resultStatus.innerText =
        drawError.payload.message || "No more numbers left to draw.";
      winnerDisplay.innerText = "-";
      setButtonIdle();
      return;
    }

    resultStatus.innerText = drawError.message || "Draw failed";
    setDrawStatus("Unable to complete the draw.");
    setButtonIdle();
    return;
  }

  if (!drawResult) {
    clearInterval(state.mixerInterval);
    state.mixerInterval = null;
    stopDrumRoll();
    state.isDrawing = false;
    setButtonIdle();
    return;
  }

  setDrawStatus("Result locked in. Drum roll continues...");
  await wait(4000);

  clearInterval(state.mixerInterval);
  state.mixerInterval = null;
  stopDrumRoll();

  state.totalPossible = drawResult.totalPossible;
  state.remainingPossible = drawResult.remainingPossible;
  updateCounters();
  updateSessionState();
  removePaperFromScene(drawResult.id);
  renderPoolPreview(state.papersList.map((entry) => entry.ticketValue));

  setDrawStatus("Playing victory sound...");
  resultStatus.innerText = "Victory!";
  resultStatus.className =
    "text-xs font-bold tracking-widest text-cyan-300 uppercase mb-2";
  const victoryPlayback = playVictorySound();

  resultCard.classList.remove("opacity-40", "border-slate-800");
  resultCard.classList.add(
    "opacity-100",
    "border-indigo-500/50",
    "shadow-2xl",
    "shadow-indigo-500/10",
  );

  resultStatus.innerText = "Winner Drawn!";
  resultStatus.className =
    "text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2";

  winnerDisplay.classList.remove(
    "text-slate-600",
    "animate-pulse",
    "border-slate-800",
  );
  winnerDisplay.classList.add(
    "text-white",
    "bg-gradient-to-br",
    "from-slate-900",
    "to-slate-950",
    "border-emerald-500",
    "scale-105",
    "drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]",
  );
  winnerDisplay.innerText = drawResult.number;
  congratsMsg.classList.remove("opacity-0");

  await victoryPlayback;

  if (drawResult.remainingPossible <= 0) {
    setDrawStatus("No more numbers left to draw.");
  } else {
    setDrawStatus(
      `${drawResult.remainingPossible} draws remain out of ${drawResult.totalPossible}. Next draw unlocks in 3 seconds.`,
    );
  }

  await wait(3000);
  state.isDrawing = false;
  setButtonIdle();
}

async function bootstrap() {
  try {
    const [drawStatus, authenticated] = await Promise.all([
      loadDrawStatus(),
      loadAuthState(),
    ]);

    state.authenticated = authenticated || drawStatus.authenticated;
    state.totalPossible = drawStatus.totalPossible || 0;
    state.remainingPossible = drawStatus.remainingPossible || 0;
    updateCounters();
    updateSessionState();
    initializeScene(drawStatus.numbers || []);
    setButtonIdle();
  } catch (error) {
    renderPoolPreview([]);
    state.authenticated = false;
    state.totalPossible = 0;
    state.remainingPossible = 0;
    updateCounters();
    setDrawSessionState("Unable to load draw status");
    setDrawStatus("The draw pool could not be loaded.");
    setButtonIdle();
    resultStatus.innerText = "Unable to load active numbers";
    winnerDisplay.innerText = "-";
  }
}

startBtn.addEventListener("click", triggerDraw);
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme);
}

applyTheme(getThemePreference());
bootstrap();
