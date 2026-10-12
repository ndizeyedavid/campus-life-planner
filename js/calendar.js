(function() {
    "use strict";
    var PROID = "-//Campus Life Planner//EN";
    var UID_DOMAIN = "campus-life-planner";

    function toICalDate(value) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(string(value || "").trim());
        return m ? m[1] + m[2] + m[3] : null;
    }

    function addDays(isoDate, days) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(string(isoDate || "").trim());
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
        return string(value == null ? "" : value)
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
});