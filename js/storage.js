(function () {
  "use strict";

  var KEY = "campus-life-planner:data";
  var SETTINGS_KEY = "campus-life-planner:settings";
  var THEME_KEY = "campus-life-planner:theme";
  var SIDEBAR_KEY = "campus-life-planner:sidebar";
  var SEED_KEY = "campus-life-planner:seed-choice";

  var REQUIRED = [
    "id",
    "title",
    "dueDate",
    "duration",
    "category",
    "status",
    "createdAt",
    "updatedAt",
  ];
  var STATUSES = ["todo", "in-progress", "done"];
  var PRIORITIES = ["low", "medium", "high"];
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch (err) {
      console.warn("Storage: could not read " + key + " |", err);
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("Storage: could not write " + key + " |", err);
      return false;
    }
  }

  function load() {
    return read(KEY);
  }
  function save(data) {
    return write(KEY, data);
  }
  function loadSettings() {
    return read(SETTINGS_KEY);
  }
  function saveSettings(settings) {
    return write(SETTINGS_KEY, settings);
  }

  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return t === "dark" || t === "light" ? t : null;
    } catch (err) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadSidebar() {
    try {
      var s = localStorage.getItem(SIDEBAR_KEY);
      return s === "collapsed" || s === "expanded" ? s : null;
    } catch (err) {
      return null;
    }
  }

  function saveSidebar(state) {
    try {
      localStorage.setItem(SIDEBAR_KEY, state);
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadSeedChoice() {
    try {
      var v = localStorage.getItem(SEED_KEY);
      return v === "seeded" || v === "empty" ? v : null;
    } catch (err) {
      return null;
    }
  }

  function saveSeedChoice(choice) {
    try {
      localStorage.setItem(SEED_KEY, choice);
      return true;
    } catch (err) {
      return false;
    }
  }

  function isAvailable() {
    try {
      var probe = "__clp_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  function validateImport(payload) {
    var errors = [];

    var rawRecords = Array.isArray(payload)
      ? payload
      : payload && payload.records;
    var rawSettings = Array.isArray(payload)
      ? null
      : payload && payload.settings;

    if (!Array.isArray(rawRecords)) {
      return {
        valid: false,
        errors: [
          'The file must contain a JSON array of records, or an object with a "records" array.',
        ],
        records: [],
        settings: null,
      };
    }

    var seenIds = Object.create(null);

    rawRecords.forEach(function (rec, i) {
      var n = i + 1;
      if (rec === null || typeof rec !== "object" || Array.isArray(rec)) {
        errors.push("Record #" + n + " is not an object.");
        return;
      }
      REQUIRED.forEach(function (field) {
        if (rec[field] === undefined || rec[field] === null) {
          errors.push("Record #" + n + ' is missing "' + field + '".');
        }
      });
      if (typeof rec.id !== "string" || rec.id === "") {
        errors.push("Record #" + n + ' has a non-string or empty "id".');
      } else if (seenIds[rec.id]) {
        errors.push("Record #" + n + ' repeats the id "' + rec.id + '".');
      } else {
        seenIds[rec.id] = true;
      }
      if (typeof rec.title !== "string" || rec.title.trim() === "") {
        errors.push("Record #" + n + ' has an empty "title".');
      }
      var duration =
        typeof rec.duration === "number" ? rec.duration : Number(rec.duration);
      if (!isFinite(duration) || duration < 0) {
        errors.push(
          "Record #" +
            n +
            ' has an invalid "duration" (expected a non-negative number).',
        );
      }
      if (typeof rec.dueDate !== "string" || !ISO_DATE_RE.test(rec.dueDate)) {
        errors.push(
          "Record #" + n + ' has an invalid "dueDate" (expected YYYY-MM-DD).',
        );
      }
      if (STATUSES.indexOf(rec.status) === -1) {
        errors.push(
          "Record #" +
            n +
            ' has an unknown "status": ' +
            JSON.stringify(rec.status) +
            ".",
        );
      }
    });

    if (
      rawSettings != null &&
      (typeof rawSettings !== "object" || Array.isArray(rawSettings))
    ) {
      errors.push('"settings" must be an object.');
    }
    if (
      rawSettings &&
      rawSettings.categories != null &&
      !Array.isArray(rawSettings.categories)
    ) {
      errors.push('"settings.categories" must be an array of strings.');
    }

    return {
      valid: errors.length === 0,
      errors: errors.slice(0, 10),
      records: errors.length === 0 ? normaliseRecords(rawRecords) : [],
      settings: rawSettings || null,
    };
  }

  function tidy(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function normaliseRecords(list) {
    var used = Object.create(null);
    return list.map(function (rec, i) {
      var id =
        typeof rec.id === "string" && rec.id
          ? rec.id
          : "tsk_" + String(i + 1).padStart(4, "0");
      while (used[id]) id = id + "_";
      used[id] = true;

      var now = new Date().toISOString();
      return {
        id: id,
        title: tidy(rec.title),
        duration: Number(rec.duration) || 0,
        category: tidy(rec.category),
        dueDate: tidy(rec.dueDate),
        status: STATUSES.indexOf(rec.status) === -1 ? "todo" : rec.status,
        priority:
          PRIORITIES.indexOf(rec.priority) === -1 ? "medium" : rec.priority,
        notes: tidy(rec.notes),
        imageId:
          typeof rec.imageId === "string" && rec.imageId ? rec.imageId : null,
        createdAt: rec.createdAt || now,
        updatedAt: rec.updatedAt || rec.createdAt || now,
      };
    });
  }

  function download(filename, mime, text) {
    var blob = new Blob([text], { type: mime + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function exportJSON(payload) {
    download(
      "campus-life-planner-" + todayStamp() + ".json",
      "application/json",
      JSON.stringify(payload, null, 2),
    );
  }

  function csvCell(value) {
    var s = value == null ? "" : String(value);
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCSV(records) {
    var cols = [
      "id",
      "title",
      "category",
      "dueDate",
      "duration",
      "status",
      "priority",
      "notes",
      "createdAt",
      "updatedAt",
    ];
    var lines = [cols.join(",")];
    records.forEach(function (r) {
      lines.push(
        cols
          .map(function (c) {
            return csvCell(r[c]);
          })
          .join(","),
      );
    });
    return lines.join("\r\n") + "\r\n";
  }

  function exportCSV(records) {
    download(
      "campus-life-planner-" + todayStamp() + ".csv",
      "text/csv",
      toCSV(records),
    );
  }

  function importFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          resolve(JSON.parse(String(e.target.result)));
        } catch (err) {
          reject(new Error("That file is not valid JSON."));
        }
      };
      reader.onerror = function () {
        reject(new Error("The file could not be read."));
      };
      reader.readAsText(file);
    });
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok)
          throw new Error(
            "Could not load " + url + " (HTTP " + res.status + ").",
          );
        return res.json();
      })
      .catch(function (err) {
        throw new Error(
          err.message +
            " If you opened the page directly from disk, serve the folder over HTTP instead.",
        );
      });
  }

  function todayStamp() {
    var d = new Date();
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  window.App = window.App || {};
  window.App.Storage = {
    KEY: KEY,
    SETTINGS_KEY: SETTINGS_KEY,
    THEME_KEY: THEME_KEY,
    SIDEBAR_KEY: SIDEBAR_KEY,
    SEED_KEY: SEED_KEY,
    isAvailable: isAvailable,
    load: load,
    save: save,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadTheme: loadTheme,
    saveTheme: saveTheme,
    loadSidebar: loadSidebar,
    saveSidebar: saveSidebar,
    loadSeedChoice: loadSeedChoice,
    saveSeedChoice: saveSeedChoice,
    validateImport: validateImport,
    normaliseRecords: normaliseRecords,
    exportJSON: exportJSON,
    exportCSV: exportCSV,
    download: download,
    toCSV: toCSV,
    csvCell: csvCell,
    importFile: importFile,
    fetchJSON: fetchJSON,
  };
})();
