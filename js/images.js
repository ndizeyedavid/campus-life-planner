(function () {
  "use strict";

  var DB_NAME = "campus-life-planner-images";
  var DB_VERSION = 1;
  var STORE = "images";

  var MAX_DIMENSION = 1200;
  var JPEG_QUALITY = 0.82;
  var MAX_INPUT_BYTES = 12 * 1024 * 1024;

  var ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
  ];

  var dbPromise = null;
  var memory = new Map();
  var usingMemory = false;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available."));
        return;
      }

      var request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        reject(err);
        return;
      }

      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, {
            keyPath: "id",
          });

          store.createIndex("taskId", "taskId", { unique: false });
        }
      };

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        reject(request.error || new Error("Could not open the image store."));
      };

      request.onblocked = function () {
        reject(new Error("The image store is blocked by another tab"));
      };
    }).catch(function (err) {
      console.warn(
        "Images: falling back to in-memory storage. Error: ",
        err.message,
      );
      usingMemory = true;
      return null;
    });

    return dbPromise;
  }

  var tx = function (mode, run) {
    return openDB().then(function (db) {
      if (!db) return run(null);
      return new Promise(function (resolve, reject) {
        var transaction;
        try {
          transaction = db.transaction(STORE, mode);
        } catch (err) {
          reject(err);
          return;
        }
        var store = transaction.objectStore(STORE);
        var result;
        try {
          result = run(store);
        } catch (err) {
          reject(err);
          return;
        }
        transaction.oncomplete = function () {
          resolve(result && result.__req ? result.__req.result : result);
        };
        transaction.onerror = function () {
          reject(transaction.error);
        };
        transaction.onabort = function () {
          reject(transaction.error || new Error("Image transaction aborted."));
        };
      });
    });
  };

  var urlCache = new Map();

  function cacheUrl(id, blob) {
    var existing = urlCache.get(id);
    if (existing) URL.revokeObjectURL(existing);
    var url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  }

  function peekUrl(id) {
    return urlCache.get(id) || null;
  }

  async function getUrl(id) {
    if (!id) return null;
    var cached = urlCache.get(id);
    if (cached) return cached;
    var record = await get(id);
    if (!record || !record.blob) return null;
    return cacheUrl(id, record.blob);
  }

  function revokeAll() {
    urlCache.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    urlCache.clear();
  }

  function forget(id) {
    var url = urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(id);
    }
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.onerror = function () {
        reject(new Error("The image could not be read."));
      };
      reader.readAsDataURL(file);
    });
  }

  function loadImageElement(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("That file is not a readable image."));
      };
      img.src = src;
    });
  }

  async function compress(dataUrl, type) {
    if (type === "image/svg+xml" || type === "image/gif") {
      return dataUrlToBlob(dataUrl, type);
    }

    var img = await loadImageElement(dataUrl);
    var width = img.naturalWidth;
    var height = img.naturalHeight;

    if (Math.max(width, height) <= MAX_DIMENSION) {
      return dataUrlToBlob(dataUrl, type);
    }

    var scale = MAX_DIMENSION / Math.max(width, height);
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    var ctx = canvas.getContext("2d");
    if (!ctx) return dataUrlToBlob(dataUrl, type);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    var out = canvas.toDataURL("image/webp", JPEG_QUALITY);
    if (!out || out.indexOf("data:image/webp") !== 0) {
      out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    }
    return dataUrlToBlob(out, out.split(";")[0].split(":")[1]);
  }

  function dataUrlToBlob(dataUrl, type) {
    var parts = String(dataUrl).split(",");
    var mime =
      (parts[0].match(/:(.*?);/) || [])[1] ||
      type ||
      "application/octet-stream";
    var binary = atob(parts[1] || "");
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function validateFile(file) {
    if (!file) return { valid: false, message: "No file chosen." };
    if (ACCEPTED_TYPES.indexOf(file.type) === -1) {
      return {
        valid: false,
        message: "Only images are allowed (JPEG, PNG, WebP, GIF, AVIF or SVG).",
      };
    }
    if (file.size > MAX_INPUT_BYTES) {
      return {
        valid: false,
        message: "That image is too large | the limit is 12 MB.",
      };
    }
    if (file.size === 0)
      return { valid: false, message: "That file is empty." };
    return { valid: true };
  }

  async function store(file, meta) {
    meta = meta || {};
    var check = validateFile(file);
    if (!check.valid) throw new Error(check.message);

    var dataUrl = await readFile(file);
    var blob = await compress(dataUrl, file.type);
    var dims = await probe(dataUrl);

    var id =
      "img_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8);
    var record = {
      id: id,
      taskId: meta.taskId || null,
      name: String(file.name || "image").slice(0, 120),
      type: blob.type || file.type,
      size: blob.size,
      width: dims.width,
      height: dims.height,
      alt: meta.alt || "",
      createdAt: new Date().toISOString(),
      blob: blob,
    };

    await tx("readwrite", function (store) {
      if (!store) {
        memory.set(record.id, record);
        return null;
      }
      store.put(record);
      return null;
    });

    cacheUrl(id, blob);
    return {
      id: id,
      name: record.name,
      size: record.size,
      width: record.width,
      height: record.height,
      type: record.type,
    };
  }

  async function probe(dataUrl) {
    try {
      var img = await loadImageElement(dataUrl);
      return { width: img.naturalWidth, height: img.naturalHeight };
    } catch (err) {
      return { width: 0, height: 0 };
    }
  }

  async function get(id) {
    if (!id) return null;
    return tx("readonly", function (store) {
      if (!store) return memory.get(id) || null;
      var request = store.get(id);
      return { __req: request };
    });
  }

  async function getMeta(id) {
    var record = await get(id);
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      size: record.size,
      width: record.width,
      height: record.height,
      alt: record.alt,
    };
  }

  async function remove(id) {
    if (!id) return false;
    forget(id);
    return tx("readwrite", function (store) {
      if (!store) return memory.delete(id);
      store.delete(id);
      return null;
    });
  }

  async function updateTask(id, taskId) {
    if (!id) return false;
    return tx("readwrite", function (store) {
      if (!store) {
        var mem = memory.get(id);
        if (!mem) return null;
        mem.taskId = taskId;
        memory.set(id, mem);
        return null;
      }
      var request = store.get(id);
      request.onsuccess = function () {
        var record = request.result;
        if (!record) return;
        record.taskId = taskId;
        store.put(record);
      };
      return null;
    });
  }

  async function allIds() {
    return tx("readonly", function (store) {
      if (!store) return Array.from(memory.keys());
      return new Promise(function (resolve, reject) {
        var out = [];
        var request = store.openCursor();
        request.onsuccess = function (event) {
          var cursor = event.target.result;
          if (cursor) {
            out.push(cursor.value.id);
            cursor.continue();
          } else resolve(out);
        };
        request.onerror = function () {
          reject(request.error);
        };
      });
    });
  }

  async function pruneOrphans(recordIds) {
    var keep = new Set(recordIds);
    var ids = await allIds();
    var doomed = ids.filter(function (id) {
      return !keep.has(id);
    });
    for (var i = 0; i < doomed.length; i++) await remove(doomed[i]);
    return doomed.length;
  }

  async function clear() {
    revokeAll();
    if (usingMemory) {
      memory.clear();
      return;
    }
    await tx("readwrite", function (store) {
      if (!store) {
        memory.clear();
        return null;
      }
      store.clear();
      return null;
    });
  }

  function formatBytes(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  window.App = window.App || {};
  window.App.Images = {
    ACCEPTED_TYPES: ACCEPTED_TYPES,
    MAX_DIMENSION: MAX_DIMENSION,
    MAX_INPUT_BYTES: MAX_INPUT_BYTES,
    init: openDB,
    validateFile: validateFile,
    store: store,
    get: get,
    getMeta: getMeta,
    getUrl: getUrl,
    peekUrl: peekUrl,
    forget: forget,
    revokeAll: revokeAll,
    remove: remove,
    updateTask: updateTask,
    allIds: allIds,
    pruneOrphans: pruneOrphans,
    clear: clear,
    formatBytes: formatBytes,
    isEphemeral: function () {
      return usingMemory;
    },
  };


});
