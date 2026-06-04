const loginPanel = document.getElementById("login-panel");
const dashboardPanel = document.getElementById("dashboard-panel");
const loginIntroPanel = document.getElementById("login-intro-panel");
const dashboardLeftPanel = document.getElementById("dashboard-left-panel");
const loginForm = document.getElementById("login-form");
const authMessage = document.getElementById("auth-message");
const sessionUser = document.getElementById("session-user");
const secureStatus = document.getElementById("secure-status");
const logoutBtn = document.getElementById("logout-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const numberForm = document.getElementById("number-form");
const insertMode = document.getElementById("insert-mode");
const singleNumberGroup = document.getElementById("single-number-group");
const rangeGroup = document.getElementById("range-group");
const singleNumberInput = document.getElementById("single-number");
const rangeStartInput = document.getElementById("range-start");
const rangeEndInput = document.getElementById("range-end");
const numbersMessage = document.getElementById("numbers-message");
const numberTotal = document.getElementById("number-total");
const numberCount = document.getElementById("number-count");
const numberSearchInput = document.getElementById("number-search");
const numberList = document.getElementById("number-list");
const clearNumbersBtn = document.getElementById("clear-numbers-btn");
const resetDrawnBtn = document.getElementById("reset-drawn-btn");
const constraintForm = document.getElementById("constraint-form");
const constraintIdInput = document.getElementById("constraint-id");
const constraintMaxNumberInput = document.getElementById(
  "constraint-max-number",
);
const constraintActiveInput = document.getElementById("constraint-active");
const constraintCancelBtn = document.getElementById("constraint-cancel");
const constraintMessage = document.getElementById("constraint-message");
const constraintList = document.getElementById("constraint-list");
const constraintCount = document.getElementById("constraint-count");
const activeConstraintValue = document.getElementById(
  "active-constraint-value",
);

let latestNumbers = [];
let numberSearchTerm = "";

function showLogin() {
  loginPanel.classList.remove("hidden");
  dashboardPanel.classList.add("hidden");
  loginIntroPanel.classList.remove("hidden");
  dashboardLeftPanel.classList.add("hidden");
}

function showDashboard(user) {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  loginIntroPanel.classList.add("hidden");
  dashboardLeftPanel.classList.remove("hidden");
  sessionUser.textContent = `Signed in as ${user.username}`;
}

function setMessage(message, tone = "error") {
  authMessage.textContent = message;
  authMessage.className =
    tone === "error"
      ? "mt-4 min-h-6 text-sm text-rose-300"
      : "mt-4 min-h-6 text-sm text-emerald-300";
}

function setNumbersMessage(message, tone = "error") {
  numbersMessage.textContent = message;
  numbersMessage.className =
    tone === "error"
      ? "min-h-6 text-sm text-rose-300"
      : "min-h-6 text-sm text-emerald-300";
}

function setConstraintMessage(message, tone = "error") {
  constraintMessage.textContent = message;
  constraintMessage.className =
    tone === "error"
      ? "min-h-6 text-sm text-rose-300"
      : "min-h-6 text-sm text-emerald-300";
}

function confirmTwice(firstMessage, secondMessage) {
  if (!window.confirm(firstMessage)) {
    return false;
  }

  return window.confirm(secondMessage);
}

function isSixDigitNumber(value) {
  return /^\d{6}$/.test(value);
}

function setModeVisibility() {
  const isRange = insertMode.value === "range";

  singleNumberGroup.classList.toggle("hidden", isRange);
  rangeGroup.classList.toggle("hidden", !isRange);
}

function resetConstraintForm() {
  constraintIdInput.value = "";
  constraintMaxNumberInput.value = "";
  constraintActiveInput.checked = true;
  setConstraintMessage("", "success");
}

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

  const isLight = theme === "light";
  themeToggleBtn.textContent = isLight ? "Dark mode" : "Light mode";
  themeToggleBtn.setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme",
  );
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
  window.localStorage.setItem("lottery-theme", nextTheme);
  applyTheme(nextTheme);
}

function filterNumbers(numbers) {
  if (!numberSearchTerm) {
    return numbers;
  }

  return numbers.filter((number) => number.number.includes(numberSearchTerm));
}

function renderNumberList(numbers) {
  const visibleNumbers = filterNumbers(numbers);
  const totalLabel = `${numbers.length} record${numbers.length === 1 ? "" : "s"}`;
  const visibleLabel =
    visibleNumbers.length === numbers.length
      ? totalLabel
      : `${visibleNumbers.length} of ${numbers.length} records`;

  if (numberTotal) {
    numberTotal.textContent = String(numbers.length);
  }
  if (numberCount) {
    numberCount.textContent = visibleLabel;
  }

  if (!visibleNumbers.length) {
    numberList.innerHTML = numberSearchTerm
      ? '<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">No numbers match this search.</div>'
      : '<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">No numbers saved yet.</div>';
    return;
  }

  numberList.innerHTML = visibleNumbers
    .map(
      (number) => `
        <div class="flex flex-col gap-3 rounded-2xl border ${number.active ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-800 bg-slate-950/40"} p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-lg font-semibold text-white">${number.number}</p>
              <span class="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${number.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}">${number.active ? "Active" : "Inactive"}</span>
            </div>
            <p class="mt-1 text-xs text-slate-500">Drawn: ${number.drawn ? "yes" : "no"}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" data-toggle-number="${number.id}" data-number="${encodeURIComponent(JSON.stringify(number))}" class="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">${number.active ? "Deactivate" : "Activate"}</button>
          </div>
        </div>
      `,
    )
    .join("");

  numberList.querySelectorAll("[data-toggle-number]").forEach((button) => {
    button.addEventListener("click", async () => {
      const number = JSON.parse(
        decodeURIComponent(button.getAttribute("data-number")),
      );

      try {
        const response = await fetch(`/api/admin/numbers/${number.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active: !number.active }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setNumbersMessage(payload.message || "Failed to update number.");
          return;
        }

        setNumbersMessage(
          `${number.number} is now ${payload.active ? "active" : "inactive"}.`,
          "success",
        );
        await refreshNumbers();
      } catch (error) {
        setNumbersMessage("Network error while updating number.");
      }
    });
  });
}

async function refreshNumbers() {
  const response = await fetch("/api/admin/numbers", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to load numbers");
  }

  const payload = await response.json();
  latestNumbers = payload.numbers;
  renderNumberList(latestNumbers);
}

async function refreshConstraints() {
  const response = await fetch("/api/admin/constraints", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to load constraints");
  }

  const payload = await response.json();
  renderConstraintList(payload.constraints);
}

function renderConstraintList(constraints) {
  constraintCount.textContent = `${constraints.length} record${constraints.length === 1 ? "" : "s"}`;

  const activeConstraint = constraints.find((constraint) => constraint.active);
  activeConstraintValue.textContent = activeConstraint
    ? activeConstraint.maxNumber
    : "None";

  if (!constraints.length) {
    constraintList.innerHTML =
      '<div class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">No constraints saved yet.</div>';
    return;
  }

  constraintList.innerHTML = constraints
    .map(
      (constraint) => `
        <div class="flex flex-col gap-3 rounded-2xl border ${constraint.active ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-800 bg-slate-950/40"} p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-lg font-semibold text-white">${constraint.maxNumber}</p>
              <span class="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${constraint.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}">${constraint.active ? "Active" : "Inactive"}</span>
            </div>
            <p class="mt-1 text-xs text-slate-500">Updated ${constraint.updated_at}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" data-edit-constraint="${constraint.id}" data-constraint="${encodeURIComponent(JSON.stringify(constraint))}" class="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">Edit</button>
          </div>
        </div>
      `,
    )
    .join("");

  constraintList
    .querySelectorAll("[data-edit-constraint]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const constraint = JSON.parse(
          decodeURIComponent(button.getAttribute("data-constraint")),
        );
        constraintIdInput.value = String(constraint.id);
        constraintMaxNumberInput.value = constraint.maxNumber;
        constraintActiveInput.checked = constraint.active;
        setConstraintMessage(
          `Editing constraint ${constraint.maxNumber}.`,
          "success",
        );
        constraintMaxNumberInput.focus();
      });
    });
}

async function clearAllNumbers() {
  if (
    !confirmTwice(
      "This will permanently delete all lottery numbers. Continue?",
      "Are you absolutely sure you want to clear all lottery numbers?",
    )
  ) {
    return;
  }

  try {
    const response = await fetch("/api/admin/numbers", {
      method: "DELETE",
      credentials: "same-origin",
    });

    const payload = await response.json();

    if (!response.ok) {
      setNumbersMessage(payload.message || "Failed to clear numbers.");
      return;
    }

    setNumbersMessage("All lottery numbers have been cleared.", "success");
    await refreshNumbers();
  } catch (error) {
    setNumbersMessage("Network error while clearing numbers.");
  }
}

async function resetAllDrawnStates() {
  if (
    !confirmTwice(
      "This will mark every stored lottery number as not drawn. Continue?",
      "Are you absolutely sure you want to reset all drawn states?",
    )
  ) {
    return;
  }

  try {
    const response = await fetch("/api/admin/numbers/reset-drawn", {
      method: "POST",
      credentials: "same-origin",
    });

    const payload = await response.json();

    if (!response.ok) {
      setNumbersMessage(payload.message || "Failed to reset drawn states.");
      return;
    }

    setNumbersMessage("All drawn states have been reset.", "success");
    await refreshNumbers();
  } catch (error) {
    setNumbersMessage("Network error while resetting drawn states.");
  }
}

async function readSession() {
  const response = await fetch("/api/admin/me", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    showLogin();
    secureStatus.textContent = "Session check failed.";
    return;
  }

  const payload = await response.json();

  if (payload.authenticated) {
    showDashboard(payload.user);
    secureStatus.textContent = "Protected API access confirmed.";
    await refreshNumbers();
    await refreshConstraints();
    return;
  }

  showLogin();
  secureStatus.textContent = "Not signed in.";
}

function wireEventHandlers() {
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  insertMode.addEventListener("change", setModeVisibility);
  numberSearchInput.addEventListener("input", () => {
    numberSearchTerm = numberSearchInput.value.trim();
    renderNumberList(latestNumbers);
  });
  clearNumbersBtn.addEventListener("click", clearAllNumbers);
  resetDrawnBtn.addEventListener("click", resetAllDrawnStates);

  numberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setNumbersMessage("", "success");

    const mode = insertMode.value;
    let payload;

    if (mode === "range") {
      const startNumber = rangeStartInput.value.trim();
      const endNumber = rangeEndInput.value.trim();

      if (!isSixDigitNumber(startNumber) || !isSixDigitNumber(endNumber)) {
        setNumbersMessage("Enter a valid 6-digit first and last number.");
        return;
      }

      payload = {
        mode,
        startNumber,
        endNumber,
      };
    } else {
      const number = singleNumberInput.value.trim();

      if (!isSixDigitNumber(number)) {
        setNumbersMessage("Enter a valid 6-digit number.");
        return;
      }

      payload = {
        mode,
        number,
      };
    }

    try {
      const response = await fetch("/api/admin/numbers", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setNumbersMessage(result.message || "Failed to insert numbers.");
        return;
      }

      setNumbersMessage(
        `Inserted ${result.insertedCount} number${result.insertedCount === 1 ? "" : "s"}. Skipped ${result.skippedCount}.`,
        "success",
      );
      await refreshNumbers();
      singleNumberInput.value = "";
      rangeStartInput.value = "";
      rangeEndInput.value = "";
    } catch (error) {
      setNumbersMessage("Network error while inserting numbers.");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("", "success");

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.message || "Login failed.");
        return;
      }

      passwordInput.value = "";
      setMessage("Login successful.", "success");
      showDashboard(payload.user);
      secureStatus.textContent = "Protected API access confirmed.";
      await refreshNumbers();
      await refreshConstraints();
    } catch (error) {
      setMessage("Network error while logging in.");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      setMessage("Logged out.", "success");
      secureStatus.textContent = "Not signed in.";
      showLogin();
      usernameInput.focus();
    } catch (error) {
      setMessage("Network error while logging out.");
    }
  });

  constraintCancelBtn.addEventListener("click", () => {
    resetConstraintForm();
  });

  constraintForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setConstraintMessage("", "success");

    const maxNumber = constraintMaxNumberInput.value.trim();
    const active = constraintActiveInput.checked;
    const constraintId = constraintIdInput.value.trim();

    if (!isSixDigitNumber(maxNumber)) {
      setConstraintMessage("Enter a valid 6-digit maximum number.");
      return;
    }

    const payload = {
      maxNumber,
      active,
    };

    try {
      const response = await fetch(
        constraintId
          ? `/api/admin/constraints/${constraintId}`
          : "/api/admin/constraints",
        {
          method: constraintId ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setConstraintMessage(result.message || "Failed to save constraint.");
        return;
      }

      setConstraintMessage(
        constraintId
          ? `Updated constraint ${result.maxNumber}.`
          : `Saved constraint ${result.maxNumber}.`,
        "success",
      );

      resetConstraintForm();
      await refreshConstraints();
    } catch (error) {
      setConstraintMessage("Network error while saving constraint.");
    }
  });
}

function initializeAdminTheme() {
  applyTheme(getThemePreference());
}

initializeAdminTheme();
wireEventHandlers();
setModeVisibility();
resetConstraintForm();
readSession().catch(() => {
  showLogin();
  secureStatus.textContent = "Session check failed.";
});
