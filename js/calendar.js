(function () {
  "use strict";

  var PRODID = "-//Campus Life Planner//EN";
  var UID_DOMAIN = "campus-life-planner";

  function toICalDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    return m ? m[1] + m[2] + m[3] : null;
  }

  function addDays(isoDate, days) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || "").trim());
    if (!m) return null;
    var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function toStamp(date) {
    return new Date(date || Date.now())
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  }

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  function foldLine(line) {
    var encoder = typeof TextEncoder === "function" ? new TextEncoder() : null;
    function bytes(str) {
      return encoder ? encoder.encode(str).length : str.length;
    }

    if (bytes(line) <= 75) return line;

    var out = [];
    var current = "";
    var limit = 75;

    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (bytes(current + ch) > limit && current) {
        out.push(current);
        current = ch;
        limit = 74;
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out.join("\r\n ");
  }

  function statusLabel(status) {
    return (
      { todo: "To Do", "in-progress": "In Progress", done: "Done" }[status] ||
      status ||
      ""
    );
  }

  function describe(record, unit) {
    var lines = [];
    if (unit === "hours") {
      lines.push(
        "Duration: " +
          Math.round((Number(record.duration) || 0) / 6) / 10 +
          " h",
      );
    } else {
      lines.push("Duration: " + (Number(record.duration) || 0) + " min");
    }
    lines.push("Category: " + (record.category || ""));
    lines.push("Status: " + statusLabel(record.status));
    if (record.priority) lines.push("Priority: " + record.priority);
    if (record.notes) lines.push("", record.notes);
    lines.push("", "Exported from Campus Life Planner.");
    return lines.join("\n");
  }

  function eventTitle(record) {
    return record.title || "Task";
  }

  function buildEventURL(record, unit) {
    var start = toICalDate(record.dueDate);
    if (!start) return null;

    var endPlain = addDays(record.dueDate, 1);
    var end = endPlain ? endPlain.replace(/-/g, "") : start;

    var params = [
      "text=" + encodeURIComponent(eventTitle(record)),
      "dates=" + encodeURIComponent(start + "/" + end),
      "details=" + encodeURIComponent(describe(record, unit || "minutes")),
      "location=" +
        encodeURIComponent(
          record.category
            ? "Campus Life Planner · " + record.category
            : "Campus Life Planner",
        ),
    ];
    var offset = -new Date().getTimezoneOffset();
    var sign = offset >= 0 ? "+" : "-";
    var abs = Math.abs(offset);
    var hh = String(Math.floor(abs / 60)).padStart(2, "0");
    var mm = String(abs % 60).padStart(2, "0");
    params.push("ctz=" + sign + hh + mm);

    return (
      "https://calendar.google.com/calendar/u/0/r/eventedit?" + params.join("&")
    );
  }

  function buildEventLines(record, unit, index) {
    var start = toICalDate(record.dueDate);
    if (!start) return null;
    var end = toICalDate(addDays(record.dueDate, 1)) || start;

    var lines = [
      "BEGIN:VEVENT",
      "UID:" + record.id + "-" + index + "@" + UID_DOMAIN,
      "DTSTAMP:" + toStamp(),
      "DTSTART;VALUE=DATE:" + start,
      "DTEND;VALUE=DATE:" + end,
      "SUMMARY:" + escapeText(eventTitle(record)),
      "DESCRIPTION:" + escapeText(describe(record, unit || "minutes")),
      "CATEGORIES:" + escapeText(record.category || ""),
      "STATUS:" + (record.status === "done" ? "CANCELLED" : "CONFIRMED"),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ];
    return lines;
  }

  function toICS(records, options) {
    options = options || {};
    var unit = options.unit || "minutes";
    var list = Array.isArray(records) ? records : [];

    var events = [];
    list.forEach(function (record, i) {
      if (!record || (record.status === "done" && !options.includeDone)) return;
      var lines = buildEventLines(record, unit, i);
      if (lines) events.push(lines);
    });

    var header = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:" + PRODID,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:" +
        escapeText(options.calendarName || "Campus Life Planner"),
    ];
    var footer = ["END:VCALENDAR"];

    var out = [];
    header.forEach(pushFolded);
    if (events.length)
      events.forEach(function (event) {
        event.forEach(pushFolded);
      });
    else pushFolded("REMINDER:No tasks to export");
    footer.forEach(pushFolded);

    return out.join("\r\n") + "\r\n";

    function pushFolded(line) {
      out.push(foldLine(line));
    }
  }

  function countExportable(records, options) {
    options = options || {};
    return (Array.isArray(records) ? records : []).filter(function (r) {
      return (
        r &&
        toICalDate(r.dueDate) &&
        (options.includeDone || r.status !== "done")
      );
    }).length;
  }

  function filename() {
    var d = new Date();
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    return (
      "campus-life-planner-" +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      ".ics"
    );
  }

  window.App = window.App || {};
  window.App.Calendar = {
    PRODID: PRODID,
    toICalDate: toICalDate,
    addDays: addDays,
    toStamp: toStamp,
    escapeText: escapeText,
    foldLine: foldLine,
    describe: describe,
    buildEventURL: buildEventURL,
    toICS: toICS,
    countExportable: countExportable,
    filename: filename,
  };
})();
