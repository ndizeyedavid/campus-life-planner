(function () {
  "use strict";

  var Storage = window.App.Storage;
  var Validators = window.App.Validators;

  var DEFAULT_SETTINGS = {
    unit: "minutes",
    weeklyTarget: 600,
    categories: ["Academics", "Sports", "Clubs", "Food", "Transport", "Other"],
  };

  var listeners = [];
  var state = {
    records: [],
    settings: Object.assign({}, DEFAULT_SETTINGS, {
      categories: DEFAULT_SETTINGS.categories.slice(),
    }),
    seeded: false,
  };

  function seedRecords() {
    var now = Date.now();
    var DAY = 86400000;
    var today = new Date();
    today.setHours(12, 0, 0, 0);

    function dateOffset(days) {
      var d = new Date(today.getTime() + days * DAY);
      var m = d.getMonth() + 1;
      var day = d.getDate();
      return (
        d.getFullYear() +
        "-" +
        (m < 10 ? "0" + m : m) +
        "-" +
        (day < 10 ? "0" + day : day)
      );
    }
    function ts(daysAgo) {
      return new Date(now - daysAgo * DAY).toISOString();
    }

    return [
      {
        id: "tsk_0001",
        title: "Study for midterm exam",
        duration: 120,
        category: "Academics",
        dueDate: dateOffset(2),
        status: "in-progress",
        priority: "high",
        notes: "Chapters 4-7, room B12",
        createdAt: ts(5),
        updatedAt: ts(1),
      },
      {
        id: "tsk_0002",
        title: "Buy coffee with friends",
        duration: 45,
        category: "Food",
        dueDate: dateOffset(0),
        status: "todo",
        priority: "low",
        notes: "catch up at 16:00 near the gate",
        createdAt: ts(3),
        updatedAt: ts(3),
      },
      {
        id: "tsk_0003",
        title: "Basketball practice",
        duration: 90,
        category: "Sports",
        dueDate: dateOffset(1),
        status: "todo",
        priority: "medium",
        notes: "",
        createdAt: ts(4),
        updatedAt: ts(4),
      },
      {
        id: "tsk_0004",
        title: "Submit assignment report",
        duration: 60,
        category: "Academics",
        dueDate: dateOffset(3),
        status: "todo",
        priority: "high",
        notes: "PDF format, 2000 words",
        createdAt: ts(2),
        updatedAt: ts(2),
      },
      {
        id: "tsk_0005",
        title: "Bus pass renewal",
        duration: 15,
        category: "Transport",
        dueDate: dateOffset(5),
        status: "done",
        priority: "medium",
        notes: "",
        createdAt: ts(6),
        updatedAt: ts(1),
      },
      {
        id: "tsk_0006",
        title: "Chemistry textbook reading",
        duration: 75,
        category: "Academics",
        dueDate: dateOffset(4),
        status: "in-progress",
        priority: "medium",
        notes: "Pages 120-180",
        createdAt: ts(7),
        updatedAt: ts(2),
      },
      {
        id: "tsk_0007",
        title: "Club meeting at 16:00",
        duration: 60,
        category: "Clubs",
        dueDate: dateOffset(1),
        status: "todo",
        priority: "low",
        notes: "Room 204",
        createdAt: ts(1),
        updatedAt: ts(1),
      },
      {
        id: "tsk_0008",
        title: "Lunch at cafeteria",
        duration: 30,
        category: "Food",
        dueDate: dateOffset(-1),
        status: "done",
        priority: "low",
        notes: "",
        createdAt: ts(2),
        updatedAt: ts(1),
      },
      {
        id: "tsk_0009",
        title: 'Group "project" sync, room 3',
        duration: 90,
        category: "Academics",
        dueDate: dateOffset(6),
        status: "todo",
        priority: "high",
        notes: "quote and comma escaping for CSV",
        createdAt: ts(0),
        updatedAt: ts(0),
      },
      {
        id: "tsk_0010",
        title: "Yoga session",
        duration: 45,
        category: "Sports",
        dueDate: dateOffset(2),
        status: "done",
        priority: "low",
        notes: "",
        createdAt: ts(3),
        updatedAt: ts(2),
      },
      {
        id: "tsk_0011",
        title: "Library book return",
        duration: 10,
        category: "Other",
        dueDate: dateOffset(7),
        status: "todo",
        priority: "medium",
        notes: "",
        createdAt: ts(1),
        updatedAt: ts(1),
      },
      {
        id: "tsk_0012",
        title: "Movie night",
        duration: 120,
        category: "Clubs",
        dueDate: dateOffset(4),
        status: "todo",
        priority: "low",
        notes: "duplicate-word edge case: movie movie",
        createdAt: ts(0),
        updatedAt: ts(0),
      },
      {
        id: "tsk_0013",
        title: "Physics lab report draft",
        duration: 0,
        category: "Other",
        dueDate: dateOffset(9),
        status: "todo",
        priority: "low",
        notes: "zero-duration edge case: 0 minutes",
        createdAt: ts(0),
        updatedAt: ts(0),
      },
      {
        id: "tsk_0014",
        title: "Archive the whole semester",
        duration: 9999.99,
        category: "Academics",
        dueDate: dateOffset(120),
        status: "todo",
        priority: "high",
        notes: "large-decimal edge case: 9999.99",
        createdAt: ts(0),
        updatedAt: ts(0),
      },
    ];
  }

  function init() {
    var stored = Storage.load();
    var choice = Storage.loadSeedChoice();

    if (Array.isArray(stored)) {
      state.records = Storage.normaliseRecords(stored);
    } else if (choice === "empty") {
      state.records = [];
      Storage.save(state.records);
    } else {
      state.records = seedRecords();
      state.seeded = true;
      Storage.save(state.records);
    }

    var settings = Storage.loadSettings();
    if (settings && typeof settings === "object") {
      state.settings.unit = settings.unit === "hours" ? "hours" : "minutes";
      var target = Number(settings.weeklyTarget);
      state.settings.weeklyTarget =
        isFinite(target) && target >= 0
          ? target
          : DEFAULT_SETTINGS.weeklyTarget;
      state.settings.categories =
        Array.isArray(settings.categories) && settings.categories.length
          ? settings.categories.map(Validators.sanitizeText).filter(Boolean)
          : DEFAULT_SETTINGS.categories.slice();
    }
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function emit() {
    listeners.slice().forEach(function (fn) {
      try {
        fn(state);
      } catch (err) {
        console.error("State listener failed:", err);
      }
    });
  }

  function getRecords() {
    return state.records.slice();
  }
  function getCount() {
    return state.records.length;
  }

  function getRecord(id) {
    return (
      state.records.find(function (r) {
        return r.id === id;
      }) || null
    );
  }

  function nextId() {
    var max = 0;
    state.records.forEach(function (r) {
      var m = /(\d+)\s*$/.exec(r.id || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "tsk_" + String(max + 1).padStart(4, "0");
  }

  function addRecord(data) {
    var clean = cleanRecord(data);
    clean.id = nextId();
    var now = new Date().toISOString();
    clean.createdAt = now;
    clean.updatedAt = now;
    state.records.unshift(clean);
    persist();
    return clean;
  }

  function updateRecord(id, data) {
    var idx = state.records.findIndex(function (r) {
      return r.id === id;
    });
    if (idx === -1) return null;
    var existing = state.records[idx];
    var clean = cleanRecord(data);
    clean.id = existing.id;
    clean.createdAt = existing.createdAt;
    clean.updatedAt = new Date().toISOString();
    state.records[idx] = clean;
    persist();
    return clean;
  }

  function deleteRecord(id) {
    var before = state.records.length;
    state.records = state.records.filter(function (r) {
      return r.id !== id;
    });
    if (state.records.length === before) return false;
    persist();
    return true;
  }

  function updateStatus(id, status) {
    var rec = getRecord(id);
    if (!rec || rec.status === status) return rec || null;
    rec.status = status;
    rec.updatedAt = new Date().toISOString();
    persist();
    return rec;
  }

  function patchRecord(id, patch) {
    var rec = getRecord(id);
    if (!rec) return null;
    Object.keys(patch).forEach(function (key) {
      rec[key] = patch[key];
    });
    rec.updatedAt = new Date().toISOString();
    persist();
    return rec;
  }

  function cleanRecord(data) {
    var duration = Number(Validators.sanitizeText(data.duration));
    return {
      title: Validators.sanitizeText(data.title),
      duration: isFinite(duration) && duration >= 0 ? duration : 0,
      category: Validators.sanitizeText(data.category),
      dueDate: Validators.sanitizeText(data.dueDate),
      status:
        ["todo", "in-progress", "done"].indexOf(data.status) === -1
          ? "todo"
          : data.status,
      priority:
        ["low", "medium", "high"].indexOf(data.priority) === -1
          ? "medium"
          : data.priority,
      notes: Validators.sanitizeText(data.notes),
      imageId: data.imageId || null,
    };
  }

  function replaceAll(records) {
    state.records = Storage.normaliseRecords(records);
    persist();
    return state.records.slice();
  }

  function clearAll() {
    state.records = [];
    persist();
  }

  function startBlank() {
    state.records = [];
    state.seeded = false;
    Storage.saveSeedChoice("empty");
    Storage.save(state.records);
    emit();
  }

  function resetToSeed() {
    state.records = seedRecords();
    state.seeded = true;
    Storage.saveSeedChoice("seeded");
    Storage.save(state.records);
    emit();
  }

  function persist() {
    var ok = Storage.save(state.records);
    if (!ok) {
      console.error("State: could not persist records to localStorage.");
    }
    emit();
    return ok;
  }

  function getSettings() {
    return {
      unit: state.settings.unit,
      weeklyTarget: state.settings.weeklyTarget,
      categories: state.settings.categories.slice(),
    };
  }

  function saveSettings(next) {
    if (next.unit)
      state.settings.unit = next.unit === "hours" ? "hours" : "minutes";
    if (next.weeklyTarget != null) {
      var t = Number(next.weeklyTarget);
      state.settings.weeklyTarget =
        isFinite(t) && t >= 0 ? t : state.settings.weeklyTarget;
    }
    Storage.saveSettings(state.settings);
    emit();
  }

  function setUnit(unit) {
    state.settings.unit = unit === "hours" ? "hours" : "minutes";
    Storage.saveSettings(state.settings);
    emit();
  }

  function setWeeklyTarget(minutes) {
    var t = Number(minutes);
    state.settings.weeklyTarget = isFinite(t) && t >= 0 ? t : 0;
    Storage.saveSettings(state.settings);
    emit();
  }

  function addCategory(name) {
    var clean = Validators.sanitizeText(name);
    if (!Validators.CATEGORY_RE.test(clean))
      return { ok: false, reason: "invalid" };
    if (
      state.settings.categories.some(function (c) {
        return c.toLowerCase() === clean.toLowerCase();
      })
    ) {
      return { ok: false, reason: "duplicate" };
    }
    state.settings.categories.push(clean);
    Storage.saveSettings(state.settings);
    emit();
    return { ok: true, category: clean };
  }

  function removeCategory(name) {
    var before = state.settings.categories.length;
    state.settings.categories = state.settings.categories.filter(function (c) {
      return c !== name;
    });
    if (state.settings.categories.length === before) return false;
    Storage.saveSettings(state.settings);
    emit();
    return true;
  }

  function setCategories(cats) {
    if (!Array.isArray(cats)) return;
    var clean = cats
      .map(function (c) {
        return Validators.sanitizeText(c);
      })
      .filter(function (c) {
        return c && Validators.CATEGORY_RE.test(c);
      });
    state.settings.categories = Array.from(new Set(clean));
    Storage.saveSettings(state.settings);
    emit();
  }

  window.App = window.App || {};
  window.App.State = {
    init: init,
    subscribe: subscribe,
    getRecords: getRecords,
    getCount: getCount,
    getRecord: getRecord,
    addRecord: addRecord,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    updateStatus: updateStatus,
    patchRecord: patchRecord,
    replaceAll: replaceAll,
    clearAll: clearAll,
    startBlank: startBlank,
    resetToSeed: resetToSeed,
    getSettings: getSettings,
    saveSettings: saveSettings,
    setUnit: setUnit,
    setWeeklyTarget: setWeeklyTarget,
    addCategory: addCategory,
    removeCategory: removeCategory,
    setCategories: setCategories,
    seedRecords: seedRecords,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  };
})();
