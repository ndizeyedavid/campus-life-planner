(function () {
  "use strict";

  var State = window.App.State;
  var Search = window.App.Search;
  var Validators = window.App.Validators;
  var Storage = window.App.Storage;
  var Images = window.App.Images;

  var ui = {
    page: document.body.dataset.page || "dashboard",
    searchRe: null,
    sortField: "dueDate",
    sortDir: "asc",
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    editingId: null,
    pendingConfirm: null,
    lastFocus: null,
    lastCapMessage: null,
    imageId: null,
    stagedImage: null,
  };

  var STATUS_LABELS = {
    todo: "To Do",
    "in-progress": "In Progress",
    done: "Done",
  };
  var STATUS_ORDER = ["todo", "in-progress", "done"];
  var PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

  var CATEGORY_DOT_LIGHT = [
    "#6d28d9",
    "#0e7490",
    "#0f7b4f",
    "#b45309",
    "#2563eb",
    "#be185d",
  ];
  var CATEGORY_TXT_LIGHT = [
    "#5b21b6",
    "#0e5f75",
    "#0b6141",
    "#8f3f06",
    "#1d4ed8",
    "#a01b62",
  ];
  var CATEGORY_DOT_DARK = [
    "#c4a2fb",
    "#5bc8e0",
    "#4ade9b",
    "#f5a524",
    "#7dabff",
    "#f9a8d4",
  ];
  var CATEGORY_TXT_DARK = CATEGORY_DOT_DARK;

  var categoryIndexCache = null;
  var categoryKeyCache = null;
  function categoryIndex(cat) {
    var list = (State.getSettings() || {}).categories || [];
    var key = list.join("\\u0000");
    if (!categoryIndexCache || key !== categoryKeyCache) {
      categoryIndexCache = Object.create(null);
      list.forEach(function (name, i) {
        categoryIndexCache[String(name)] = i;
      });
      categoryKeyCache = key;
    }
    var i = categoryIndexCache[String(cat)];
    return i == null ? -1 : i;
  }

  function categoryDot(cat) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var palette = dark ? CATEGORY_DOT_DARK : CATEGORY_DOT_LIGHT;
    var i = categoryIndex(cat);
    return i < 0 ? "var(--color-text-faint)" : palette[i % palette.length];
  }

  function categoryText(cat) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var palette = dark ? CATEGORY_TXT_DARK : CATEGORY_TXT_LIGHT;
    var i = categoryIndex(cat);
    return i < 0 ? "var(--color-text-faint)" : palette[i % palette.length];
  }

  function el(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return Search.escapeHtml(value);
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function catTag(cat, inner) {
    return (
      '<span class="tag" style="--tag-c:' +
      categoryText(cat) +
      ";--tag-dot:" +
      categoryDot(cat) +
      '">' +
      inner +
      "</span>"
    );
  }

  function formatDuration(minutes, unit) {
    var value = Math.round(Number(minutes) || 0);
    if (unit === "hours") {
      var hours = value / 60;
      var rounded = Math.round(hours * 10) / 10;
      return rounded + " h";
    }
    return value + " min";
  }

  function toISODate(date) {
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return (
      date.getFullYear() +
      "-" +
      (m < 10 ? "0" + m : m) +
      "-" +
      (d < 10 ? "0" + d : d)
    );
  }

  function startOfToday() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function isOverdue(rec) {
    return (
      rec.status !== "done" &&
      new Date(rec.dueDate + "T00:00:00") < startOfToday()
    );
  }

  function icon(name) {
    return (
      '<i class="fa-solid fa-' + name + ' fa-icon" aria-hidden="true"></i>'
    );
  }

  function toast(message) {
    var node = el("toast");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(node._timer);
    node._timer = setTimeout(function () {
      node.hidden = true;
    }, 2800);
  }

  function announce(node, message) {
    if (!node) return;
    node.textContent = "";
    void node.offsetWidth;
    node.textContent = message;
  }

  function announcePolite(message) {
    announce(el("liveStatus"), message);
  }
  function announceAssertive(message) {
    announce(el("liveAlert"), message);
  }

  function renderSidebar() {
    var records = State.getRecords();
    var settings = State.getSettings();

    var badge = el("badgeTodo");
    if (badge) {
      var todo = records.filter(function (r) {
        return r.status === "todo";
      }).length;
      badge.textContent = String(todo);
    }

    var list = el("workspaceList");
    if (list) {
      list.innerHTML = "";
      settings.categories.forEach(function (cat) {
        var count = records.filter(function (r) {
          return r.category === cat;
        }).length;
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.className = "workspace__item";

        link.href =
          "table.html?q=" +
          encodeURIComponent("^" + Validators.escapeRegExp(cat) + "$");
        link.innerHTML =
          '<span class="workspace__dot" style="background:' +
          categoryDot(cat) +
          '" aria-hidden="true"></span>' +
          '<span class="nav__label">' +
          esc(cat) +
          "</span>" +
          '<span class="workspace__count" aria-hidden="true">' +
          count +
          "</span>" +
          '<span class="sr-only">' +
          count +
          (count === 1 ? " task" : " tasks") +
          "</span>";
        li.appendChild(link);
        list.appendChild(li);
      });
      if (!settings.categories.length) {
        list.innerHTML =
          '<li class="form-hint" style="padding:8px 12px">No categories yet.</li>';
      }
    }

    var datalist = el("catDatalist");
    if (datalist) {
      datalist.innerHTML = "";
      settings.categories.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        datalist.appendChild(opt);
      });
    }
  }

  function render() {
    renderSidebar();
    renderProfile();
    switch (ui.page) {
      case "dashboard":
        renderDashboard();
        break;
      case "board":
        renderBoard();
        break;
      case "table":
        renderTable();
        break;
      case "calendar":
        renderCalendar();
        break;
      case "settings":
        renderSettings();
        break;
      case "about":
        break;
      default:
        break;
    }
  }

  function renderProfile() {
    var Onboarding = window.App.Onboarding;
    if (!Onboarding) return;
    var name = Onboarding.getName() || "Student";

    var nameNode = document.querySelector(".profile__name");
    if (nameNode) nameNode.textContent = name;

    var greet = el("greeting");
    if (greet) greet.textContent = "Welcome back, " + name + ".";
  }

  function renderDashboard() {
    var records = State.getRecords();
    var settings = State.getSettings();

    var total = records.length;
    var totalMinutes = records.reduce(function (sum, r) {
      return sum + (Number(r.duration) || 0);
    }, 0);
    var done = records.filter(function (r) {
      return r.status === "done";
    }).length;
    var overdue = records.filter(isOverdue).length;

    var byCategory = Object.create(null);
    records.forEach(function (r) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });
    var topCategory =
      Object.keys(byCategory).sort(function (a, b) {
        return byCategory[b] - byCategory[a] || a.localeCompare(b);
      })[0] || "-";

    var stats = [
      {
        label: "Total tasks",
        value: String(total),
        delta: total === 1 ? "1 record" : total + " records",
      },
      {
        label: "Completed",
        value: done + " / " + total,
        delta: total
          ? Math.round((done / total) * 100) + "% complete"
          : "nothing planned yet",
      },
      {
        label: "Planned time",
        value: formatDuration(totalMinutes, settings.unit),
        delta:
          settings.unit === "hours"
            ? totalMinutes + " minutes total"
            : "across every task",
      },
      {
        label: "Top category",
        value: topCategory,
        delta: byCategory[topCategory]
          ? byCategory[topCategory] +
            (byCategory[topCategory] === 1 ? " task" : " tasks")
          : "no records",
      },
      {
        label: "Overdue",
        value: String(overdue),
        delta: overdue ? "needs attention" : "all on track",
      },
      {
        label: "Due this week",
        value: String(dueThisWeek(records)),
        delta: "next 7 days",
      },
    ];

    var grid = el("statsGrid");
    grid.innerHTML = stats
      .map(function (s) {
        return (
          '<div class="stat"><p class="stat__label">' +
          esc(s.label) +
          "</p>" +
          '<p class="stat__value">' +
          esc(s.value) +
          "</p>" +
          '<p class="stat__delta">' +
          esc(s.delta) +
          "</p></div>"
        );
      })
      .join("");

    renderTrend(records);
    renderCap(records, settings);
    renderUpcoming(records);
  }

  function dueThisWeek(records) {
    var from = startOfToday();
    var to = new Date(from.getTime() + 7 * 86400000);
    return records.filter(function (r) {
      var d = new Date(r.dueDate + "T00:00:00");
      return d >= from && d < to;
    }).length;
  }

  var trendChart = null;

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function renderTrend(records) {
    var host = el("trendChart");
    if (!host) return;

    var today = startOfToday();
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(today.getTime() - i * 86400000);
      days.push({
        date: d,
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        full: d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        }),
        count: 0,
        isToday: i === 0,
      });
    }
    records.forEach(function (r) {
      var created = new Date(r.createdAt);
      if (isNaN(created)) return;
      created.setHours(0, 0, 0, 0);
      var bucket = days.find(function (day) {
        return day.date.getTime() === created.getTime();
      });
      if (bucket) bucket.count += 1;
    });

    var summary = el("trendSummary");
    if (summary) {
      summary.innerHTML = days
        .map(function (d) {
          return (
            "<li>" +
            esc(d.full + (d.isToday ? " (today)" : "")) +
            ": " +
            d.count +
            (d.count === 1 ? " task created" : " tasks created") +
            "</li>"
          );
        })
        .join("");
    }

    var total = days.reduce(function (s, d) {
      return s + d.count;
    }, 0);

    if (window.Chart) {
      renderTrendWithChart(days, total);
    } else {
      renderTrendFallback(days, total);
    }
  }

  function renderTrendWithChart(days, total) {
    var canvas = el("trendCanvas");
    if (!canvas) return;

    var fallback = el("trendFallback");
    if (fallback) fallback.hidden = true;

    var dark = isDark();
    var text = dark ? "#ada39b" : "#6b635b";
    var grid = dark ? "rgba(245,241,238,0.12)" : "rgba(26,22,19,0.10)";
    var primary = "#fc4f24";
    var today = dark ? "#ff8a65" : "#c63010";

    var config = {
      type: "bar",
      data: {
        labels: days.map(function (d) {
          return d.label;
        }),
        datasets: [
          {
            label: "Tasks created",
            data: days.map(function (d) {
              return d.count;
            }),
            backgroundColor: days.map(function (d) {
              return d.isToday ? today : primary;
            }),
            borderRadius: 4,
            borderWidth: 0,
            borderColor: dark ? "#ffffff" : "#000000",
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: prefersReducedMotion() ? 0 : 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var d = days[ctx.dataIndex];
                return (
                  d.full + ": " + d.count + (d.count === 1 ? " task" : " tasks")
                );
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: text,
              precision: 0,
              font: { family: "Inter, system-ui, sans-serif" },
            },
            grid: { color: grid },
            title: { display: true, text: "Tasks created", color: text },
          },
          x: {
            ticks: {
              color: text,
              font: { family: "Inter, system-ui, sans-serif" },
            },
            grid: { display: false },
          },
        },
      },
    };

    if (!total) {
      destroyTrendChart();
      canvas.hidden = true;
      showTrendMessage("No tasks were created in the last 7 days.");
      return;
    }

    canvas.hidden = false;
    hideTrendMessage();

    if (trendChart) {
      trendChart.data = config.data;
      trendChart.options = config.options;
      trendChart.update();
    } else {
      trendChart = new window.Chart(canvas.getContext("2d"), config);
    }
  }

  function renderTrendFallback(days, total) {
    var canvas = el("trendCanvas");
    var fallback = el("trendFallback");
    if (canvas) canvas.hidden = true;
    if (!fallback) return;
    destroyTrendChart();

    if (!total) {
      fallback.hidden = true;
      showTrendMessage("No tasks were created in the last 7 days.");
      return;
    }

    hideTrendMessage();
    fallback.hidden = false;
    var max = Math.max.apply(
      null,
      days
        .map(function (d) {
          return d.count;
        })
        .concat([1]),
    );
    fallback.innerHTML =
      '<div class="chart">' +
      days
        .map(function (d) {
          var height = Math.max(3, Math.round((d.count / max) * 100));
          return (
            '<div class="chart__bar-wrap" title="' +
            esc(d.full) +
            ": " +
            d.count +
            '">' +
            '<div class="chart__bar' +
            (d.isToday ? " chart__bar--today" : "") +
            '" style="height:' +
            height +
            '%"></div>' +
            '<span class="chart__label">' +
            esc(d.label) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>";
  }

  function destroyTrendChart() {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
  }

  function showTrendMessage(message) {
    var node = el("trendEmpty");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
  }

  function hideTrendMessage() {
    var node = el("trendEmpty");
    if (node) node.hidden = true;
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function refreshTrendTheme() {
    if (!el("trendCanvas")) return;
    if (trendChart) {
      destroyTrendChart();
      renderTrend(State.getRecords());
    }
  }

  function renderCap(records, settings) {
    var host = el("capBox");
    if (!host) return;

    var target = Number(settings.weeklyTarget) || 0;
    var weekStart = startOfToday();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var planned = records
      .filter(function (r) {
        var created = new Date(r.createdAt);
        return !isNaN(created) && created >= weekStart;
      })
      .reduce(function (sum, r) {
        return sum + (Number(r.duration) || 0);
      }, 0);

    if (target <= 0) {
      host.innerHTML =
        '<p class="cap__text">No weekly target set. ' +
        '<a href="settings.html#target">Set one in Settings</a> to track your planned time.</p>';
      return;
    }

    var over = planned > target;
    var pct = Math.min(100, Math.round((planned / target) * 100));
    var remaining = target - planned;

    host.innerHTML =
      '<div class="cap__bar"><div class="cap__fill' +
      (over ? " cap__fill--over" : "") +
      '" style="width:' +
      pct +
      '%"></div></div>' +
      '<p class="cap__text"><strong>' +
      esc(formatDuration(planned, settings.unit)) +
      "</strong> planned of " +
      esc(formatDuration(target, settings.unit)) +
      " this week.</p>" +
      '<p class="cap__text" id="capState">' +
      (over
        ? '<span class="cap__over"><strong>Over target by ' +
          esc(formatDuration(-remaining, settings.unit)) +
          "</strong>.</span>"
        : "<span><strong>" +
          esc(formatDuration(remaining, settings.unit)) +
          "</strong> left to plan.</span>") +
      "</p>";

    var message = over
      ? "Weekly target exceeded by " +
        formatDuration(-remaining, settings.unit) +
        "."
      : "Weekly target: " +
        formatDuration(planned, settings.unit) +
        " planned of " +
        formatDuration(target, settings.unit) +
        ".";
    if (message !== ui.lastCapMessage) {
      ui.lastCapMessage = message;
      if (over) announceAssertive(message);
      else announcePolite(message);
    }
  }

  function renderUpcoming(records) {
    var list = el("upcomingList");
    if (!list) return;

    var today = startOfToday();
    var upcoming = records
      .filter(function (r) {
        return (
          r.status !== "done" && new Date(r.dueDate + "T00:00:00") >= today
        );
      })
      .sort(function (a, b) {
        return a.dueDate.localeCompare(b.dueDate);
      })
      .slice(0, 6);

    if (!upcoming.length) {
      list.innerHTML =
        '<li class="empty-state">' +
        icon("circle-check") +
        "<p>Nothing due. Add a task or enjoy the free time.</p></li>";
      return;
    }

    var unit = State.getSettings().unit;
    list.innerHTML = upcoming
      .map(function (r) {
        var d = new Date(r.dueDate + "T00:00:00");
        return (
          '<li class="upcoming-item">' +
          '<div class="upcoming-item__date" aria-hidden="true"><div class="upcoming-item__day">' +
          d.getDate() +
          "</div>" +
          '<div class="upcoming-item__mon">' +
          esc(d.toLocaleDateString(undefined, { month: "short" })) +
          "</div></div>" +
          '<div><p class="upcoming-item__title">' +
          esc(r.title) +
          "</p>" +
          '<p class="upcoming-item__meta">' +
          catTag(r.category, esc(r.category)) +
          "<span>" +
          icon("clock") +
          " " +
          esc(formatDuration(r.duration, unit)) +
          "</span>" +
          '<span class="sr-only">Due </span><span aria-hidden="true">' +
          esc(r.dueDate) +
          "</span>" +
          "</p></div></li>"
        );
      })
      .join("");
  }

  function renderBoard() {
    var host = el("board");
    if (!host) return;

    var records = State.getRecords();
    var unit = State.getSettings().unit;

    el("boardEmpty").hidden = records.length !== 0;
    if (!records.length) {
      host.innerHTML = "";
      return;
    }

    host.innerHTML = STATUS_ORDER.map(function (key) {
      var items = records.filter(function (r) {
        return r.status === key;
      });
      return (
        '<section class="board__col" aria-labelledby="col-' +
        key +
        '">' +
        '<div class="board__head board__head--' +
        (key === "todo"
          ? "todo"
          : key === "in-progress"
            ? "progress"
            : "done") +
        '" id="col-' +
        key +
        '">' +
        "<span>" +
        esc(statusLabel(key)) +
        "</span>" +
        '<span class="board__count">' +
        items.length +
        "</span></div>" +
        '<div class="board__cards" data-status="' +
        key +
        '">' +
        (items.length
          ? items
              .map(function (r) {
                return boardCard(r, unit);
              })
              .join("")
          : '<p class="board__empty">Drop a task here</p>') +
        "</div></section>"
      );
    }).join("");

    bindBoardClicks(host);
    bindBoardDrag(host);
  }

  function bindBoardClicks(host) {
    host.onclick = function (event) {
      var moveBtn = event.target.closest("[data-move]");
      var editBtn = event.target.closest("[data-edit]");
      var delBtn = event.target.closest("[data-delete]");
      var calBtn = event.target.closest("[data-addcal]");

      if (moveBtn) {
        var id = moveBtn.closest("[data-id]").dataset.id;
        var target = moveBtn.dataset.move;
        State.updateStatus(id, target);
        toast(
          '"' +
            State.getRecord(id).title +
            '" moved to ' +
            statusLabel(target) +
            ".",
        );
        announcePolite("Moved to " + statusLabel(target) + ".");
      } else if (editBtn) {
        openEditModal(editBtn.dataset.edit);
      } else if (delBtn) {
        confirmDelete(delBtn.dataset.delete);
      } else if (calBtn) {
        addToGoogleCalendar(calBtn.dataset.addcal);
      }
    };
  }

  var dragId = null;
  var dragColumn = null;
  var touchDrag = null;
  var boardDragBound = false;

  function bindBoardDrag(host) {
    if (boardDragBound) return;
    boardDragBound = true;

    host.addEventListener("dragstart", function (event) {
      var card = event.target.closest(".task-card");
      if (!card) return;
      dragId = card.dataset.id;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";

      event.dataTransfer.setData("text/plain", dragId);
      announcePolite(
        "Picked up " +
          State.getRecord(dragId).title +
          ". Drag it to a column, or use the Move to button.",
      );
    });

    host.addEventListener("dragend", function (event) {
      var card = event.target.closest(".task-card");
      if (card) card.classList.remove("is-dragging");
      clearDropIndicators(host);
      dragId = null;
      dragColumn = null;
    });

    host.addEventListener("dragover", function (event) {
      if (!dragId) return;
      var zone = event.target.closest(".board__cards");
      if (!zone) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (zone === dragColumn) return;
      clearDropIndicators(host);
      dragColumn = zone;
      zone.classList.add("is-drop-target");
    });

    host.addEventListener("dragleave", function (event) {
      var zone = event.target.closest(".board__cards");
      if (zone && zone === dragColumn && !zone.contains(event.relatedTarget)) {
        zone.classList.remove("is-drop-target");
        dragColumn = null;
      }
    });

    host.addEventListener("drop", function (event) {
      var zone = event.target.closest(".board__cards");
      if (!zone || !dragId) return;
      event.preventDefault();
      moveCard(dragId, zone.dataset.status, false);
      clearDropIndicators(host);
    });

    host.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "touch") return;
      var card = event.target.closest(".task-card");
      if (!card || event.target.closest("button")) return;
      touchDrag = {
        id: card.dataset.id,
        card: card,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        pointerId: event.pointerId,
      };
    });

    host.addEventListener("pointermove", function (event) {
      if (!touchDrag || event.pointerId !== touchDrag.pointerId) return;

      if (!touchDrag.active) {
        var dx = event.clientX - touchDrag.startX;
        var dy = event.clientY - touchDrag.startY;
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        touchDrag.active = true;
        touchDrag.card.classList.add("is-dragging");
        document.body.classList.add("is-touch-dragging");
      }
      if (event.cancelable) event.preventDefault();

      var zone = document.elementFromPoint(event.clientX, event.clientY);
      var column = zone && zone.closest ? zone.closest(".board__cards") : null;
      if (column !== dragColumn) {
        clearDropIndicators(host);
        dragColumn = column;
        if (column) column.classList.add("is-drop-target");
      }
    });

    function endTouch(event) {
      if (!touchDrag || event.pointerId !== touchDrag.pointerId) return;
      if (touchDrag.active) {
        var zone = dragColumn;
        if (event.cancelable) event.preventDefault();
        if (zone) moveCard(touchDrag.id, zone.dataset.status, true);
        touchDrag.card.classList.remove("is-dragging");
      }
      document.body.classList.remove("is-touch-dragging");
      clearDropIndicators(host);
      touchDrag = null;
    }

    host.addEventListener("pointerup", endTouch);
    host.addEventListener("pointercancel", endTouch);
  }

  function clearDropIndicators(host) {
    host.querySelectorAll(".is-drop-target").forEach(function (node) {
      node.classList.remove("is-drop-target");
    });
  }

  function moveCard(id, status, fromTouch) {
    var rec = State.getRecord(id);
    if (!rec || rec.status === status) {
      if (fromTouch) suppressNextClick(host);
      return;
    }
    State.updateStatus(id, status);
    var message = '"' + rec.title + '" moved to ' + statusLabel(status) + ".";
    toast(message);
    announcePolite(
      message +
        " " +
        statusLabel(status) +
        " now holds " +
        State.getRecords().filter(function (r) {
          return r.status === status;
        }).length +
        " tasks.",
    );
  }

  function suppressNextClick(host) {
    host.addEventListener(
      "click",
      function swallow(event) {
        event.stopPropagation();
        event.preventDefault();
        host.removeEventListener("click", swallow);
      },
      { capture: true, once: true },
    );
  }

  function boardCard(r, unit) {
    var next =
      STATUS_ORDER[(STATUS_ORDER.indexOf(r.status) + 1) % STATUS_ORDER.length];
    var overdue = isOverdue(r);
    return (
      '<article class="task-card" data-id="' +
      esc(r.id) +
      '" draggable="true">' +
      (r.imageId
        ? '<div class="task-card__media">' + imageThumb(r) + "</div>"
        : "") +
      '<h3 class="task-card__title">' +
      '<span class="task-card__grip" aria-hidden="true">' +
      icon("grip-vertical") +
      "</span>" +
      esc(r.title) +
      "</h3>" +
      '<div class="task-card__row">' +
      catTag(r.category, esc(r.category)) +
      '<span class="prio prio--' +
      esc(r.priority) +
      '" aria-hidden="true"></span>' +
      '<span class="prio-label">' +
      esc(PRIORITY_LABELS[r.priority] || r.priority) +
      "</span>" +
      "</div>" +
      '<p class="task-card__meta">' +
      "<span>" +
      icon("clock") +
      " " +
      esc(formatDuration(r.duration, unit)) +
      "</span>" +
      '<span class="' +
      (overdue ? "task-card__due--overdue" : "") +
      '">' +
      (overdue ? "Overdue | " : "Due ") +
      esc(r.dueDate) +
      "</span></p>" +
      '<div class="task-card__foot">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-edit="' +
      esc(r.id) +
      '">' +
      icon("pen") +
      "Edit</button>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-move="' +
      next +
      '">' +
      icon("arrow-right-long") +
      esc(statusLabel(next)) +
      "</button>" +
      '<button type="button" class="icon-btn" data-addcal="' +
      esc(r.id) +
      '" title="Add to Google Calendar">' +
      icon("calendar-plus") +
      '<span class="sr-only">Add ' +
      esc(r.title) +
      " to Google Calendar</span></button>" +
      '<button type="button" class="icon-btn icon-btn--danger" data-delete="' +
      esc(r.id) +
      '">' +
      icon("trash-can") +
      '<span class="sr-only">Delete ' +
      esc(r.title) +
      "</span></button>" +
      "</div></article>"
    );
  }

  function renderTable() {
    var body = el("recordsBody");
    if (!body) return;

    var all = State.getRecords();
    var filtered = Search.filterRecords(all, ui.searchRe);
    var sorted = sortRecords(filtered);
    var unit = State.getSettings().unit;

    body.innerHTML = sorted
      .map(function (r) {
        var overdue = isOverdue(r);
        return (
          "<tr>" +
          "<td>" +
          Search.highlight(r.title, ui.searchRe) +
          "</td>" +
          '<td class="cell-image">' +
          (r.imageId ? imageThumb(r) : '<span class="form-hint">-</span>') +
          "</td>" +
          "<td>" +
          catTag(r.category, Search.highlight(r.category, ui.searchRe)) +
          "</td>" +
          "<td>" +
          Search.highlight(String(r.duration), ui.searchRe) +
          "</td>" +
          "<td>" +
          Search.highlight(r.dueDate, ui.searchRe) +
          "</td>" +
          '<td><span class="prio prio--' +
          esc(r.priority) +
          '" aria-hidden="true"></span> ' +
          '<span class="sr-only">' +
          esc(PRIORITY_LABELS[r.priority]) +
          " priority. </span>" +
          esc(statusLabel(r.status)) +
          (overdue
            ? ' <span class="task-card__due--overdue">(overdue)</span>'
            : "") +
          "</td>" +
          '<td class="row-actions">' +
          '<button type="button" class="icon-btn" data-edit="' +
          esc(r.id) +
          '">' +
          icon("pen") +
          '<span class="sr-only">Edit ' +
          esc(r.title) +
          "</span></button>" +
          '<button type="button" class="icon-btn" data-addcal="' +
          esc(r.id) +
          '" title="Add to Google Calendar">' +
          icon("calendar-plus") +
          '<span class="sr-only">Add ' +
          esc(r.title) +
          " to Google Calendar</span></button>" +
          '<button type="button" class="icon-btn icon-btn--danger" data-delete="' +
          esc(r.id) +
          '">' +
          icon("trash-can") +
          '<span class="sr-only">Delete ' +
          esc(r.title) +
          "</span></button>" +
          "</td></tr>"
        );
      })
      .join("");

    el("tableEmpty").hidden = sorted.length > 0;

    updateSortIndicators();
    updateSearchStatus(all, sorted);
  }

  function sortRecords(records) {
    var field = ui.sortField;
    var dir = ui.sortDir === "asc" ? 1 : -1;
    return records.slice().sort(function (a, b) {
      var va = a[field];
      var vb = b[field];
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * dir;
      return (
        String(va).localeCompare(String(vb), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * dir
      );
    });
  }

  function updateSortIndicators() {
    document.querySelectorAll(".sort-btn").forEach(function (btn) {
      var th = btn.closest("th");
      var active = btn.dataset.sort === ui.sortField;
      btn.classList.toggle("is-sorted", active);
      var glyph = btn.querySelector(".sort-ind");
      if (glyph) {
        glyph.className =
          "fa-solid fa-icon sort-ind " +
          (active
            ? ui.sortDir === "asc"
              ? "fa-arrow-up"
              : "fa-arrow-down"
            : "fa-sort");
      }
      if (th) {
        if (active)
          th.setAttribute(
            "aria-sort",
            ui.sortDir === "asc" ? "ascending" : "descending",
          );
        else th.removeAttribute("aria-sort");
      }
    });
  }

  function setSort(field) {
    if (ui.sortField === field) {
      ui.sortDir = ui.sortDir === "asc" ? "desc" : "asc";
    } else {
      ui.sortField = field;
      ui.sortDir = "asc";
    }
    renderTable();
    announcePolite(
      "Sorted by " +
        field +
        ", " +
        (ui.sortDir === "asc" ? "ascending" : "descending") +
        ".",
    );
  }

  function caseSensitive() {
    var toggle = el("caseToggle");
    return !!toggle && toggle.getAttribute("aria-pressed") === "true";
  }

  function updateSearch() {
    var input = el("searchInput");
    if (!input) return;

    var status = el("searchStatus");
    var pattern = input.value;
    var flags = caseSensitive() ? "" : "i";

    if (pattern === "") {
      ui.searchRe = null;
      input.removeAttribute("aria-invalid");
      status.textContent = "";
      status.className = "search-box__status";
      renderTable();
      syncUrl();
      return;
    }

    var re;
    try {
      re = new RegExp(pattern, flags);
    } catch (err) {
      ui.searchRe = null;
      input.setAttribute("aria-invalid", "true");
      status.className = "search-box__status search-box__status--error";
      status.textContent = Search.describeError(err);
      announceAssertive("Invalid regular expression.");
      renderTable();
      return;
    }

    ui.searchRe = re;
    input.removeAttribute("aria-invalid");
    status.className = "search-box__status";
    renderTable();
    syncUrl();
  }

  function updateSearchStatus(all, sorted) {
    var status = el("searchStatus");
    if (!status || status.classList.contains("search-box__status--error"))
      return;

    if (!ui.searchRe) {
      status.textContent =
        all.length + (all.length === 1 ? " record" : " records");
      return;
    }
    var hits = Search.countMatches(sorted, ui.searchRe);
    var noun = hits === 1 ? "match" : "matches";
    status.textContent =
      sorted.length + " of " + all.length + " records · " + hits + " " + noun;
  }

  function clearSearch() {
    var input = el("searchInput");
    if (!input) return;
    input.value = "";
    updateSearch();
    input.focus();
    announcePolite("Search cleared.");
  }

  function syncSearchFromUrl() {
    var input = el("searchInput");
    if (!input) return;
    var params = new URLSearchParams(window.location.search);
    var q = params.get("q");
    if (q !== null) input.value = q;
    var ci = params.get("ci");
    var toggle = el("caseToggle");
    if (toggle && ci === "1") toggle.setAttribute("aria-pressed", "true");
    updateSearch();
  }

  function syncUrl() {
    var input = el("searchInput");
    if (!input || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    if (input.value) url.searchParams.set("q", input.value);
    else url.searchParams.delete("q");
    if (caseSensitive()) url.searchParams.set("ci", "1");
    else url.searchParams.delete("ci");
    window.history.replaceState(null, "", url);
  }

  function renderCalendar() {
    var host = el("calendar");
    if (!host) return;

    var year = ui.calYear;
    var month = ui.calMonth;
    var label = el("calLabel");
    if (label)
      label.textContent = new Date(year, month, 1).toLocaleDateString(
        undefined,
        { month: "long", year: "numeric" },
      );

    var records = State.getRecords();
    var unit = State.getSettings().unit;
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrev = new Date(year, month, 0).getDate();
    var today = startOfToday();

    var html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map(function (d) {
        return '<div class="cal__dow" aria-hidden="true">' + d + "</div>";
      })
      .join("");

    function cell(dateStr, dayNumber, inMonth) {
      var dayRecords = records.filter(function (r) {
        return r.dueDate === dateStr;
      });
      var isToday = dateStr === toISODate(today);
      var classes =
        "cal__day" +
        (inMonth ? "" : " cal__day--other") +
        (isToday ? " cal__day--today" : "");

      var body = dayRecords
        .slice(0, 3)
        .map(function (r) {
          return (
            '<button type="button" class="cal__chip' +
            (r.status === "done" ? " cal__chip--done" : "") +
            '" data-edit="' +
            esc(r.id) +
            '">' +
            esc(r.title) +
            "</button>"
          );
        })
        .join("");

      var overflow =
        dayRecords.length > 3
          ? '<span class="cal__more">+' +
            (dayRecords.length - 3) +
            " more</span>"
          : "";

      var labelText = new Date(dateStr + "T00:00:00").toLocaleDateString(
        undefined,
        { weekday: "long", day: "numeric", month: "long" },
      );
      var summary =
        labelText +
        (isToday ? " (today)" : "") +
        ": " +
        (dayRecords.length
          ? dayRecords
              .map(function (r) {
                return r.title;
              })
              .join(", ")
          : "no tasks");

      return (
        '<div class="' +
        classes +
        '">' +
        '<span class="cal__num" aria-hidden="true">' +
        dayNumber +
        "</span>" +
        '<span class="sr-only">' +
        esc(summary) +
        "</span>" +
        body +
        overflow +
        "</div>"
      );
    }

    for (var i = firstDay - 1; i >= 0; i--) {
      html += cell(
        toISODate(new Date(year, month - 1, daysInPrev - i)),
        daysInPrev - i,
        false,
      );
    }
    for (var d = 1; d <= daysInMonth; d++) {
      html += cell(toISODate(new Date(year, month, d)), d, true);
    }
    var trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (var n = 1; n <= trailing; n++) {
      html += cell(toISODate(new Date(year, month + 1, n)), n, false);
    }

    host.innerHTML = html;
    host.onclick = function (event) {
      var chip = event.target.closest("[data-edit]");
      if (chip) openEditModal(chip.dataset.edit);
    };

    renderCalendarList(records, year, month, unit);
  }

  function renderCalendarList(records, year, month, unit) {
    var list = el("calList");
    if (!list) return;

    var prefix = year + "-" + (month < 9 ? "0" + (month + 1) : month + 1);
    var monthRecords = records
      .filter(function (r) {
        return r.dueDate.indexOf(prefix) === 0;
      })
      .sort(function (a, b) {
        return (
          a.dueDate.localeCompare(b.dueDate) ||
          String(a.title).localeCompare(String(b.title))
        );
      });

    if (!monthRecords.length) {
      list.innerHTML =
        '<li class="empty-state">' +
        icon("calendar-xmark") +
        "<p>No tasks are due this month.</p></li>";
      return;
    }

    list.innerHTML = monthRecords
      .map(function (r) {
        return (
          '<li class="upcoming-item">' +
          '<div class="upcoming-item__date" aria-hidden="true"><div class="upcoming-item__day">' +
          Number(r.dueDate.slice(8)) +
          "</div>" +
          '<div class="upcoming-item__mon">' +
          esc(
            new Date(r.dueDate + "T00:00:00").toLocaleDateString(undefined, {
              month: "short",
            }),
          ) +
          "</div></div>" +
          '<div><p class="upcoming-item__title">' +
          esc(r.title) +
          "</p>" +
          '<p class="upcoming-item__meta">' +
          catTag(r.category, esc(r.category)) +
          "<span>" +
          esc(formatDuration(r.duration, unit)) +
          "</span>" +
          "<span>" +
          esc(statusLabel(r.status)) +
          "</span>" +
          (isOverdue(r)
            ? '<span class="task-card__due--overdue">Overdue</span>'
            : "") +
          "</p></div>" +
          '<button type="button" class="icon-btn" data-edit="' +
          esc(r.id) +
          '">' +
          icon("pen") +
          '<span class="sr-only">Edit ' +
          esc(r.title) +
          "</span></button></li>"
        );
      })
      .join("");

    list.onclick = function (event) {
      var btn = event.target.closest("[data-edit]");
      if (btn) openEditModal(btn.dataset.edit);
    };
  }

  function shiftMonth(delta) {
    var d = new Date(ui.calYear, ui.calMonth + delta, 1);
    ui.calYear = d.getFullYear();
    ui.calMonth = d.getMonth();
    renderCalendar();
    announcePolite(el("calLabel").textContent);
  }

  function goToToday() {
    var now = new Date();
    ui.calYear = now.getFullYear();
    ui.calMonth = now.getMonth();
    renderCalendar();
    announcePolite("Showing " + el("calLabel").textContent + ".");
  }

  function renderSettings() {
    var settings = State.getSettings();

    function setValue(id, value) {
      var node = el(id);
      if (
        node &&
        document.activeElement !== node &&
        String(node.value) !== String(value)
      ) {
        node.value = value;
      }
    }
    setValue("unitSelect", settings.unit);
    setValue("capInput", settings.weeklyTarget);

    var Onboarding = window.App.Onboarding;
    setValue("profileName", Onboarding ? Onboarding.getName() || "" : "");

    var list = el("catList");
    if (!list) return;
    list.innerHTML = "";

    settings.categories.forEach(function (cat) {
      var count = State.getRecords().filter(function (r) {
        return r.category === cat;
      }).length;
      var li = document.createElement("li");
      li.className = "cat-list__item";
      li.innerHTML =
        '<span class="cat-list__name"><span class="workspace__dot" style="background:' +
        categoryDot(cat) +
        '" aria-hidden="true"></span>' +
        esc(cat) +
        '<span class="workspace__count">' +
        count +
        "</span></span>" +
        '<button type="button" class="icon-btn icon-btn--danger" data-rm-cat="' +
        esc(cat) +
        '">' +
        icon("xmark") +
        '<span class="sr-only">Remove category ' +
        esc(cat) +
        "</span></button>";
      list.appendChild(li);
    });

    if (!settings.categories.length) {
      list.innerHTML =
        '<li class="form-hint">No categories yet | add one below.</li>';
    }
  }

  function setImageError(message) {
    var node = el("imageError");
    if (!node) return;
    node.textContent = message || "";
    var input = el("taskImage");
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  async function renderImagePreview() {
    var wrap = el("taskImagePreview");
    var thumb = el("taskImageThumb");
    var nameNode = el("taskImageName");
    var altInput = el("taskImageAlt");
    var clearBtn = el("taskImageClear");
    if (!wrap || !thumb) return;

    if (ui.stagedImage) {
      var localUrl = URL.createObjectURL(ui.stagedImage.file);
      thumb.src = localUrl;
      thumb.alt =
        altInput && altInput.value
          ? altInput.value
          : "Preview of the selected image";
      if (nameNode)
        nameNode.textContent =
          ui.stagedImage.file.name +
          " · " +
          Images.formatBytes(ui.stagedImage.file.size) +
          " (saves on submit)";
      wrap.hidden = false;
      if (clearBtn) clearBtn.hidden = false;
      return;
    }

    if (ui.imageId) {
      var url = await Images.getUrl(ui.imageId);
      if (url) {
        var meta = await Images.getMeta(ui.imageId);
        thumb.src = url;
        thumb.alt = meta && meta.alt ? meta.alt : "Task image";
        if (nameNode)
          nameNode.textContent = meta
            ? meta.name + " · " + Images.formatBytes(meta.size)
            : "Image";
        if (altInput && meta && !altInput.value)
          altInput.value = meta.alt || "";
        wrap.hidden = false;
        if (clearBtn) clearBtn.hidden = false;
      } else {
        resetImageField();
      }
      return;
    }

    resetImageField();
  }

  function resetImageField() {
    var wrap = el("taskImagePreview");
    var thumb = el("taskImageThumb");
    var nameNode = el("taskImageName");
    var altInput = el("taskImageAlt");
    var clearBtn = el("taskImageClear");
    if (wrap) wrap.hidden = true;
    if (thumb) {
      thumb.removeAttribute("src");
      thumb.alt = "";
    }
    if (nameNode) nameNode.textContent = "";
    if (altInput) altInput.value = "";
    if (clearBtn) clearBtn.hidden = true;
    ui.imageId = null;
    ui.stagedImage = null;
    setImageError("");
  }

  function handleImageChosen(event) {
    var input = event.target;
    var file = input.files && input.files[0];
    if (!file) return;

    var check = Images.validateFile(file);
    if (!check.valid) {
      setImageError(check.message);
      input.value = "";
      announceAssertive(check.message);
      return;
    }

    setImageError("");
    ui.stagedImage = { file: file };
    ui.imageId = null;
    renderImagePreview();
    announcePolite(
      "Image " + file.name + " selected. It will be saved with the task.",
    );
  }

  function clearStagedImage() {
    ui.stagedImage = null;
    ui.imageId = null;
    var input = el("taskImage");
    if (input) input.value = "";
    resetImageField();
    announcePolite("Image removed.");
  }

  async function commitImage(taskId) {
    if (!ui.stagedImage) return null;
    try {
      var meta = {
        taskId: taskId,
        alt: (el("taskImageAlt") && el("taskImageAlt").value) || "",
      };
      var stored = await Images.store(ui.stagedImage.file, meta);
      return stored.id;
    } catch (err) {
      console.error("Could not store the image:", err);
      return null;
    }
  }

  function imageThumb(record) {
    if (!record.imageId) return "";
    var url = Images.peekUrl(record.imageId);
    if (!url) {
      queueMicrotask(function () {
        hydrateThumb(record.imageId);
      });
      return (
        '<span class="thumb thumb--pending" data-image-id="' +
        esc(record.imageId) +
        '" aria-hidden="true"></span>'
      );
    }
    return (
      '<img class="thumb" src="' +
      url +
      '" alt="" data-image-id="' +
      esc(record.imageId) +
      '" loading="lazy" />'
    );
  }

  var hydrated = new Set();
  async function hydrateThumb(imageId) {
    if (!imageId || hydrated.has(imageId)) return;
    hydrated.add(imageId);
    var url = await Images.getUrl(imageId);
    if (!url) {
      hydrated.delete(imageId);
      return;
    }

    var selector;
    try {
      selector = '[data-image-id="' + CSS.escape(imageId) + '"]';
    } catch (err) {
      selector = "[data-image-id]";
    }
    var nodes = document.querySelectorAll(selector);
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.getAttribute("data-image-id") !== imageId) return;
      if (node.tagName === "IMG") {
        node.src = url;
      } else {
        var img = document.createElement("img");
        img.className = "thumb";
        img.src = url;
        img.alt = "";
        img.loading = "lazy";
        node.replaceWith(img);
      }
    });
  }

  var FIELD_ERRORS = {
    title: "errTitle",
    category: "errCategory",
    duration: "errDuration",
    dueDate: "errDue",
  };
  var FIELD_INPUTS = {
    title: "taskTitle",
    category: "taskCategory",
    duration: "taskDuration",
    dueDate: "taskDue",
  };

  function openNewModal() {
    ui.editingId = null;
    el("modalTitle").textContent = "New Task";
    el("taskForm").reset();
    el("taskDue").value = toISODate(new Date());
    el("taskStatus").value = "todo";
    el("taskPriority").value = "medium";
    resetImageField();
    clearErrors();
    openModal("taskTitle");
  }

  function openEditModal(id) {
    var rec = State.getRecord(id);
    if (!rec) return;
    ui.editingId = id;
    el("modalTitle").textContent = "Edit Task";
    el("taskTitle").value = rec.title;
    el("taskCategory").value = rec.category;
    el("taskDuration").value = String(rec.duration);
    el("taskDue").value = rec.dueDate;
    el("taskStatus").value = rec.status;
    el("taskPriority").value = rec.priority;
    el("taskNotes").value = rec.notes || "";
    resetImageField();
    ui.imageId = rec.imageId || null;
    if (ui.imageId) renderImagePreview();
    clearErrors();
    openModal("taskTitle");
  }

  function openModal(focusId) {
    var modal = el("taskModal");
    ui.lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var target = el(focusId);
    if (target) target.focus();
  }

  function closeModal() {
    el("taskModal").hidden = true;
    document.body.style.overflow = "";
    ui.editingId = null;
    restoreFocus();
  }

  function restoreFocus() {
    if (
      ui.lastFocus &&
      typeof ui.lastFocus.focus === "function" &&
      document.contains(ui.lastFocus)
    ) {
      ui.lastFocus.focus();
    }
    ui.lastFocus = null;
  }

  function clearErrors() {
    Object.keys(FIELD_ERRORS).forEach(function (field) {
      var node = el(FIELD_ERRORS[field]);
      if (node) node.textContent = "";
      var input = el(FIELD_INPUTS[field]);
      if (input) input.removeAttribute("aria-invalid");
    });
  }

  function showErrors(errors) {
    clearErrors();
    var firstField = null;
    Object.keys(errors).forEach(function (field) {
      var errNode = el(FIELD_ERRORS[field]);
      var input = el(FIELD_INPUTS[field]);
      if (errNode) errNode.textContent = errors[field];
      if (input) {
        input.setAttribute("aria-invalid", "true");
        if (!firstField) firstField = input;
      }
    });
    if (firstField) firstField.focus();
    return firstField;
  }

  function readForm() {
    return {
      title: el("taskTitle").value,
      category: el("taskCategory").value,
      duration: el("taskDuration").value,
      dueDate: el("taskDue").value,
      status: el("taskStatus").value,
      priority: el("taskPriority").value,
      notes: el("taskNotes").value,
    };
  }

  function submitTaskForm(event) {
    if (event) event.preventDefault();

    var data = readForm();
    var result = Validators.validateTask(data);

    if (!result.valid) {
      var names = Object.keys(result.errors).length;
      showErrors(result.errors);
      announceAssertive(
        "The form has " +
          names +
          (names === 1 ? " problem" : " problems") +
          ". Check the highlighted fields.",
      );
      return;
    }

    var wasEditing = !!ui.editingId;
    var imageId = ui.stagedImage ? null : ui.imageId;

    Promise.resolve()
      .then(function () {
        return wasEditing ? null : commitImage(null);
      })
      .then(function (newId) {
        if (wasEditing && ui.stagedImage) {
          return commitImage(ui.editingId).then(function (id) {
            return { id: id, replace: true };
          });
        }
        return { id: newId || imageId, replace: false };
      })
      .then(function (outcome) {
        if (outcome.replace && outcome.id) {
          var previous = ui.imageId;
          data.imageId = outcome.id;
          if (previous) Images.remove(previous);
        } else {
          data.imageId = outcome.id || null;
        }

        var saved;
        if (wasEditing) {
          saved = State.updateRecord(ui.editingId, data);
          toast("Task updated.");
          announcePolite('Task "' + saved.title + '" updated.');
        } else {
          saved = State.addRecord(data);
          if (saved.imageId)
            Images.getMeta(saved.imageId).then(function (m) {
              if (m) Images.updateTask(saved.imageId, saved.id);
            });
          toast("Task created.");
          announcePolite('New task "' + saved.title + '" created.');
        }

        ui.stagedImage = null;
        ui.imageId = null;
        closeModal();
      })
      .catch(function (err) {
        console.error("Could not save the task with its image:", err);
        setImageError(
          "The image could not be saved, so the task was not created. Please try again.",
        );
        announceAssertive("The image could not be saved.");
      });
  }

  function liveValidate(event) {
    var input = event.target;
    var field = Object.keys(FIELD_INPUTS).find(function (key) {
      return FIELD_INPUTS[key] === input.id;
    });
    if (!field) return;
    if (!input.getAttribute("aria-invalid")) return;

    var check;
    if (field === "title") check = Validators.testTitle(input.value);
    else if (field === "category") check = Validators.testCategory(input.value);
    else if (field === "duration") check = Validators.testDuration(input.value);
    else check = Validators.testDate(input.value);

    if (check.valid) {
      input.removeAttribute("aria-invalid");
      el(FIELD_ERRORS[field]).textContent = "";
    } else {
      el(FIELD_ERRORS[field]).textContent = check.message;
    }
  }

  function openConfirm(options) {
    var modal = el("confirmModal");
    ui.pendingConfirm = options;
    ui.lastFocus = document.activeElement;

    var heading = el("confirmHeading");
    if (heading) heading.textContent = options.heading;
    el("confirmBody").textContent = options.body;
    el("confirmOk").textContent = options.confirmLabel || "Confirm";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var cancel = modal.querySelector(
      "[data-close-confirm]:not(.modal__backdrop)",
    );
    if (cancel) cancel.focus();
    else el("confirmOk").focus();
  }

  function closeConfirm() {
    el("confirmModal").hidden = true;
    document.body.style.overflow = "";
    ui.pendingConfirm = null;
    restoreFocus();
  }

  function executeConfirm() {
    var pending = ui.pendingConfirm;
    closeConfirm();
    if (pending && typeof pending.onConfirm === "function") pending.onConfirm();
  }

  function confirmDelete(id) {
    var rec = State.getRecord(id);
    if (!rec) return;
    openConfirm({
      heading: "Delete this task?",
      body:
        '"' +
        rec.title +
        '" will be permanently removed. This cannot be undone.',
      confirmLabel: "Delete task",
      onConfirm: function () {
        State.deleteRecord(id);
        if (rec.imageId) Images.remove(rec.imageId);
        toast("Task deleted.");
        announcePolite('Task "' + rec.title + '" deleted.');
      },
    });
  }

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapTab(event) {
    if (event.key !== "Tab") return false;
    var task = el("taskModal");
    var confirm = el("confirmModal");
    var panel =
      task && !task.hidden
        ? el("taskPanel")
        : confirm && !confirm.hidden
          ? el("confirmPanel")
          : null;
    if (!panel) return false;

    var items = Array.prototype.filter.call(
      panel.querySelectorAll(FOCUSABLE),
      function (node) {
        return node.offsetParent !== null || node === document.activeElement;
      },
    );
    if (!items.length) return false;

    var first = items[0];
    var last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function anyModalOpen() {
    var task = el("taskModal");
    var confirm = el("confirmModal");
    return (!!task && !task.hidden) || (!!confirm && !confirm.hidden);
  }

  function exportData() {
    Storage.exportJSON({
      exportedAt: new Date().toISOString(),
      records: State.getRecords(),
      settings: State.getSettings(),
    });
    toast("Exported " + State.getCount() + " records as JSON.");
    announcePolite("JSON export downloaded.");
  }

  function exportCsv() {
    Storage.exportCSV(State.getRecords());
    toast("Exported " + State.getCount() + " records as CSV.");
    announcePolite("CSV export downloaded.");
  }

  function addToGoogleCalendar(id) {
    var Cal = window.App.Calendar;
    var rec = State.getRecord(id);
    if (!Cal || !rec) return;

    var url = Cal.buildEventURL(rec, State.getSettings().unit);
    if (!url) {
      toast("That task has no valid due date.");
      announceAssertive(
        "Cannot add to calendar: the due date is missing or invalid.",
      );
      return;
    }

    var win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      toast(
        "Your browser blocked the pop-up. Allow pop-ups, or use the .ics export in Settings.",
      );
      announceAssertive("The calendar window was blocked by the browser.");
      return;
    }
    toast("Review the event in Google Calendar, then press Save.");
    announcePolite(
      'Opened "' +
        rec.title +
        '" in Google Calendar. Press Save there to add it.',
    );
  }

  function exportICS() {
    var Cal = window.App.Calendar;
    if (!Cal) return;

    var records = State.getRecords();
    var includeDone = readIncludeDone();
    var count = Cal.countExportable(records, { includeDone: includeDone });

    if (!count) {
      toast("Nothing to export | every task is completed or has no due date.");
      announceAssertive("There is nothing to export to the calendar.");
      return;
    }

    var text = Cal.toICS(records, {
      unit: State.getSettings().unit,
      includeDone: includeDone,
    });
    Storage.download(Cal.filename(), "text/calendar", text);
    toast(
      "Exported " + count + (count === 1 ? " task" : " tasks") + " to .ics.",
    );
    announcePolite(
      "Exported " +
        count +
        " tasks as an .ics file. Import it in Google Calendar via Settings, then Import.",
    );
  }

  function readIncludeDone() {
    var toggle = el("includeDoneCalendar");
    return !!(toggle && toggle.checked);
  }

  async function copyICS() {
    var Cal = window.App.Calendar;
    if (!Cal) return;

    var records = State.getRecords();
    var includeDone = readIncludeDone();
    var text = Cal.toICS(records, {
      unit: State.getSettings().unit,
      includeDone: includeDone,
    });

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast("Clipboard is unavailable | use the download instead.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Calendar file copied. Paste it into a note or a message.");
      announcePolite("Calendar data copied to the clipboard.");
    } catch (err) {
      toast("Could not copy | use the download instead.");
    }
  }

  window.App = window.App || {};
  window.App.UI = {
    ui: ui,
    render: render,
    renderSidebar: renderSidebar,
    renderProfile: renderProfile,
    renderDashboard: renderDashboard,
    renderBoard: renderBoard,
    renderTable: renderTable,
    renderCalendar: renderCalendar,
    renderSettings: renderSettings,
    refreshTrendTheme: refreshTrendTheme,
    setSort: setSort,
    updateSearch: updateSearch,
    clearSearch: clearSearch,
    syncSearchFromUrl: syncSearchFromUrl,
    shiftMonth: shiftMonth,
    goToToday: goToToday,
    openNewModal: openNewModal,
    openEditModal: openEditModal,
    closeModal: closeModal,
    submitTaskForm: submitTaskForm,
    liveValidate: liveValidate,
    handleImageChosen: handleImageChosen,
    clearStagedImage: clearStagedImage,
    renderImagePreview: renderImagePreview,
    openConfirm: openConfirm,
    closeConfirm: closeConfirm,
    executeConfirm: executeConfirm,
    confirmDelete: confirmDelete,
    exportData: exportData,
    exportCsv: exportCsv,
    addToGoogleCalendar: addToGoogleCalendar,
    exportICS: exportICS,
    copyICS: copyICS,
    trapTab: trapTab,
    anyModalOpen: anyModalOpen,
    formatDuration: formatDuration,
    toast: toast,
    announcePolite: announcePolite,
    announceAssertive: announceAssertive,
  };
})();
