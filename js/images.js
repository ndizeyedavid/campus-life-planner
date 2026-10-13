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
});
