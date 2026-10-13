(function () {
  "use strict";

  var Storage = window.App.Storage;
  var Validators = window.App.Validators;

  var PROFILE_KEY = "campus-life-planner:profile";
  var THEME_KEY = "campus-life-planner:theme";
  var SIDEBAR_KEY = "campus-life-planner:sidebar";
  var DONE_KEY = "campus-life-planner:onboarded";
  var NAME_KEY = "campus-life-planner:name";

  var NAME_RE = /^[^\p{C}]{1,24}$/u;
  var TARGET_RE = /^(0|[1-9]\d{0,5})$/;

  var state = {
    step: 0,
    name: "",
    theme: "light",
    unit: "minutes",
    target: 600,
    seed: "seeded",
  };
  var els = {};
  var isOpen = false;
  var lastFocus = null;

  function loadProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed.name === "string" && parsed.name
        ? parsed
        : null;
    } catch (err) {
      return null;
    }
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch (err) {
      return false;
    }
  }

  function isComplete() {
    try {
      return localStorage.getItem(DONE_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function markComplete() {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch (err) {}
  }

  function reset() {
    try {
      localStorage.removeItem(DONE_KEY);
      localStorage.removeItem(PROFILE_KEY);
    } catch (err) {}
  }

  function getName() {
    var profile = loadProfile();
    if (profile && profile.name) return profile.name;
    try {
      var legacy = localStorage.getItem(NAME_KEY);
      if (legacy) return legacy;
    } catch (err) {}
    return "";
  }

  function initial(name) {
    var clean = String(name || "").trim();
    if (!clean) return "?";
    var first = Array.from(clean)[0];
    return (first || "?").toUpperCase();
  }

  function validateName(value) {
    var clean = String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
    if (!clean)
      return {
        valid: false,
        message: "Please enter a name so we know what to call you.",
      };
    if (clean.length > 24)
      return {
        valid: false,
        message: "That name is too long | 24 characters at most.",
      };
    if (!NAME_RE.test(clean))
      return {
        valid: false,
        message: "That name contains characters we cannot store.",
      };
    return { valid: true, value: clean };
  }

  function validateTarget(value) {
    var str = String(value == null ? "" : value).trim();
    if (!TARGET_RE.test(str)) {
      return {
        valid: false,
        message: "Enter a whole number of minutes, for example 600.",
      };
    }
    return { valid: true, value: Number(str) };
  }

  function cacheElements() {
    [
      "onbRoot",
      "onbPanel",
      "onbStepCount",
      "onbTitle",
      "onbSub",
      "onbLive",
      "onbDots",
      "obName",
      "obNameError",
      "obTarget",
      "obTargetError",
      "onbPrev",
      "onbNext",
      "onbSkip",
      "obStep1",
      "obStep2",
      "obStep3",
      "obStep4",
      "obStep5",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
    els.live = els.onbLive;

    els.themeInputs = Array.prototype.slice.call(
      document.querySelectorAll('input[name="obTheme"]'),
    );
    els.unitInputs = Array.prototype.slice.call(
      document.querySelectorAll('input[name="obUnit"]'),
    );
    els.seedInputs = Array.prototype.slice.call(
      document.querySelectorAll('input[name="obSeed"]'),
    );
  }

  var STEPS = [
    {
      title: "What should we call you?",
      sub: "",
      done: "Nice to meet you",
    },
    {
      title: "Pick a theme",
      sub: "",
      done: "Theme set",
    },
    {
      title: "How do you want to plan?",
      sub: "Choose how durations are shown, and how many minutes you aim to plan each week.",
      done: "Plan set",
    },
    {
      title: "Start with sample tasks?",
      sub: "14 seeded example records to test with or begin from scratch",
      done: "Almost there",
    },
    {
      title: "Your planner is ready",
      sub: "A couple of things to know before you start.",
      done: "Ready",
    },
  ];

  function renderStep() {
    var step = STEPS[state.step];

    els.onbStepCount.textContent =
      "Step " + (state.step + 1) + " of " + STEPS.length;
    els.onbTitle.textContent = step.title;
    els.onbSub.textContent = step.sub;

    [els.obStep1, els.obStep2, els.obStep3, els.obStep4, els.obStep5].forEach(
      function (node, i) {
        if (node) node.hidden = i !== state.step;
      },
    );

    els.onbDots.innerHTML = STEPS.map(function (s, i) {
      var cls =
        i === state.step ? "is-active" : i < state.step ? "is-done" : "";
      return '<span class="onb__dot ' + cls + '" aria-hidden="true"></span>';
    }).join("");

    els.onbPrev.disabled = state.step === 0;
    els.onbNext.textContent =
      state.step === STEPS.length - 1 ? "Finish setup" : "Continue";

    if (els.live)
      els.live.textContent =
        "Step " + (state.step + 1) + " of " + STEPS.length + ": " + step.title;
  }

  function showError(node, message) {
    if (!node) return;
    node.textContent = message || "";
    var input = node.id === "obNameError" ? els.obName : els.obTarget;
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function previewTheme(theme) {
    var dark = theme === "dark";
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#14110f" : "#fc4f24");
    syncThemeButtons();
  }

  function focusFirst() {
    if (state.step === 1) {
      var theme = checkedOf(els.themeInputs);
      if (theme) {
        theme.focus();
        return;
      }
    }
    if (state.step === 0 && els.obName) {
      els.obName.focus();
      return;
    }
    if (state.step === 2 && els.obTarget) {
      els.obTarget.focus();
      return;
    }
    if (state.step === 3) {
      var seed = checkedOf(els.seedInputs);
      if (seed) {
        seed.focus();
        return;
      }
    }
    if (els.onbNext) els.onbNext.focus();
  }

  function checkedOf(list) {
    for (var i = 0; i < list.length; i++) if (list[i].checked) return list[i];
    return null;
  }

  function checkRadio(list, value) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].value === value) {
        list[i].checked = true;
        return list[i];
      }
    }
    return null;
  }

  function validateStep() {
    if (state.step === 0) {
      var name = validateName(els.obName.value);
      showError(els.obNameError, "");
      if (!name.valid) {
        showError(els.obNameError, name.message);
        els.obName.focus();
        return false;
      }
      state.name = name.value;
      return true;
    }
    if (state.step === 2) {
      var target = validateTarget(els.obTarget.value);
      showError(els.obTargetError, "");
      if (!target.valid) {
        showError(els.obTargetError, target.message);
        els.obTarget.focus();
        return false;
      }
      state.target = target.value;
    }
    return true;
  }

  function readChoices() {
    var theme = checkedOf(els.themeInputs);
    if (theme) state.theme = theme.value;

    var unit = checkedOf(els.unitInputs);
    if (unit) state.unit = unit.value;

    var targetInput = els.obTarget;
    if (targetInput && targetInput.value.trim())
      state.target = targetInput.value.trim();

    var seed = checkedOf(els.seedInputs);
    if (seed) state.seed = seed.value;
  }

  function next() {
    readChoices();
    if (!validateStep()) return;
    if (state.step < STEPS.length - 1) {
      state.step += 1;
      renderStep();
      focusFirst();
    } else {
      finish();
    }
  }

  function prev() {
    if (state.step > 0) {
      state.step -= 1;
      renderStep();
      focusFirst();
    }
  }

  function finish() {
    readChoices();
    var nameCheck = validateName(state.name || els.obName.value);
    var targetCheck = validateTarget(state.target);

    var profile = {
      name: nameCheck.valid
        ? nameCheck.value
        : (loadProfile() && loadProfile().name) || "Student",
      theme: state.theme,
      unit: state.unit,
      weeklyTarget: targetCheck.valid ? targetCheck.value : 600,
      seedChoice: state.seed,
      completedAt: new Date().toISOString(),
    };

    saveProfile(profile);
    try {
      localStorage.setItem(NAME_KEY, profile.name);
    } catch (err) {}
    applyPreferences(profile);
    applySeedChoice(state.seed);
    markComplete();

    var seededCount = window.App.State ? window.App.State.getCount() : 0;
    var message = "Welcome, " + profile.name + "!";
    if (state.seed === "empty")
      message += " Your planner is ready for your first task.";
    else message += " " + seededCount + " sample tasks are ready to explore.";

    close();
    window.App.UI.toast(message);
    window.App.UI.announcePolite(message);
    window.App.UI.render();
  }

  function applySeedChoice(choice) {
    var State = window.App.State;
    if (!State) return;
    if (choice === "empty") {
      State.startBlank();
    } else {
      var existing = Storage.load();
      if (!Array.isArray(existing) || existing.length === 0)
        State.resetToSeed();
      else Storage.saveSeedChoice("seeded");
    }
  }

  function skip() {
    var existing = loadProfile();
    var profile = {
      name: (existing && existing.name) || "Student",
      theme: state.theme,
      unit: state.unit,
      weeklyTarget: state.target,
      seedChoice: state.seed,
      skipped: true,
      completedAt: new Date().toISOString(),
    };
    saveProfile(profile);
    try {
      localStorage.setItem(NAME_KEY, profile.name);
    } catch (err) {}
    markComplete();
    close();
    window.App.UI.render();
    window.App.UI.announcePolite(
      "Setup skipped. You can finish it later in Settings.",
    );
  }

  function applyPreferences(profile) {
    if (profile.theme) {
      document.documentElement.setAttribute("data-theme", profile.theme);
      Storage.saveTheme(profile.theme);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta)
        meta.setAttribute(
          "content",
          profile.theme === "dark" ? "#14110f" : "#fc4f24",
        );
    }
    if (profile.unit)
      Storage.saveSettings(
        Object.assign({}, Storage.loadSettings(), { unit: profile.unit }),
      );
    if (profile.weeklyTarget != null) {
      Storage.saveSettings(
        Object.assign({}, Storage.loadSettings(), {
          weeklyTarget: profile.weeklyTarget,
        }),
      );
    }
    syncThemeButtons();
  }

  function syncThemeButtons() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    document
      .querySelectorAll("#themeToggle, #themeToggle2")
      .forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(dark));
        var glyph = btn.querySelector("i");
        if (glyph)
          glyph.className =
            "fa-solid fa-" + (dark ? "sun" : "moon") + " fa-icon";
        var label = document.getElementById("themeState");
        if (label) label.textContent = dark ? "On" : "Off";
      });
  }

  function open() {
    if (!els.onbRoot) return false;
    lastFocus = document.activeElement;
    isOpen = true;

    var profile = loadProfile();
    var name = profile ? profile.name : "";
    els.obName.value = name;
    state.name = name;
    state.theme = (profile && profile.theme) || detectTheme();
    state.unit = (profile && profile.unit) || "minutes";
    state.target =
      profile && profile.weeklyTarget != null ? profile.weeklyTarget : 600;

    var themeChecked = checkRadio(els.themeInputs, state.theme);
    if (!themeChecked && els.themeInputs[0]) els.themeInputs[0].checked = true;
    var unitChecked = checkRadio(els.unitInputs, state.unit);
    if (!unitChecked && els.unitInputs[0]) els.unitInputs[0].checked = true;
    var seedChecked = checkRadio(els.seedInputs, state.seed);
    if (!seedChecked && els.seedInputs[0]) els.seedInputs[0].checked = true;
    els.obTarget.value = state.target;

    state.step = 0;
    renderStep();
    previewTheme(state.theme);

    els.onbRoot.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () {
      if (isOpen && els.obName) els.obName.focus();
    }, 0);
    return true;
  }

  function close() {
    if (!els.onbRoot) return;
    isOpen = false;
    els.onbRoot.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  function detectTheme() {
    if (document.documentElement.getAttribute("data-theme") === "dark")
      return "dark";
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )
      return "dark";
    return "light";
  }

  function isOpen_() {
    return isOpen;
  }

  function onKeydown(event) {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      skip();
      return;
    }
    if (
      event.key === "Enter" &&
      event.target.tagName !== "TEXTAREA" &&
      event.target.tagName !== "BUTTON"
    ) {
      event.preventDefault();
      next();
      return;
    }
    if (event.key === "Tab") {
      var focusables = Array.prototype.filter.call(
        els.onbPanel.querySelectorAll("input, button:not([disabled])"),
        function (n) {
          return n.offsetParent !== null;
        },
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function start() {
    if (isComplete()) return false;
    cacheElements();
    if (!els.onbRoot) return false;

    var profile = loadProfile();
    if (profile) {
      state.theme = profile.theme || state.theme;
      if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
        Storage.saveTheme(profile.theme);
      }
    }

    bind();
    return open();
  }

  var bound = false;
  function bind() {
    if (bound) return;
    bound = true;

    els.onbNext.addEventListener("click", next);
    els.onbPrev.addEventListener("click", prev);
    els.onbSkip.addEventListener("click", skip);

    els.themeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        state.theme = input.value;
        previewTheme(input.value);
      });
    });

    els.unitInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        state.unit = input.value;
        if (window.App.UI && window.App.UI.render) window.App.UI.render();
      });
    });

    els.seedInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        state.seed = input.value;
      });
    });

    [els.obName, els.obTarget].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", function () {
        var err = input === els.obName ? els.obNameError : els.obTargetError;
        showError(err, "");
      });
    });

    document.addEventListener("keydown", onKeydown);
  }

  window.App = window.App || {};
  window.App.Onboarding = {
    start: start,
    open: open,
    close: close,
    isOpen: isOpen_,
    isComplete: isComplete,
    reset: reset,
    getName: getName,
    initial: initial,
    validateName: validateName,
    validateTarget: validateTarget,
    markComplete: markComplete,
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    NAME_RE: NAME_RE,
    TARGET_RE: TARGET_RE,
    PROFILE_KEY: PROFILE_KEY,
  };
})();
