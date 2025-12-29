import "./style.css";

type Theme = "light" | "dark";
type Settings = {
  profile: {
    displayName: string;
    email: string;
  };
  preferences: {
    theme: Theme;
    emailNotifications: boolean;
  };
};

const STORAGE_KEY = "user-preferences:v1";

const DEFAULT_SETTINGS: Settings = {
  profile: { displayName: "", email: "" },
  preferences: { theme: "light", emailNotifications: true },
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Settings;

    // Minimal shape guard (keeps app from crashing on bad storage)
    if (!parsed?.profile || !parsed?.preferences) return DEFAULT_SETTINGS;
    return {
      profile: {
        displayName: parsed.profile.displayName ?? "",
        email: parsed.profile.email ?? "",
      },
      preferences: {
        theme: parsed.preferences.theme === "dark" ? "dark" : "light",
        emailNotifications: Boolean(parsed.preferences.emailNotifications),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}

const ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "live.com",
  "msn.com",
  "comcast.net",
  "att.net",
  "verizon.net",
  "ucsc.edu",
]);

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length === 0) return null; // allow empty

  // Basic format check
  const match = trimmed.match(/^([^\s@]+)@([^\s@]+\.[^\s@]+)$/);
  if (!match) return "Enter a valid email (example@domain.com).";

  const domain = match[2].toLowerCase();

  if (!ALLOWED_DOMAINS.has(domain)) {
    return `Domain not allowed. Use a common provider (e.g., gmail.com, outlook.com) or your school/work email.`;
  }

  return null;
}


let state: Settings = loadSettings();

const debouncedSave = debounce((next: Settings) => {
  saveSettings(next);
  setSaveStatus("Saved ✓");
}, 350);

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function setSaveStatus(text: string) {
  const el = document.getElementById("saveStatus");
  if (el) el.textContent = text;
}

function setError(id: string, message: string | null) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message ?? "";
  el.setAttribute("data-visible", message ? "true" : "false");
}

function render() {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="container">
      <header class="header">
        <div>
          <h1>User Preferences Dashboard</h1>
          <p class="subtle">A settings panel with validation, autosave, and persistence.</p>
        </div>
        <div class="status" aria-live="polite">
          <span id="saveStatus">Loaded</span>
          <button id="resetBtn" class="secondary" type="button">Reset</button>
        </div>
      </header>

      <main class="grid">
        <section class="card">
          <h2>Profile</h2>

          <label class="field">
            <span>Display name</span>
            <input id="displayName" type="text" placeholder="Samina" autocomplete="name" />
          </label>

          <label class="field">
            <span>Email</span>
            <input id="email" type="email" placeholder="you@example.com" autocomplete="email" />
          </label>
          <p id="emailError" class="error" data-visible="false"></p>
        </section>

        <section class="card">
          <h2>Preferences</h2>

          <label class="field">
            <span>Theme</span>
            <select id="theme">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label class="toggle">
            <input id="emailNotifications" type="checkbox" />
            <span>Email notifications</span>
          </label>

          <div class="hint">
            Changes autosave after you stop typing for a moment.
          </div>
        </section>
      </main>
    </div>
  `;

  // Populate initial values
  (document.getElementById("displayName") as HTMLInputElement).value = state.profile.displayName;
  (document.getElementById("email") as HTMLInputElement).value = state.profile.email;
  (document.getElementById("theme") as HTMLSelectElement).value = state.preferences.theme;
  (document.getElementById("emailNotifications") as HTMLInputElement).checked =
    state.preferences.emailNotifications;

  setTheme(state.preferences.theme);

  // Wire events
  const onChange = () => {
    setSaveStatus("Saving…");

    const next: Settings = {
      profile: {
        displayName: (document.getElementById("displayName") as HTMLInputElement).value,
        email: (document.getElementById("email") as HTMLInputElement).value,
      },
      preferences: {
        theme: (document.getElementById("theme") as HTMLSelectElement).value as Theme,
        emailNotifications: (document.getElementById("emailNotifications") as HTMLInputElement).checked,
      },
    };

    // Validate
    const emailErr = validateEmail(next.profile.email);
    setError("emailError", emailErr);

    // Apply theme immediately
    setTheme(next.preferences.theme);

    // Only autosave if valid
    state = next;
    if (!emailErr) debouncedSave(next);
    else setSaveStatus("Fix errors to save");
  };

  ["displayName", "email"].forEach((id) => {
    document.getElementById(id)!.addEventListener("input", onChange);
  });
  ["theme", "emailNotifications"].forEach((id) => {
    document.getElementById(id)!.addEventListener("change", onChange);
  });

  document.getElementById("resetBtn")!.addEventListener("click", () => {
    state = structuredClone(DEFAULT_SETTINGS);
    saveSettings(state);
    setSaveStatus("Reset ✓");
    render();
  });
}

render();
