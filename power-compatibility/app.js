(function () {
  "use strict";

  var PLUGS = {
    A: {
      type: "Type A",
      title: "North American and Japanese 2-pin",
      pins: "2 flat parallel blades",
      grounded: false,
      voltage: "100–127 V",
      minV: 100,
      maxV: 127,
      amp: "15 A",
      countries: ["United States", "Canada", "Japan", "Mexico", "Taiwan"],
      description:
        "Two flat parallel blades. The Japanese form uses blades of equal width. The US form has a slightly wider neutral blade.",
      draw: [
        { t: "rect", x: 36, y: 38, w: 12, h: 40 },
        { t: "rect", x: 72, y: 38, w: 12, h: 40 },
      ],
    },
    B: {
      type: "Type B",
      title: "North American 3-pin earthed",
      pins: "2 flat blades and 1 round earth pin",
      grounded: true,
      voltage: "100–127 V",
      minV: 100,
      maxV: 127,
      amp: "15 A",
      countries: ["United States", "Canada", "Mexico", "Japan, commercial"],
      description:
        "The earth pin is longer than the live blades, so the frame is earthed before the circuit closes.",
      draw: [
        { t: "rect", x: 34, y: 28, w: 12, h: 32 },
        { t: "rect", x: 74, y: 28, w: 12, h: 32 },
        { t: "circle", x: 60, y: 82, r: 8 },
      ],
    },
    C: {
      type: "Type C",
      title: "Europlug, 2-pin, unearthed",
      pins: "2 round pins, 4 mm",
      grounded: false,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "2.5 A",
      countries: ["Europe, except the UK and Ireland", "parts of South America", "parts of Asia"],
      description:
        "The common low-current international plug. It is limited to 2.5 A and has no earth contact. It is not a supply for machinery.",
      draw: [
        { t: "circle", x: 42, y: 60, r: 8 },
        { t: "circle", x: 78, y: 60, r: 8 },
      ],
    },
    D: {
      type: "Type D",
      title: "Indian 3-pin, 5 A and 6 A",
      pins: "3 large round pins in a triangle",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "5 A / 6 A",
      countries: ["India", "Nepal", "Sri Lanka", "Myanmar"],
      description:
        "Large round pins with the earth at the top. The 5 A and 6 A form is the lighter Indian standard. Heavy appliances use Type M.",
      draw: [
        { t: "circle", x: 60, y: 32, r: 9 },
        { t: "circle", x: 34, y: 78, r: 8 },
        { t: "circle", x: 86, y: 78, r: 8 },
      ],
    },
    E: {
      type: "Type E",
      title: "French 2-pin with female earth",
      pins: "2 round pins and an earth contact hole",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "16 A",
      countries: ["France", "Belgium", "Poland", "Czech Republic", "Slovakia"],
      description:
        "Two round pins, plus a hole that accepts the earth pin projecting from the socket. The socket makes the earth, not a third pin on the plug.",
      draw: [
        { t: "circle", x: 60, y: 34, r: 8, hole: true },
        { t: "circle", x: 38, y: 78, r: 8 },
        { t: "circle", x: 82, y: 78, r: 8 },
      ],
    },
    F: {
      type: "Type F",
      title: "Schuko, side earth clips",
      pins: "2 round pins and top and bottom earth clips",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "16 A",
      countries: ["Germany", "Austria", "Netherlands", "Spain", "Sweden", "Russia"],
      description:
        "Side earth clips at the top and bottom of the body. The plug can be inserted either way up. It is rated 16 A.",
      draw: [
        { t: "circle", x: 40, y: 60, r: 8 },
        { t: "circle", x: 80, y: 60, r: 8 },
        { t: "rect", x: 50, y: 22, w: 20, h: 8 },
        { t: "rect", x: 50, y: 90, w: 20, h: 8 },
      ],
    },
    G: {
      type: "Type G",
      title: "British 3-pin, fused",
      pins: "3 rectangular blades in a triangle",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "13 A",
      countries: ["United Kingdom", "Ireland", "United Arab Emirates", "Singapore", "Malaysia", "Hong Kong"],
      description:
        "Rectangular blades, an internal fuse, insulated sleeves on the live pins, and a shuttered socket that opens only when the earth pin enters.",
      draw: [
        { t: "rect", x: 52, y: 22, w: 16, h: 28 },
        { t: "rect", x: 22, y: 74, w: 30, h: 14 },
        { t: "rect", x: 68, y: 74, w: 30, h: 14 },
      ],
    },
    H: {
      type: "Type H",
      title: "Israeli 3-pin",
      pins: "3 pins, flat angled or round",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "16 A",
      countries: ["Israel", "Palestine"],
      description:
        "Used in Israel. Current sockets accept both the older flat angled blades and the later round-pin form.",
      draw: [
        { t: "circle", x: 36, y: 42, r: 7 },
        { t: "circle", x: 84, y: 42, r: 7 },
        { t: "circle", x: 60, y: 80, r: 7 },
      ],
    },
    I: {
      type: "Type I",
      title: "Australian and Chinese angled flat pin",
      pins: "2 or 3 flat blades in an inverted V",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "10 A / 15 A",
      countries: ["Australia", "New Zealand", "China", "Argentina"],
      description:
        "Two flat blades form an inverted V. The earthed form adds a vertical earth blade. China also accepts Type A and Type C in many outlets.",
      draw: [
        { t: "poly", points: "40,40 50,36 64,70 54,74" },
        { t: "poly", points: "80,40 70,36 56,70 66,74" },
        { t: "rect", x: 54, y: 78, w: 12, h: 24 },
      ],
    },
    J: {
      type: "Type J",
      title: "Swiss 3-pin, offset earth",
      pins: "3 round pins, earth offset below centre",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "10 A",
      countries: ["Switzerland", "Liechtenstein"],
      description:
        "Similar spacing to a Europlug, with an earth pin set below the centre line. The 10 A form is the household standard.",
      draw: [
        { t: "circle", x: 38, y: 46, r: 7 },
        { t: "circle", x: 82, y: 46, r: 7 },
        { t: "circle", x: 60, y: 76, r: 7 },
      ],
    },
    K: {
      type: "Type K",
      title: "Danish 3-pin",
      pins: "2 round pins and a half-round earth",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "16 A",
      countries: ["Denmark", "Greenland"],
      description:
        "Two round power pins and a half-round earth pin. A Type F Schuko plug does not pick up this earth.",
      draw: [
        { t: "circle", x: 38, y: 46, r: 7 },
        { t: "circle", x: 82, y: 46, r: 7 },
        { t: "path", d: "M46 78 A14 14 0 0 1 74 78 L74 88 L46 88 Z" },
      ],
    },
    L: {
      type: "Type L",
      title: "Italian inline 3-pin",
      pins: "3 round pins in one line",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "10 A / 16 A",
      countries: ["Italy", "Chile", "Uruguay"],
      description:
        "Three round pins in a straight line. The 10 A and 16 A versions use different pin spacing and do not interchange.",
      draw: [
        { t: "circle", x: 28, y: 60, r: 7 },
        { t: "circle", x: 60, y: 60, r: 7 },
        { t: "circle", x: 92, y: 60, r: 7 },
      ],
    },
    M: {
      type: "Type M",
      title: "Heavy-duty round pin, 15 A and 16 A",
      pins: "3 large round pins in a triangle",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "15 A / 16 A",
      countries: ["South Africa", "India", "Lesotho", "Nepal"],
      description:
        "The larger triangular round-pin form. In India and South Africa it carries the higher-current appliances that Type D does not.",
      draw: [
        { t: "circle", x: 60, y: 28, r: 11 },
        { t: "circle", x: 30, y: 82, r: 9 },
        { t: "circle", x: 90, y: 82, r: 9 },
      ],
    },
    N: {
      type: "Type N",
      title: "Brazilian and IEC 60906-1",
      pins: "3 round pins in a flat triangle",
      grounded: true,
      voltage: "100–240 V",
      minV: 100,
      maxV: 240,
      amp: "10 A / 20 A",
      countries: ["Brazil", "South Africa, newer installations"],
      description:
        "The IEC 60906-1 geometry, adopted in Brazil as Type N in 10 A and 20 A versions. South Africa is introducing the same family.",
      draw: [
        { t: "circle", x: 36, y: 50, r: 7 },
        { t: "circle", x: 84, y: 50, r: 7 },
        { t: "circle", x: 60, y: 72, r: 7 },
      ],
    },
    O: {
      type: "Type O",
      title: "Thai 3-pin, TIS 166-2549",
      pins: "3 round pins in a triangle",
      grounded: true,
      voltage: "220–240 V",
      minV: 220,
      maxV: 240,
      amp: "16 A",
      countries: ["Thailand"],
      description:
        "The Thai national standard. The socket also accepts a Type C Europlug for low-current devices.",
      draw: [
        { t: "circle", x: 60, y: 34, r: 7 },
        { t: "circle", x: 36, y: 78, r: 7 },
        { t: "circle", x: 84, y: 78, r: 7 },
      ],
    },
  };

  var COUNTRIES = [
    { id: "US", name: "United States", voltage: 120, freq: 60, plugs: ["A", "B"] },
    { id: "CA", name: "Canada", voltage: 120, freq: 60, plugs: ["A", "B"] },
    { id: "MX", name: "Mexico", voltage: 127, freq: 60, plugs: ["A", "B"] },
    { id: "DE", name: "Germany", voltage: 230, freq: 50, plugs: ["C", "F"] },
    { id: "FR", name: "France", voltage: 230, freq: 50, plugs: ["C", "E"] },
    { id: "GB", name: "United Kingdom", voltage: 230, freq: 50, plugs: ["G"] },
    { id: "IE", name: "Ireland", voltage: 230, freq: 50, plugs: ["G"] },
    { id: "IT", name: "Italy", voltage: 230, freq: 50, plugs: ["C", "F", "L"] },
    { id: "ES", name: "Spain", voltage: 230, freq: 50, plugs: ["C", "F"] },
    { id: "CH", name: "Switzerland", voltage: 230, freq: 50, plugs: ["C", "J"] },
    { id: "NL", name: "Netherlands", voltage: 230, freq: 50, plugs: ["C", "F"] },
    {
      id: "JP",
      name: "Japan",
      voltage: 100,
      freqs: [50, 60],
      plugs: ["A", "B"],
      note: "100 V nationwide. Eastern Japan, including Tokyo, is 50 Hz. Western Japan, including Osaka, is 60 Hz.",
    },
    { id: "CN", name: "China", voltage: 220, freq: 50, plugs: ["A", "C", "I"] },
    { id: "IN", name: "India", voltage: 230, freq: 50, plugs: ["C", "D", "M"] },
    { id: "AU", name: "Australia", voltage: 230, freq: 50, plugs: ["I"] },
    { id: "NZ", name: "New Zealand", voltage: 230, freq: 50, plugs: ["I"] },
    { id: "AE", name: "United Arab Emirates", voltage: 230, freq: 50, plugs: ["G"] },
    { id: "SG", name: "Singapore", voltage: 230, freq: 50, plugs: ["G"] },
    { id: "TH", name: "Thailand", voltage: 220, freq: 50, plugs: ["A", "B", "C", "O"] },
    { id: "ZA", name: "South Africa", voltage: 230, freq: 50, plugs: ["C", "D", "M", "N"] },
    {
      id: "BR",
      name: "Brazil",
      voltages: [127, 220],
      freq: 60,
      plugs: ["C", "N"],
      note: "Nominal voltage depends on the city. Many capitals are 127 V. Others, including Brasília, are 220 V.",
    },
    { id: "AR", name: "Argentina", voltage: 220, freq: 50, plugs: ["I"] },
    { id: "KR", name: "South Korea", voltage: 220, freq: 60, plugs: ["C", "F"] },
    { id: "VN", name: "Vietnam", voltage: 220, freq: 50, plugs: ["A", "C", "G"] },
    { id: "MY", name: "Malaysia", voltage: 240, freq: 50, plugs: ["G"] },
    { id: "DK", name: "Denmark", voltage: 230, freq: 50, plugs: ["C", "F", "K"] },
    { id: "IL", name: "Israel", voltage: 230, freq: 50, plugs: ["C", "H"] },
    { id: "SA", name: "Saudi Arabia", voltage: 220, freq: 60, plugs: ["G"] },
    { id: "EG", name: "Egypt", voltage: 220, freq: 50, plugs: ["C", "F"] },
    { id: "CL", name: "Chile", voltage: 220, freq: 50, plugs: ["C", "L"] },
    { id: "BE", name: "Belgium", voltage: 230, freq: 50, plugs: ["C", "E"] },
    { id: "HK", name: "Hong Kong", voltage: 220, freq: 50, plugs: ["G"] },
    { id: "RU", name: "Russia", voltage: 220, freq: 50, plugs: ["C", "F"] },
    { id: "ID", name: "Indonesia", voltage: 230, freq: 50, plugs: ["C", "F"] },
    { id: "QA", name: "Qatar", voltage: 240, freq: 50, plugs: ["G"] },
    { id: "BW", name: "Botswana", voltage: 230, freq: 50, plugs: ["D", "G", "M"] },
    { id: "PT", name: "Portugal", voltage: 230, freq: 50, plugs: ["C", "F"] },
    { id: "PL", name: "Poland", voltage: 230, freq: 50, plugs: ["C", "E"] },
    { id: "AT", name: "Austria", voltage: 230, freq: 50, plugs: ["C", "F"] },
    { id: "SE", name: "Sweden", voltage: 230, freq: 50, plugs: ["C", "F"] },
    { id: "TW", name: "Taiwan", voltage: 110, freq: 60, plugs: ["A", "B"] },
    { id: "LK", name: "Sri Lanka", voltage: 230, freq: 50, plugs: ["D", "G", "M"] },
    { id: "PH", name: "Philippines", voltage: 220, freq: 60, plugs: ["A", "B", "C"] },
  ];

  var ROUTES = [
    { label: "New York → Frankfurt", source: "US", target: "DE" },
    { label: "Surat → Antwerp", source: "IN", target: "BE" },
    { label: "Mumbai → Dubai", source: "IN", target: "AE" },
    { label: "Surat → New York", source: "IN", target: "US" },
    { label: "Hong Kong → London", source: "HK", target: "GB" },
    { label: "Tokyo → Sydney", source: "JP", target: "AU" },
  ];

  var mode = "machinery";
  var plugKey = "G";
  var plugFilter = "all";
  var lastResult = null;
  var toastTimer = 0;

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    var props = attrs || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    });
    var list = Array.isArray(children) ? children : [children];
    list.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function byId(id) {
    return COUNTRIES.find(function (country) {
      return country.id === id;
    });
  }

  function voltageSpan(country) {
    return country.voltages || [country.voltage];
  }

  function freqSpan(country) {
    return country.freqs || [country.freq];
  }

  function voltageLabel(country) {
    return voltageSpan(country).join(" / ") + " V";
  }

  function freqLabel(country) {
    return freqSpan(country).join(" / ") + " Hz";
  }

  function plugLabel(country) {
    return "Type " + country.plugs.join("/");
  }

  function optionLabel(country) {
    return country.name + " — " + voltageLabel(country) + ", " + freqLabel(country) + ", " + plugLabel(country);
  }

  function voltageRelation(source, target) {
    var a = voltageSpan(source);
    var b = voltageSpan(target);
    var min = Infinity;
    a.forEach(function (va) {
      b.forEach(function (vb) {
        min = Math.min(min, Math.abs(va - vb));
      });
    });
    var allClose = a.every(function (va) {
      return b.every(function (vb) {
        return Math.abs(va - vb) <= 15;
      });
    });
    return { min: min, allClose: allClose };
  }

  function freqRelation(source, target) {
    var a = freqSpan(source);
    var b = freqSpan(target);
    var overlap = a.some(function (f) {
      return b.indexOf(f) !== -1;
    });
    var exact = a.length === 1 && b.length === 1 && a[0] === b[0];
    return { exact: exact, overlap: overlap, a: a, b: b };
  }

  function evaluate(source, target, currentMode) {
    var shared = source.plugs.filter(function (pin) {
      return target.plugs.indexOf(pin) !== -1;
    });
    var onlyC = shared.length > 0 && shared.every(function (pin) {
      return pin === "C";
    });
    var volts = voltageRelation(source, target);
    var freq = freqRelation(source, target);
    var pin = "fit";
    if (shared.length === 0) pin = "adapter";
    else if (onlyC && currentMode === "machinery") pin = "limited";
    else if (onlyC) pin = "low-current";

    var voltage = "match";
    if (volts.min > 15) voltage = "mismatch";
    else if (!volts.allClose) voltage = "confirm";

    var frequency = "match";
    if (!freq.overlap) frequency = "shift";
    else if (!freq.exact) frequency = "confirm";

    var level = "ok";
    var title = "Plug family and voltage align";
    var plugChange = pin === "adapter" || pin === "limited";
    if (voltage === "mismatch" && plugChange) {
      level = "error";
      title = "Adapter and transformer both required";
    } else if (voltage === "mismatch") {
      level = "warning";
      title = "Transformer required";
    } else if (voltage === "confirm" && plugChange) {
      level = "warning";
      title = "Confirm the voltage, and change the plug";
    } else if (voltage === "confirm") {
      level = "warning";
      title = "Confirm the local nominal voltage before power-on";
    } else if (pin === "limited") {
      level = "info";
      title = "Earthed connection required for this equipment";
    } else if (pin === "adapter") {
      level = "info";
      title = "Plug adapter required";
    } else if (pin === "low-current") {
      level = "info";
      title = "Low-current fit only";
    }

    return {
      source: source,
      target: target,
      mode: currentMode,
      shared: shared,
      pin: pin,
      voltage: voltage,
      frequency: frequency,
      freq: freq,
      level: level,
      title: title,
    };
  }

  function pinCopy(result) {
    var source = result.source;
    var target = result.target;
    var shared = result.shared.map(function (pin) {
      return "Type " + pin;
    }).join(", ");
    if (result.pin === "fit") {
      return {
        tone: "ok",
        badge: "Direct fit",
        text:
          shared +
          " is used in both places. The source pin standard can seat in a " +
          target.name +
          " socket of that family.",
      };
    }
    if (result.pin === "limited") {
      return {
        tone: "warning",
        badge: "Not a machinery fit",
        text:
          "The only shared standard is Type C, rated 2.5 A, with no earth. Equipment that needs a protective earth requires the destination earthed plug, an IEC 60309 connector, or a hard-wired supply.",
      };
    }
    if (result.pin === "low-current") {
      return {
        tone: "info",
        badge: "2.5 A limit",
        text:
          "Type C is shared. It suits a low-current, unearthed device such as a charger marked 100–240 V. It is not an earth path, and it is not rated for machinery.",
      };
    }
    var extra = "";
    if (source.plugs.indexOf("C") !== -1 && (target.plugs.indexOf("E") !== -1 || target.plugs.indexOf("F") !== -1)) {
      extra = " A Type C Europlug can enter many Type E and Type F sockets, still at 2.5 A and without earth.";
    }
    return {
      tone: "warning",
      badge: "Adapter needed",
      text:
        "Type " +
        source.plugs.join("/") +
        " does not seat in a Type " +
        target.plugs.join("/") +
        " socket." +
        extra,
    };
  }

  function voltageCopy(result) {
    var sourceLabel = voltageLabel(result.source);
    var targetLabel = voltageLabel(result.target);
    if (result.voltage === "match") {
      return {
        tone: "ok",
        badge: "Within 15 V",
        text: sourceLabel + " and " + targetLabel + " sit inside a 15 V band. Still read the rating plate.",
      };
    }
    if (result.voltage === "confirm") {
      var note = result.source.note || result.target.note;
      return {
        tone: "warning",
        badge: "Confirm on site",
        text:
          (note ? note + " " : "") +
          "One side publishes more than one nominal (" +
          sourceLabel +
          " → " +
          targetLabel +
          "). Match the plate to the outlet in the room.",
      };
    }
    return {
      tone: "error",
      badge: "Transformer",
      text:
        "A device built for " +
        sourceLabel +
        " must not be connected to " +
        targetLabel +
        " through a pin adapter alone. Use a continuous-duty transformer rated to at least 150% of peak wattage, or equipment marked for both ranges.",
    };
  }

  function freqCopy(result) {
    var from = result.freq.a.join(" / ");
    var to = result.freq.b.join(" / ");
    if (result.frequency === "match") {
      return {
        tone: "ok",
        badge: "Same frequency",
        text: "Both sides use " + from + " Hz.",
      };
    }
    if (result.frequency === "confirm") {
      var note = [result.source, result.target]
        .map(function (country) {
          return country.note || "";
        })
        .filter(Boolean)
        .join(" ");
      return {
        tone: "info",
        badge: from + " Hz → " + to + " Hz",
        text:
          (note ? note + " " : "") +
          "Confirm the city. A transformer does not change frequency.",
      };
    }
    return {
      tone: "info",
      badge: from + " Hz → " + to + " Hz",
      text:
        "A transformer does not change frequency. A synchronous motor built for " +
        from +
        " Hz changes speed on " +
        to +
        " Hz, by about 17% when 60 Hz equipment runs on 50 Hz, and about 20% the other way. Switch-mode supplies marked 50/60 Hz are unaffected.",
    };
  }

  function modeNote(result) {
    if (result.mode === "machinery") {
      return {
        className: "note note-machinery",
        title: "Machinery and commissioning",
        text:
          "Above a 13–16 A wall socket in " +
          result.target.name +
          ", do not use a travel adapter. Specify an IEC 60309 industrial connector or a hard-wired junction, and prove the protective earth before the first power-on.",
      };
    }
    return {
      className: "note note-travel",
      title: "Personal equipment",
      text:
        "Read the rating plate. A mark of 100–240 V and 50/60 Hz means only the pin shape has to change. A single voltage on the plate means a pin adapter is not sufficient.",
    };
  }

  function fillFacts(container, country) {
    container.replaceChildren();
    [voltageLabel(country), freqLabel(country), plugLabel(country)].forEach(function (label) {
      container.append(h("span", { class: "fact" }, label));
    });
    if (country.note) container.append(h("p", { class: "fact-note" }, country.note));
  }

  function factorCard(index, title, copy) {
    var header = h("header", null, [h("h4", null, index + ". " + title), h("span", { class: "badge" }, copy.badge)]);
    return h("article", { class: "factor is-" + copy.tone }, [header, h("p", null, copy.text)]);
  }

  function renderResult() {
    var source = byId(document.getElementById("sourceSelect").value);
    var target = byId(document.getElementById("targetSelect").value);
    fillFacts(document.getElementById("sourceFacts"), source);
    fillFacts(document.getElementById("targetFacts"), target);
    var result = evaluate(source, target, mode);
    lastResult = result;
    var note = modeNote(result);
    var same =
      source.id === target.id
        ? " Origin and destination use the same published national standard."
        : "";
    var verdict = h("div", { class: "verdict is-" + result.level }, [
      h("div", { class: "verdict-row" }, [
        h("div", null, [
          h("h3", null, result.title),
          h(
            "p",
            { class: "route-line" },
            source.name +
              " · " +
              voltageLabel(source) +
              " · " +
              freqLabel(source) +
              "  →  " +
              target.name +
              " · " +
              voltageLabel(target) +
              " · " +
              freqLabel(target) +
              same
          ),
        ]),
        h("button", { class: "btn btn-ghost", id: "copyAssessment", type: "button" }, "Copy assessment"),
      ]),
    ]);
    var factors = h("div", { class: "factors" }, [
      factorCard("1", "Pin match", pinCopy(result)),
      factorCard("2", "Voltage", voltageCopy(result)),
      factorCard("3", "Frequency", freqCopy(result)),
    ]);
    var noteEl = h("aside", { class: note.className }, [h("h4", null, note.title), h("p", null, note.text)]);
    var root = document.getElementById("result");
    root.replaceChildren(verdict, factors, noteEl);
    document.getElementById("copyAssessment").addEventListener("click", function () {
      copyText(assessmentText(result)).then(function () {
        toast("Assessment copied.");
      });
    });
    markRoute(source.id, target.id);
  }

  function assessmentText(result) {
    var pin = pinCopy(result);
    var voltage = voltageCopy(result);
    var freq = freqCopy(result);
    var note = modeNote(result);
    return [
      "Vision 360° — Global Power Compatibility Reference",
      "Mode: " + (result.mode === "machinery" ? "Machinery" : "Personal travel"),
      "Origin: " + result.source.name + " — " + voltageLabel(result.source) + ", " + freqLabel(result.source) + ", " + plugLabel(result.source),
      "Destination: " + result.target.name + " — " + voltageLabel(result.target) + ", " + freqLabel(result.target) + ", " + plugLabel(result.target),
      "Verdict: " + result.title,
      "1. Pin match — " + pin.badge + ". " + pin.text,
      "2. Voltage — " + voltage.badge + ". " + voltage.text,
      "3. Frequency — " + freq.badge + ". " + freq.text,
      note.title + ": " + note.text,
    ].join("\n");
  }

  function markRoute(sourceId, targetId) {
    document.querySelectorAll("#routes button").forEach(function (button) {
      var on = button.getAttribute("data-source") === sourceId && button.getAttribute("data-target") === targetId;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function diagramSvg(plug) {
    var body = plug.draw
      .map(function (shape) {
        if (shape.t === "rect") {
          return (
            '<rect class="pin" x="' +
            shape.x +
            '" y="' +
            shape.y +
            '" width="' +
            shape.w +
            '" height="' +
            shape.h +
            '" rx="2"/>'
          );
        }
        if (shape.t === "circle") {
          return (
            '<circle class="' +
            (shape.hole ? "hole" : "pin") +
            '" cx="' +
            shape.x +
            '" cy="' +
            shape.y +
            '" r="' +
            shape.r +
            '"/>'
          );
        }
        if (shape.t === "poly") return '<polygon class="pin" points="' + shape.points + '"/>';
        if (shape.t === "path") return '<path class="pin" d="' + shape.d + '"/>';
        return "";
      })
      .join("");
    return (
      '<svg viewBox="0 0 120 120" role="img" aria-label="' +
      plug.type +
      ' pin diagram"><rect class="face" x="6" y="6" width="108" height="108" rx="22"/>' +
      body +
      "</svg>"
    );
  }

  function plugVisible(plug, query) {
    if (plugFilter === "grounded" && !plug.grounded) return false;
    if (plugFilter === "unearthed" && plug.grounded) return false;
    if (plugFilter === "low" && plug.minV > 127) return false;
    if (plugFilter === "high" && plug.maxV < 220) return false;
    if (!query) return true;
    var haystack = [plug.type, plug.title, plug.pins, plug.countries.join(" ")].join(" ").toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function renderPlugs() {
    var query = document.getElementById("plugSearch").value.trim().toLowerCase();
    var list = document.getElementById("plugList");
    var keys = Object.keys(PLUGS).filter(function (key) {
      return plugVisible(PLUGS[key], query);
    });
    list.replaceChildren();
    if (!keys.length) {
      list.append(h("p", { class: "empty" }, "No plug type matches that search."));
      document.getElementById("plugDetail").replaceChildren(h("p", { class: "empty" }, "Adjust the search or the filter."));
      return;
    }
    if (keys.indexOf(plugKey) === -1) plugKey = keys[0];
    keys.forEach(function (key) {
      var plug = PLUGS[key];
      var button = h("button", { class: "plug-option", type: "button", role: "option", "data-key": key }, [
        h("span", { class: "type-badge" }, key),
        h("span", null, [plug.title, h("small", null, plug.voltage + " · " + plug.amp)]),
      ]);
      button.setAttribute("aria-selected", key === plugKey ? "true" : "false");
      button.addEventListener("click", function () {
        plugKey = key;
        renderPlugs();
      });
      list.append(button);
    });
    renderPlugDetail(PLUGS[plugKey]);
    var count = document.getElementById("plugCount");
    count.textContent = keys.length + " of 15 shown";
  }

  function renderPlugDetail(plug) {
    var spec = h("table", { class: "spec" }, [
      h("tbody", null, [
        specRow("Pin geometry", plug.pins),
        specRow("Earth", plug.grounded ? "Earthed" : "No earth contact"),
        specRow("Voltage", plug.voltage),
        specRow("Current", plug.amp),
      ]),
    ]);
    var diagram = h("div", { class: "diagram" });
    diagram.innerHTML = diagramSvg(plug);
    var detail = document.getElementById("plugDetail");
    detail.replaceChildren(
      h("div", { class: "detail-top" }, [
        diagram,
        h("div", null, [h("p", { class: "kicker" }, plug.type), h("h3", null, plug.title), h("p", null, plug.description)]),
      ]),
      spec,
      h("p", { class: "lbl" }, "Where it is used"),
      h("p", { class: "countries" }, plug.countries.join(" · "))
    );
  }

  function specRow(label, value) {
    return h("tr", null, [h("th", { scope: "row" }, label), h("td", null, value)]);
  }

  function runWizard() {
    var appliance = document.getElementById("wizAppliance").value;
    var grid = document.getElementById("wizGrid").value;
    var box = document.getElementById("wizResult");
    var outcome = wizardOutcome(appliance, grid);
    box.className = "verdict is-" + outcome.tone;
    box.replaceChildren(h("h3", null, outcome.title), h("p", { class: "route-line" }, outcome.text));
    box.hidden = false;
  }

  function wizardOutcome(appliance, grid) {
    if (appliance === "dual") {
      return {
        tone: "ok",
        title: "Pin adapter only, if the plate agrees",
        text: "A supply marked 100–240 V and 50/60 Hz already converts voltage. Change the pin shape only. Do not feed this class of supply through a transformer.",
      };
    }
    if (appliance === "single110" && grid === "230") {
      return {
        tone: "error",
        title: "Step-down transformer required",
        text: "A 110–120 V device on a 220–240 V supply can fail as soon as it is energised. A pin adapter does not change voltage. Use a continuous-duty step-down transformer rated to at least 150% of peak wattage.",
      };
    }
    if (appliance === "single110" && grid === "100") {
      return {
        tone: "info",
        title: "Close band — read the rating plate",
        text: "Japan is 100 V. Some 110–120 V devices tolerate that band. If 100 V is not printed on the plate, do not treat it as compatible.",
      };
    }
    if (appliance === "single110") {
      return {
        tone: "ok",
        title: "Voltage family matches",
        text: "120 V sits inside the 110–120 V band. Match the plug, and keep the earth connected where the device has one.",
      };
    }
    if (appliance === "single230" && grid !== "230") {
      return {
        tone: "warning",
        title: "Step-up transformer required",
        text: "A 220–240 V device on a 100–120 V supply will not reach rated power. Use a step-up transformer rated to at least 150% of peak wattage.",
      };
    }
    if (appliance === "single230") {
      return {
        tone: "ok",
        title: "Voltage family matches",
        text: "220–240 V agrees with this grid. Match the plug and connect the earth.",
      };
    }
    return {
      tone: "info",
      title: "Frequency still has to be checked",
      text: "A transformer changes voltage only. A motor built for 60 Hz runs about 17% slower on 50 Hz, and hotter. A 50 Hz motor on 60 Hz runs about 20% faster. Use a motor rated for the destination frequency, or a variable-frequency drive.",
    };
  }

  function updateReady() {
    var boxes = document.querySelectorAll("#checks input[type=checkbox]");
    var on = Array.prototype.filter.call(boxes, function (box) {
      return box.checked;
    }).length;
    document.getElementById("readyCount").textContent = on + " of " + boxes.length + " checks confirmed";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      var ok = document.execCommand("copy");
      area.remove();
      if (ok) resolve();
      else reject(new Error("copy failed"));
    });
  }

  function toast(message) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove("is-on");
    }, 2400);
  }

  function populateCountries() {
    var sorted = COUNTRIES.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    ["sourceSelect", "targetSelect"].forEach(function (id) {
      var select = document.getElementById(id);
      sorted.forEach(function (country) {
        select.append(h("option", { value: country.id }, optionLabel(country)));
      });
    });
    document.getElementById("sourceSelect").value = "US";
    document.getElementById("targetSelect").value = "DE";
  }

  function renderRoutes() {
    var root = document.getElementById("routes");
    ROUTES.forEach(function (route) {
      var button = h("button", { type: "button", "data-source": route.source, "data-target": route.target }, route.label);
      button.addEventListener("click", function () {
        document.getElementById("sourceSelect").value = route.source;
        document.getElementById("targetSelect").value = route.target;
        renderResult();
      });
      root.append(button);
    });
  }

  function setMode(next) {
    mode = next;
    document.getElementById("modeMachinery").setAttribute("aria-pressed", next === "machinery" ? "true" : "false");
    document.getElementById("modeTravel").setAttribute("aria-pressed", next === "travel" ? "true" : "false");
    renderResult();
  }

  function bind() {
    document.getElementById("sourceSelect").addEventListener("change", renderResult);
    document.getElementById("targetSelect").addEventListener("change", renderResult);
    document.getElementById("swapBtn").addEventListener("click", function () {
      var source = document.getElementById("sourceSelect");
      var target = document.getElementById("targetSelect");
      var hold = source.value;
      source.value = target.value;
      target.value = hold;
      renderResult();
    });
    document.getElementById("modeMachinery").addEventListener("click", function () {
      setMode("machinery");
    });
    document.getElementById("modeTravel").addEventListener("click", function () {
      setMode("travel");
    });
    document.getElementById("plugSearch").addEventListener("input", renderPlugs);
    document.getElementById("plugList").addEventListener("keydown", function (event) {
      var keys = Array.prototype.map.call(document.querySelectorAll(".plug-option"), function (button) {
        return button.getAttribute("data-key");
      });
      var index = keys.indexOf(plugKey);
      if (event.key === "ArrowDown") index = Math.min(keys.length - 1, index + 1);
      else if (event.key === "ArrowUp") index = Math.max(0, index - 1);
      else return;
      event.preventDefault();
      plugKey = keys[index];
      renderPlugs();
      var selected = document.querySelector('.plug-option[data-key="' + plugKey + '"]');
      if (selected) selected.focus();
    });
    document.querySelectorAll("#plugFilters button").forEach(function (button) {
      button.addEventListener("click", function () {
        plugFilter = button.getAttribute("data-filter");
        document.querySelectorAll("#plugFilters button").forEach(function (peer) {
          peer.setAttribute("aria-pressed", peer === button ? "true" : "false");
        });
        renderPlugs();
      });
    });
    document.getElementById("wizRun").addEventListener("click", runWizard);
    document.getElementById("checks").addEventListener("change", updateReady);
    document.getElementById("copyClause").addEventListener("click", function () {
      copyText(document.getElementById("clause").innerText).then(function () {
        toast("Handover clause copied.");
      });
    });
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    populateCountries();
    renderRoutes();
    bind();
    renderResult();
    renderPlugs();
    updateReady();
  });
})();
