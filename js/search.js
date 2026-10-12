(function () {
  "use strict";

  var ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      function (ch) {
        return ESCAPES[ch];
      },
    );
  }

  function compileRegex(input, flags) {
    if (input == null || input === "") return null;
    try {
      return new RegExp(input, flags == null ? "i" : flags);
    } catch (err) {
      return null;
    }
  }

  function toGlobal(re) {
    if (!re) return null;
    if (re.flags.indexOf("g") !== -1) return re;
    try {
      return new RegExp(re.source, re.flags + "g");
    } catch (err) {
      return null;
    }
  }

  function toNonGlobal(re) {
    if (!re) return null;
    if (re.flags.indexOf("g") === -1) return re;
    try {
      return new RegExp(re.source, re.flags.replace(/g/g, ""));
    } catch (err) {
      return null;
    }
  }

  function highlight(text, re) {
    if (text == null) return "";
    var raw = String(text);
    if (!re) return escapeHtml(raw);

    var g = toGlobal(re);
    if (!g) return escapeHtml(raw);

    var out = "";
    var cursor = 0;
    var match;

    g.lastIndex = 0;
    while ((match = g.exec(raw)) !== null) {
      if (match[0] === "") {
        g.lastIndex += 1;
        continue;
      }
      out += escapeHtml(raw.slice(cursor, match.index));
      out += "<mark>" + escapeHtml(match[0]) + "</mark>";
      cursor = match.index + match[0].length;
    }
    out += escapeHtml(raw.slice(cursor));
    return out;
  }

  function countIn(text, re) {
    if (!re) return 0;
    var g = toGlobal(re);
    if (!g) return 0;
    var n = 0;
    var match;
    g.lastIndex = 0;
    while ((match = g.exec(String(text == null ? "" : text))) !== null) {
      if (match[0] === "") {
        g.lastIndex += 1;
        continue;
      }
      n += 1;
      if (n > 5000) break;
    }
    return n;
  }

  function fieldsOf(rec) {
    return [
      rec.title,
      rec.category,
      rec.dueDate,
      rec.status,
      rec.priority,
      rec.notes || "",
      String(rec.duration),
    ].map(function (v) {
      return String(v == null ? "" : v);
    });
  }

  function haystack(rec) {
    return fieldsOf(rec).join(" ");
  }

  function filterRecords(records, re) {
    if (!re) return records.slice();
    var safe = toNonGlobal(re);
    if (!safe) return records.slice();
    return records.filter(function (rec) {
      var fields = fieldsOf(rec);
      for (var i = 0; i < fields.length; i++) {
        safe.lastIndex = 0;
        if (safe.test(fields[i])) return true;
      }
      return false;
    });
  }

  function countMatches(records, re) {
    if (!re) return 0;
    return records.reduce(function (sum, rec) {
      return (
        sum +
        fieldsOf(rec).reduce(function (n, field) {
          return n + countIn(field, re);
        }, 0)
      );
    }, 0);
  }

  function describeError(err) {
    if (!err) return "Invalid regular expression.";
    return (
      "Invalid regular expression | " +
      String(err.message || "").replace(/^.*?:\s*/, "")
    );
  }

  window.App = window.App || {};
  window.App.Search = {
    compileRegex: compileRegex,
    highlight: highlight,
    escapeHtml: escapeHtml,
    filterRecords: filterRecords,
    countMatches: countMatches,
    countIn: countIn,
    toGlobal: toGlobal,
    toNonGlobal: toNonGlobal,
    fieldsOf: fieldsOf,
    haystack: haystack,
    describeError: describeError,
  };
})();
