(function () {
  "use strict";

  var TITLE_RE = /^\S(?:.*\S)?$/;
  var DOUBLE_SPACE_RE = /\s{2,}/;
  var MESSY_WHITESPACE_RE = /\s{2,}|[\t\n\r\f\v]/;
  var DURATION_RE = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
  var DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  var CATEGORY_RE = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
  var DUPLICATE_WORD_RE = /\b(\w+)\s+\1\b/i;
  var DANGLING_WORD_RE =
    /^(?!.*\b(?:for|to|with|and|or|the|a|an|of|in|on|at|by|is)\s*$)[\s\S]+$/i;

  var TIME_TOKEN_RE = /(?<!\d)\d{2}:\d{2}(?!\d)/;
  var TIME_TOKEN_FALLBACK_RE = /\b\d{2}:\d{2}\b/;

  var MAX_TITLE = 80;

  function pass(warnings) {
    return { valid: true, message: "", warnings: warnings || [] };
  }

  function fail(msg) {
    return { valid: false, message: msg, warnings: [] };
  }
  var TIME_RE = (function () {
    try {
      new RegExp("(?<!x)");
      return TIME_TOKEN_RE;
    } catch (err) {
      return TIME_TOKEN_FALLBACK_RE;
    }
  })();

  function findTimeToken(text) {
    var m = TIME_RE.exec(String(text || ""));
    return m ? m[0] : null;
  }

  function isRealDate(value) {
    if (!DATE_RE.test(value)) return false;
    var parts = value.split("-");
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    var dt = new Date(y, m - 1, d);
    return (
      dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
    );
  }

  function testTitle(value) {
    if (typeof value !== "string" || value === "")
      return fail("Title is required.");
    if (value.length > MAX_TITLE)
      return fail("Title must be " + MAX_TITLE + " characters or fewer.");
    if (!TITLE_RE.test(value))
      return fail("Title must not start or end with a space.");
    if (MESSY_WHITESPACE_RE.test(value))
      return fail("Title must not contain tabs or consecutive spaces.");
    if (DUPLICATE_WORD_RE.test(value))
      return fail('Title repeats a word (for example "study study").');
    if (!DANGLING_WORD_RE.test(value)) {
      return fail(
        "Title must not end with a preposition | finish the sentence.",
      );
    }
    if (value.trim().length < 2)
      return fail("Title must be at least 2 characters.");

    var token = findTimeToken(value);
    return pass(token ? ["Contains a time token: " + token + "."] : []);
  }

  function testDuration(value) {
    if (value === undefined || value === null || value === "")
      return fail("Duration is required.");
    var str = String(value).trim();
    if (!DURATION_RE.test(str)) {
      return fail(
        "Duration must be 0 or a positive number with up to 2 decimals (no leading zeros).",
      );
    }
    return pass();
  }

  function testDate(value) {
    if (!value) return fail("Due date is required.");
    var str = String(value).trim();
    if (!DATE_RE.test(str))
      return fail("Due date must use the format YYYY-MM-DD.");
    if (!isRealDate(str))
      return fail("That date does not exist on the calendar.");
    return pass();
  }

  function testCategory(value) {
    if (typeof value !== "string" || value === "")
      return fail("Category is required.");
    if (!CATEGORY_RE.test(value)) {
      return fail(
        "Category may only contain letters, single spaces and hyphens.",
      );
    }
    if (DUPLICATE_WORD_RE.test(value)) return fail("Category repeats a word.");
    return pass();
  }

  function validateTask(task) {
    var errors = {};
    var warnings = {};

    var title = testTitle(task.title);
    if (!title.valid) errors.title = title.message;
    if (title.warnings.length) warnings.title = title.warnings;

    var category = testCategory(task.category);
    if (!category.valid) errors.category = category.message;

    var duration = testDuration(task.duration);
    if (!duration.valid) errors.duration = duration.message;

    var dueDate = testDate(task.dueDate);
    if (!dueDate.valid) errors.dueDate = dueDate.message;

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  function sanitizeText(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  window.App = window.App || {};
  window.App.Validators = {
    TITLE_RE: TITLE_RE,
    DOUBLE_SPACE_RE: DOUBLE_SPACE_RE,
    MESSY_WHITESPACE_RE: MESSY_WHITESPACE_RE,
    DURATION_RE: DURATION_RE,
    DATE_RE: DATE_RE,
    CATEGORY_RE: CATEGORY_RE,
    DUPLICATE_WORD_RE: DUPLICATE_WORD_RE,
    DANGLING_WORD_RE: DANGLING_WORD_RE,
    TIME_TOKEN_RE: TIME_TOKEN_RE,

    testTitle: testTitle,
    testDuration: testDuration,
    testDate: testDate,
    testCategory: testCategory,
    validateTask: validateTask,

    sanitizeText: sanitizeText,
    escapeRegExp: escapeRegExp,
    findTimeToken: findTimeToken,
    isRealDate: isRealDate,
    MAX_TITLE: MAX_TITLE,
  };
})();
