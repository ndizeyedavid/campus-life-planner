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
});