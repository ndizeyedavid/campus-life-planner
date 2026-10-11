(function () {
  "use strict";

  var State = window.App.State;
  var UI = window.App.UI;
  var Storage = window.App.Storage;
  var Validators = window.App.Validators;
  var Images = window.App.Images;

  var THEME_META = { light: "#fc4f24", dark: "#14110f" };

  function el(id) {
    return document.getElementById(id);
  }

  function on(id, event, handler) {
    var node = el(id);
    if (node) node.addEventListener(event, handler);
    return node;
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    var dark = theme === "dark";
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
    Storage.saveTheme(dark ? "dark" : "light");

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", dark ? THEME_META.dark : THEME_META.light);

    ["themeToggle", "themeToggle2"].forEach(function (id) {
      var btn = el(id);
      if (!btn) return;
      btn.setAttribute("aria-pressed", String(dark));
      var glyph = btn.querySelector("i");
      if (glyph)
        glyph.className = "fa-solid fa-" + (dark ? "sun" : "moon") + " fa-icon";
      var label = el("themeState");
      if (label) label.textContent = dark ? "On" : "Off";
      var srText = el("themeToggleLabel");
      if (srText)
        srText.textContent = dark
          ? "Switch to the light theme"
          : "Switch to the dark theme";
    });
  }

  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    if (UI.refreshTrendTheme) UI.refreshTrendTheme();
    UI.toast(next === "dark" ? "Dark theme on." : "Light theme on.");
    UI.announcePolite(
      next === "dark" ? "Dark theme enabled." : "Light theme enabled.",
    );
  }

  function isCollapsed() {
    return (
      document.documentElement.getAttribute("data-sidebar") === "collapsed"
    );
  }

  function isDesktop() {
    return window.matchMedia("(min-width: 768px)").matches;
  }

  function applySidebar(collapsed) {
    document.documentElement.setAttribute(
      "data-sidebar",
      collapsed ? "collapsed" : "expanded",
    );
    Storage.saveSidebar(collapsed ? "collapsed" : "expanded");

    var btn = el("sidebarToggle");
    if (btn) {
      btn.setAttribute("aria-expanded", String(!collapsed));
      var glyph = btn.querySelector("i");
      if (glyph)
        glyph.className =
          "fa-solid fa-" +
          (collapsed ? "angles-right" : "angles-left") +
          " fa-icon";
      var label = el("sidebarToggleLabel");
      if (label)
        label.textContent = collapsed ? "Expand sidebar" : "Collapse sidebar";
      btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    }
  }

  function toggleSidebar() {
    if (!isDesktop()) return;
    var next = !isCollapsed();
    applySidebar(next);
    UI.announcePolite(
      next ? "Sidebar collapsed to icons." : "Sidebar expanded.",
    );
  }

  function focusQuickFind() {
    var find = el("quickFind");
    if (!find) return false;

    if (isDesktop() && isCollapsed()) applySidebar(false);
    find.focus();
    if (typeof find.select === "function") find.select();
    UI.announcePolite(
      "Quick find focused. Type a search term and press Enter.",
    );
    return true;
  }

  var lastDrawerTrigger = null;

  function openDrawer(trigger) {
    var sidebar = el("sidebar");
    if (!sidebar) return;
    lastDrawerTrigger = trigger || document.activeElement;
    sidebar.classList.add("is-open");
    el("backdrop").hidden = false;
    var opener = el("sidebarOpen");
    if (opener) opener.setAttribute("aria-expanded", "true");
    var close = el("sidebarClose");
    if (close) close.focus();
  }

  function closeDrawer() {
    var sidebar = el("sidebar");
    if (!sidebar || !sidebar.classList.contains("is-open")) return;
    sidebar.classList.remove("is-open");
    el("backdrop").hidden = true;
    var opener = el("sidebarOpen");
    if (opener) opener.setAttribute("aria-expanded", "false");
    if (lastDrawerTrigger && document.contains(lastDrawerTrigger))
      lastDrawerTrigger.focus();
    lastDrawerTrigger = null;
  }

  function applyImport(payload) {
    var check = Storage.validateImport(payload);
    if (!check.valid) {
      UI.toast("Import rejected | " + check.errors[0]);
      UI.announceAssertive("Import rejected. " + check.errors[0]);
      return false;
    }

    var settings = check.settings;
    var records = check.records;

    var accepted = [];
    var skipped = [];
    records.forEach(function (rec) {
      var result = Validators.validateTask(rec);
      if (result.valid) accepted.push(rec);
      else
        skipped.push(rec.title + " (" + Object.values(result.errors)[0] + ")");
    });

    if (!accepted.length) {
      var first = skipped[0] || "unknown record";
      UI.toast("Import rejected | " + first);
      UI.announceAssertive(
        "Import rejected. No valid records found. First problem: " + first,
      );
      return false;
    }

    State.replaceAll(accepted);
    if (settings) {
      if (settings.unit) State.setUnit(settings.unit);
      if (settings.weeklyTarget != null)
        State.setWeeklyTarget(settings.weeklyTarget);
      if (Array.isArray(settings.categories))
        State.setCategories(settings.categories);
    }

    var message =
      "Imported " +
      accepted.length +
      (accepted.length === 1 ? " record" : " records") +
      ".";
    if (skipped.length)
      message += " Skipped " + skipped.length + " invalid: " + skipped[0];

    var dangling = 0;

    Promise.all(
      accepted
        .filter(function (r) {
          return !!r.imageId;
        })
        .map(function (r) {
          return Images.getMeta(r.imageId).then(function (meta) {
            if (meta) return null;
            dangling += 1;
            State.patchRecord(r.id, { imageId: null });
            return null;
          });
        }),
    )
      .then(function () {
        var keepIds = State.getRecords()
          .filter(function (r) {
            return !!r.imageId;
          })
          .map(function (r) {
            return r.imageId;
          });
        return Images.pruneOrphans(keepIds);
      })
      .then(function () {
        var note = dangling
          ? " " +
            dangling +
            " image" +
            (dangling === 1 ? "" : "s") +
            " skipped | not on this device."
          : "";
        UI.toast(message + note);
        UI.announcePolite(message + note);
        renderImageStorage();
        updateIcsLabel();
      });

    return true;
  }

  function ensureImportInput() {
    if (el("importFile")) return el("importFile");
    var input = document.createElement("input");
    input.type = "file";
    input.id = "importFile";
    input.accept = ".json,application/json";
    input.hidden = true;
    document.body.appendChild(input);
    return input;
  }

  function openImportPicker() {
    ensureImportInput().click();
  }

  function handleImportFile(event) {
    var input = event.target;
    var file = input.files && input.files[0];
    if (!file) return;

    Storage.importFile(file)
      .then(applyImport)
      .catch(function (err) {
        UI.toast("Import error: " + err.message);
        UI.announceAssertive("Import error: " + err.message);
      })
      .finally(function () {
        input.value = "";
      });
  }

  function loadSeedFile() {
    UI.toast("Fetching seed.json…");
    Storage.fetchJSON("seed.json")
      .then(applyImport)
      .catch(function (err) {
        UI.toast(err.message);
        UI.announceAssertive(err.message);
      });
  }

  function saveSettings(event) {
    if (event) event.preventDefault();

    var unit = el("unitSelect").value;
    var rawTarget = String(el("capInput").value).trim();
    var errorNode = el("capError");

    if (!/^(0|[1-9]\d*)$/.test(rawTarget)) {
      errorNode.textContent =
        "Target must be a whole number of minutes, e.g. 600.";
      el("capInput").setAttribute("aria-invalid", "true");
      el("capInput").focus();
      UI.announceAssertive("Weekly target is not valid.");
      return;
    }

    errorNode.textContent = "";
    el("capInput").removeAttribute("aria-invalid");
    State.saveSettings({ unit: unit, weeklyTarget: Number(rawTarget) });
    UI.toast("Settings saved.");
    UI.announcePolite(
      "Settings saved. Display unit: " +
        unit +
        ". Weekly target: " +
        rawTarget +
        " minutes.",
    );
  }

  function addCategoryFromInput() {
    var input = el("newCatInput");
    if (!input) return;
    var errorNode = el("catError");
    var result = State.addCategory(input.value);

    if (result.ok) {
      input.value = "";
      errorNode.textContent = "";
      input.classList.remove("is-invalid");
      UI.toast('Category "' + result.category + '" added.');
      UI.announcePolite("Category " + result.category + " added.");
      input.focus();
    } else {
      var msg =
        result.reason === "duplicate"
          ? "That category already exists."
          : "Use letters, single spaces and hyphens only.";
      errorNode.textContent = msg;
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      UI.announceAssertive(msg);
    }
  }

  function bindChrome() {
    on("sidebarOpen", "click", function () {
      openDrawer(this);
    });
    on("sidebarClose", "click", closeDrawer);
    on("backdrop", "click", closeDrawer);

    on("sidebarToggle", "click", toggleSidebar);
    on("sidebarExpand", "click", function () {
      applySidebar(false);
      focusQuickFind();
    });

    applySidebar(isCollapsed());

    var kbd = el("quickFindKbd");
    if (kbd) {
      var isMac = /Mac|iPhone|iPad/.test(
        navigator.platform || navigator.userAgent,
      );
      kbd.textContent = isMac ? "⌘K" : "Ctrl K";
    }

    var sidebar = el("sidebar");
    if (sidebar) {
      sidebar.addEventListener("click", function (event) {
        if (
          event.target.closest("a[href]") &&
          window.matchMedia("(max-width: 767px)").matches
        )
          closeDrawer();
      });
    }

    on("themeToggle", "click", toggleTheme);
    on("themeToggle2", "click", toggleTheme);

    var year = el("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function bindTaskDialog() {
    on("addTaskBtn", "click", UI.openNewModal);
    on("taskForm", "submit", UI.submitTaskForm);
    on("taskForm", "input", UI.liveValidate);
    on("modalClose", "click", UI.closeModal);
    on("taskImage", "change", UI.handleImageChosen);
    on("taskImageClear", "click", UI.clearStagedImage);

    document.querySelectorAll("[data-close-modal]").forEach(function (node) {
      node.addEventListener("click", UI.closeModal);
    });
    document.querySelectorAll("[data-close-confirm]").forEach(function (node) {
      node.addEventListener("click", UI.closeConfirm);
    });
    on("confirmOk", "click", UI.executeConfirm);
  }

  function bindDataActions() {
    ensureImportInput();

    on("exportBtn", "click", UI.exportData);
    on("exportBtn2", "click", UI.exportData);
    on("exportCsvBtn", "click", UI.exportCsv);
    on("exportIcsBtn", "click", UI.exportICS);
    on("copyIcsBtn", "click", UI.copyICS);
    on("includeDoneCalendar", "change", updateIcsLabel);
    on("importBtn", "click", openImportPicker);
    on("importBtn2", "click", openImportPicker);
    on("importFile", "change", handleImportFile);
    on("loadSeedBtn", "click", loadSeedFile);

    on("resetBtn", "click", function () {
      UI.openConfirm({
        heading: "Restore seed data?",
        body: "Every task you have created will be replaced with the 14 starter records. This cannot be undone.",
        confirmLabel: "Restore seed data",
        onConfirm: function () {
          State.resetToSeed();
          updateIcsLabel();
          UI.toast("Seed data restored.");
          UI.announcePolite("Seed data restored | 14 records.");
        },
      });
    });

    on("clearBtn", "click", function () {
      UI.openConfirm({
        heading: "Delete every record?",
        body:
          "All " +
          State.getCount() +
          " records will be removed from this browser. Export a backup first if you need one.",
        confirmLabel: "Delete all",
        onConfirm: function () {
          State.clearAll();
          Images.clear();
          UI.toast("All records and images deleted.");
          UI.announcePolite("All records and images deleted.");
          renderImageStorage();
        },
      });
    });
  }

  async function renderImageStorage() {
    var node = el("imageStorage");
    if (!node) return;

    if (!navigator.storage || !navigator.storage.estimate) {
      node.textContent = Images.isEphemeral()
        ? "This browser cannot store images persistently | attachments will be lost on reload."
        : "Storage usage is not reported by this browser.";
      return;
    }

    try {
      var estimate = await navigator.storage.estimate();
      var used = estimate.usage || 0;
      var quota = estimate.quota || 0;
      node.textContent = Images.isEphemeral()
        ? "Storage unavailable in this context | attachments will be lost on reload."
        : "About " +
          Images.formatBytes(used) +
          " used" +
          (quota
            ? " of roughly " +
              Images.formatBytes(quota) +
              " available of Local IndexDB"
            : "") +
          ".";
    } catch (err) {
      node.textContent = "Storage usage is unavailable.";
    }
  }

  function bindImages() {
    on("imageStatsBtn", "click", function () {
      renderImageStorage();
      UI.toast("Image storage refreshed.");
    });

    on("clearImagesBtn", "click", function () {
      UI.openConfirm({
        heading: "Delete every image?",
        body: "All task attachments will be permanently removed from this device. The tasks themselves are kept.",
        confirmLabel: "Delete all images",
        onConfirm: function () {
          Images.clear().then(function () {
            UI.toast("All images deleted.");
            UI.announcePolite("All images deleted.");
            renderImageStorage();
            updateIcsLabel();
          });
        },
      });
    });
  }

  function bindTable() {
    if (!el("recordsBody")) return;

    document.querySelectorAll(".sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        UI.setSort(btn.dataset.sort);
      });
    });

    on("recordsBody", "click", function (event) {
      var editBtn = event.target.closest("[data-edit]");
      var delBtn = event.target.closest("[data-delete]");
      var calBtn = event.target.closest("[data-addcal]");
      if (editBtn) UI.openEditModal(editBtn.dataset.edit);
      if (delBtn) UI.confirmDelete(delBtn.dataset.delete);
      if (calBtn) UI.addToGoogleCalendar(calBtn.dataset.addcal);
    });

    on("searchInput", "input", UI.updateSearch);
    on("clearSearch", "click", UI.clearSearch);
    on("caseToggle", "click", function () {
      var pressed = this.getAttribute("aria-pressed") === "true";
      this.setAttribute("aria-pressed", String(!pressed));
      UI.updateSearch();
      UI.announcePolite(
        !pressed ? "Case-sensitive search on." : "Case-insensitive search on.",
      );
    });
  }

  function bindCalendar() {
    on("calPrev", "click", function () {
      UI.shiftMonth(-1);
    });
    on("calNext", "click", function () {
      UI.shiftMonth(1);
    });
    on("calToday", "click", UI.goToToday);
  }

  function bindSettings() {
    on("settingsForm", "submit", saveSettings);
    on("addCatBtn", "click", addCategoryFromInput);
    on("cacheToggle", "click", toggleOfflineCache);
    on("saveNameBtn", "click", saveProfileName);
    on("replayIntroBtn", "click", replayIntro);
    on("clearProfileBtn", "click", clearProfile);

    var newCat = el("newCatInput");
    if (newCat) {
      newCat.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          addCategoryFromInput();
        }
      });
      newCat.addEventListener("input", function () {
        el("catError").textContent = "";
        this.classList.remove("is-invalid");
        this.removeAttribute("aria-invalid");
      });
    }

    var catList = el("catList");
    if (catList) {
      catList.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-rm-cat]");
        if (!btn) return;
        var name = btn.dataset.rmCat;
        var used = State.getRecords().filter(function (r) {
          return r.category === name;
        }).length;
        UI.openConfirm({
          heading: 'Remove "' + name + '"',
          body: used
            ? used +
              (used === 1 ? " task still uses" : " tasks still use") +
              " this category. The tasks are kept."
            : "No tasks use this category.",
          confirmLabel: "Remove category",
          onConfirm: function () {
            State.removeCategory(name);
            UI.toast("Category removed.");
            UI.announcePolite("Category " + name + " removed.");
          },
        });
      });
    }
  }

  function updateIcsLabel() {
    var label = el("exportIcsLabel");
    var Calendar = window.App.Calendar;
    if (!label || !Calendar) return;
    var count = Calendar.countExportable(State.getRecords(), {
      includeDone: !!(
        el("includeDoneCalendar") && el("includeDoneCalendar").checked
      ),
    });
    label.textContent = count
      ? "Export " + count + (count === 1 ? " task" : " tasks") + " (.ics)"
      : "Export .ics";
  }

  function saveProfileName() {
    var Onboarding = window.App.Onboarding;
    var input = el("profileName");
    var errorNode = el("profileError");
    if (!Onboarding || !input) return;

    var result = Onboarding.validateName(input.value);
    errorNode.textContent = "";
    input.removeAttribute("aria-invalid");

    if (!result.valid) {
      errorNode.textContent = result.message;
      input.setAttribute("aria-invalid", "true");
      input.focus();
      UI.announceAssertive(result.message);
      return;
    }

    var profile = Onboarding.loadProfile() || {};
    profile.name = result.value;
    profile.completedAt = profile.completedAt || new Date().toISOString();
    Onboarding.saveProfile(profile);
    try {
      localStorage.setItem("campus-life-planner:name", result.value);
    } catch (err) {}

    UI.render();
    UI.toast("Name updated.");
    UI.announcePolite("Name updated to " + result.value + ".");
  }

  function replayIntro() {
    var Onboarding = window.App.Onboarding;
    if (!Onboarding) return;
    Onboarding.reset();
    window.location.href = "index.html";
  }

  function clearProfile() {
    var Onboarding = window.App.Onboarding;
    if (!Onboarding) return;
    UI.openConfirm({
      heading: "Forget your details?",
      body: "Your name and setup choices will be removed from this browser, and the intro will run again next time. Your tasks are not affected.",
      confirmLabel: "Forget me",
      onConfirm: function () {
        Onboarding.reset();
        UI.toast("Details cleared.");
        UI.announcePolite("Your details have been cleared.");
        setTimeout(function () {
          window.location.href = "index.html";
        }, 400);
      },
    });
  }

  function isTyping(target) {
    if (!target) return false;
    var tag = (target.tagName || "").toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      target.isContentEditable
    );
  }

  function handleKeydown(event) {
    var Onboarding = window.App.Onboarding;
    if (Onboarding && Onboarding.isOpen()) return;

    var taskModal = el("taskModal");
    var confirmModal = el("confirmModal");

    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      (event.key === "k" || event.key === "K")
    ) {
      if (focusQuickFind()) {
        event.preventDefault();
        return;
      }
    }

    if (event.key === "Escape") {
      if (confirmModal && !confirmModal.hidden) {
        UI.closeConfirm();
        return;
      }
      if (taskModal && !taskModal.hidden) {
        UI.closeModal();
        return;
      }
      closeDrawer();
      return;
    }

    if (UI.anyModalOpen() && UI.trapTab(event)) return;

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTyping(event.target) || UI.anyModalOpen()) return;

    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      UI.openNewModal();
    } else if (event.key === "/") {
      if (focusQuickFind()) event.preventDefault();
    }
  }

  function registerServiceWorker() {
    var status = el("cacheState");
    if (!("serviceWorker" in navigator) || location.protocol === "file:") {
      if (status) status.textContent = "Unavailable";
      var toggle = el("cacheToggle");
      if (toggle) {
        toggle.disabled = true;
        toggle.setAttribute("aria-disabled", "true");
      }
      return;
    }

    navigator.serviceWorker
      .register("sw.js")
      .then(function (reg) {
        setCacheState(!!reg.active, reg.active ? "On" : "Installing…");
      })
      .catch(function (err) {
        console.warn("Service worker registration failed:", err);
        if (status) status.textContent = "Unavailable";
      });
  }

  function setCacheState(active, text) {
    var status = el("cacheState");
    var toggle = el("cacheToggle");
    if (status) status.textContent = text;
    if (toggle) toggle.setAttribute("aria-pressed", String(active));
  }

  function toggleOfflineCache() {
    if (!("serviceWorker" in navigator)) {
      UI.toast("This browser cannot cache the app for offline use.");
      return;
    }
    var toggle = el("cacheToggle");
    if (toggle && toggle.getAttribute("aria-pressed") === "true") {
      navigator.serviceWorker
        .getRegistrations()
        .then(function (regs) {
          return Promise.all(
            regs.map(function (r) {
              return r.unregister();
            }),
          );
        })
        .then(function () {
          setCacheState(false, "Off");
          caches.keys().then(function (keys) {
            return Promise.all(
              keys.map(function (k) {
                return caches.delete(k);
              }),
            );
          });
          UI.toast("Offline cache cleared.");
          UI.announcePolite("Offline cache disabled.");
        })
        .catch(function () {
          UI.toast("Could not disable the offline cache.");
        });
    } else {
      UI.toast("Enabling offline mode…");
      navigator.serviceWorker
        .register("sw.js")
        .then(function () {
          return navigator.serviceWorker.ready;
        })
        .then(function () {
          setCacheState(true, "On");
          UI.toast("Offline mode on.");
          UI.announcePolite("Offline mode enabled.");
        })
        .catch(function (err) {
          setCacheState(false, "Unavailable");
          UI.toast("Offline mode failed: " + err.message);
        });
    }
  }

  var MIN_SPLASH_MS = 700;
  var MAX_SPLASH_MS = 6000;

  function setBootStatus(message) {
    var node = el("bootStatus");
    if (node) node.textContent = message;
  }

  function hideSplash() {
    var splash = el("bootSplash");
    if (!splash) return Promise.resolve();
    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      splash.remove();
      return Promise.resolve();
    }
    splash.classList.add("is-leaving");
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
        resolve();
      }, 280);
    });
  }

  function waitForLoad() {
    return new Promise(function (resolve) {
      if (document.readyState === "complete") {
        resolve();
        return;
      }
      var done = false;
      var finish = function () {
        if (!done) {
          done = true;
          resolve();
        }
      };
      window.addEventListener("load", finish, { once: true });
      setTimeout(finish, 2500);
    });
  }

  function bootSequence() {
    var page = document.body.dataset.page || "dashboard";
    var started = Date.now();
    var Onboarding = window.App.Onboarding;
    var needsOnboarding = Onboarding && !Onboarding.isComplete();

    setBootStatus("Preparing your planner…");

    return waitForLoad()
      .then(function () {
        setBootStatus("Almost ready…");
        var elapsed = Date.now() - started;
        var wait = Math.max(0, MIN_SPLASH_MS - elapsed);
        return new Promise(function (r) {
          setTimeout(r, wait);
        });
      })
      .then(function () {
        return hideSplash();
      })
      .then(function () {
        if (!Onboarding) return;

        if (needsOnboarding) {
          if (page !== "dashboard") {
            window.location.replace("index.html");
            return;
          }
          setTimeout(function () {
            Onboarding.start();
          }, 120);
          return;
        }

        if (
          page !== "dashboard" &&
          !document.referrer.includes(window.location.hostname)
        ) {
          var nav =
            performance.getEntriesByType &&
            performance.getEntriesByType("navigation")[0];
          var cameFromSite =
            nav &&
            nav.type === "navigate" &&
            document.referrer &&
            document.referrer.split("/")[2] === window.location.hostname;
          if (!cameFromSite) window.location.replace("index.html");
        }
      });
  }

  function init() {
    if (!Storage.isAvailable()) {
      document.addEventListener("DOMContentLoaded", function () {
        UI.toast("Storage is blocked | changes will not be saved.");
      });
    }

    State.init();
    State.subscribe(function () {
      UI.render();
    });

    bindChrome();
    bindTaskDialog();
    bindDataActions();
    bindTable();
    bindCalendar();
    bindSettings();
    bindImages();

    if (el("searchInput")) UI.syncSearchFromUrl();

    UI.render();
    document.addEventListener("keydown", handleKeydown);
    registerServiceWorker();
    renderImageStorage();
    updateIcsLabel();

    window.addEventListener("pagehide", function () {
      Images.revokeAll();
    });

    bootSequence().then(function () {
      var Onboarding = window.App.Onboarding;
      if (Onboarding && Onboarding.isOpen()) return;
      if (window.location.hash) {
        var target = document.querySelector(window.location.hash);
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus();
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
