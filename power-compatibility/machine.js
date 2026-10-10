(function () {
  "use strict";

  var MACHINE = {
    id: "IN",
    name: "India",
    voltage: 230,
    freq: 50,
    plugs: ["C", "D", "M"],
  };

  var PLUGS = {
    A: { type: "Type A", pins: "2 flat blades", draw: [{ t: "rect", x: 36, y: 38, w: 12, h: 40 }, { t: "rect", x: 72, y: 38, w: 12, h: 40 }] },
    B: { type: "Type B", pins: "2 flat blades and a round earth", draw: [{ t: "rect", x: 34, y: 28, w: 12, h: 32 }, { t: "rect", x: 74, y: 28, w: 12, h: 32 }, { t: "circle", x: 60, y: 82, r: 8 }] },
    C: { type: "Type C", pins: "2 round pins, no earth", draw: [{ t: "circle", x: 42, y: 60, r: 8 }, { t: "circle", x: 78, y: 60, r: 8 }] },
    D: { type: "Type D", pins: "3 round pins, 5 A", draw: [{ t: "circle", x: 60, y: 32, r: 9 }, { t: "circle", x: 34, y: 78, r: 8 }, { t: "circle", x: 86, y: 78, r: 8 }] },
    E: { type: "Type E", pins: "2 round pins and an earth hole", draw: [{ t: "circle", x: 60, y: 34, r: 8, hole: true }, { t: "circle", x: 38, y: 78, r: 8 }, { t: "circle", x: 82, y: 78, r: 8 }] },
    F: { type: "Type F", pins: "2 round pins and side earth clips", draw: [{ t: "circle", x: 40, y: 60, r: 8 }, { t: "circle", x: 80, y: 60, r: 8 }, { t: "rect", x: 50, y: 22, w: 20, h: 8 }, { t: "rect", x: 50, y: 90, w: 20, h: 8 }] },
    G: { type: "Type G", pins: "3 rectangular blades", draw: [{ t: "rect", x: 52, y: 22, w: 16, h: 28 }, { t: "rect", x: 22, y: 74, w: 30, h: 14 }, { t: "rect", x: 68, y: 74, w: 30, h: 14 }] },
    H: { type: "Type H", pins: "3 round pins", draw: [{ t: "circle", x: 36, y: 42, r: 7 }, { t: "circle", x: 84, y: 42, r: 7 }, { t: "circle", x: 60, y: 80, r: 7 }] },
    I: { type: "Type I", pins: "flat blades in an inverted V", draw: [{ t: "poly", points: "40,40 50,36 64,70 54,74" }, { t: "poly", points: "80,40 70,36 56,70 66,74" }, { t: "rect", x: 54, y: 78, w: 12, h: 24 }] },
    J: { type: "Type J", pins: "3 round pins, offset earth", draw: [{ t: "circle", x: 38, y: 46, r: 7 }, { t: "circle", x: 82, y: 46, r: 7 }, { t: "circle", x: 60, y: 76, r: 7 }] },
    K: { type: "Type K", pins: "2 round pins and a half-round earth", draw: [{ t: "circle", x: 38, y: 46, r: 7 }, { t: "circle", x: 82, y: 46, r: 7 }, { t: "path", d: "M46 78 A14 14 0 0 1 74 78 L74 88 L46 88 Z" }] },
    L: { type: "Type L", pins: "3 round pins in a line", draw: [{ t: "circle", x: 28, y: 60, r: 7 }, { t: "circle", x: 60, y: 60, r: 7 }, { t: "circle", x: 92, y: 60, r: 7 }] },
    M: { type: "Type M", pins: "3 large round pins, 15 A", draw: [{ t: "circle", x: 60, y: 28, r: 11 }, { t: "circle", x: 30, y: 82, r: 9 }, { t: "circle", x: 90, y: 82, r: 9 }] },
    N: { type: "Type N", pins: "3 round pins, flat triangle", draw: [{ t: "circle", x: 36, y: 50, r: 7 }, { t: "circle", x: 84, y: 50, r: 7 }, { t: "circle", x: 60, y: 72, r: 7 }] },
    O: { type: "Type O", pins: "3 round pins in a triangle", draw: [{ t: "circle", x: 60, y: 34, r: 7 }, { t: "circle", x: 36, y: 78, r: 7 }, { t: "circle", x: 84, y: 78, r: 7 }] },
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
    { label: "Germany", target: "DE" },
    { label: "United States", target: "US" },
    { label: "United Kingdom", target: "GB" },
    { label: "Dubai", target: "AE" },
    { label: "Singapore", target: "SG" },
    { label: "South Africa", target: "ZA" },
  ];

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
    var list = Array.isArray(children) ? children : children === undefined ? [] : [children];
    list.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function byId(id) {
    for (var i = 0; i < COUNTRIES.length; i += 1) {
      if (COUNTRIES[i].id === id) return COUNTRIES[i];
    }
    return null;
  }

  function voltageSpan(country) {
    if (country.voltages) return country.voltages.slice();
    return [country.voltage];
  }

  function freqSpan(country) {
    if (country.freqs) return country.freqs.slice();
    return [country.freq];
  }

  function joinSlash(values, suffix) {
    return values.join(" / ") + (suffix || "");
  }

  function voltageLabel(country) {
    return joinSlash(voltageSpan(country), " V");
  }

  function freqLabel(country) {
    return joinSlash(freqSpan(country), " Hz");
  }

  function plugLabel(country) {
    return "Type " + country.plugs.join("/");
  }

  function optionLabel(country) {
    return country.name + " — " + voltageLabel(country) + ", " + freqLabel(country) + ", " + plugLabel(country);
  }

  function earthedPlugs(plugs) {
    return plugs.filter(function (pin) {
      return pin !== "A" && pin !== "C";
    });
  }

  function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function joinActions(parts) {
    if (parts.length === 0) return "Supply matches this machine";
    if (parts.length === 1) return capitalise(parts[0]);
    if (parts.length === 2) return capitalise(parts[0] + " and " + parts[1]);
    return capitalise(parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1]);
  }

  function evaluate(machine, country) {
    var sharedEarth = earthedPlugs(machine.plugs).filter(function (pin) {
      return country.plugs.indexOf(pin) !== -1;
    });
    var sharesC = machine.plugs.indexOf("C") !== -1 && country.plugs.indexOf("C") !== -1;
    var connector = "change";
    if (sharedEarth.length) connector = "fit";
    else if (sharesC) connector = "earth";

    var machineVolts = voltageSpan(machine);
    var siteVolts = voltageSpan(country);
    var minDelta = Infinity;
    machineVolts.forEach(function (machineVolt) {
      siteVolts.forEach(function (siteVolt) {
        minDelta = Math.min(minDelta, Math.abs(machineVolt - siteVolt));
      });
    });
    var allClose = machineVolts.every(function (machineVolt) {
      return siteVolts.every(function (siteVolt) {
        return Math.abs(machineVolt - siteVolt) <= 15;
      });
    });
    var machineAbove = machineVolts.every(function (machineVolt) {
      return siteVolts.every(function (siteVolt) {
        return machineVolt > siteVolt + 15;
      });
    });
    var machineBelow = machineVolts.every(function (machineVolt) {
      return siteVolts.every(function (siteVolt) {
        return siteVolt > machineVolt + 15;
      });
    });
    var voltage = "match";
    if (minDelta > 15 && machineAbove) voltage = "step-up";
    else if (minDelta > 15 && machineBelow) voltage = "step-down";
    else if (minDelta > 15) voltage = "step-up";
    else if (!allClose) voltage = "confirm";

    var machineFreq = freqSpan(machine);
    var siteFreq = freqSpan(country);
    var overlap = machineFreq.some(function (freq) {
      return siteFreq.indexOf(freq) !== -1;
    });
    var exact = machineFreq.length === 1 && siteFreq.length === 1 && machineFreq[0] === siteFreq[0];
    var frequency = "match";
    if (!overlap) frequency = "motor";
    else if (!exact) frequency = "confirm";

    var actions = [];
    if (connector === "earth") actions.push("specify an earthed connection");
    if (connector === "change") actions.push("change the connector");
    if (voltage === "step-up") actions.push("fit a step-up transformer");
    if (voltage === "step-down") actions.push("fit a step-down transformer");
    if (voltage === "confirm") actions.push("confirm the site voltage");
    if (frequency === "motor") actions.push("rate the motor for " + joinSlash(siteFreq) + " Hz");
    if (frequency === "confirm") actions.push("confirm the city frequency");

    var level = "ok";
    if (voltage === "step-up" || voltage === "step-down") level = "error";
    else if (actions.length) level = "warning";

    return {
      machine: machine,
      country: country,
      sharedEarth: sharedEarth,
      connector: connector,
      voltage: voltage,
      frequency: frequency,
      siteFreq: siteFreq,
      actions: actions,
      level: level,
      title: joinActions(actions),
    };
  }

  function connectorCopy(result) {
    var country = result.country;
    var fit = result.sharedEarth.map(function (pin) {
      return "Type " + pin;
    }).join(" and ");
    var destinationEarth = earthedPlugs(country.plugs).map(function (pin) {
      return "Type " + pin;
    }).join(" or ");
    if (result.connector === "fit") {
      return {
        tone: "ok",
        badge: "Matching earth pin",
        text: fit + " is used on the machine and in " + country.name + ". The machine plug can seat in that earthed socket. Confirm the socket current covers the machine rating.",
      };
    }
    if (result.connector === "earth") {
      return {
        tone: "warning",
        badge: "No earth on Type C",
        text: "The only shared plug is Type C, rated 2.5 A, with no earth. Fit " + destinationEarth + ", an IEC 60309 connector, or a hard-wired junction.",
      };
    }
    var named = destinationEarth || plugLabel(country);
    return {
      tone: "warning",
      badge: "Different plug",
      text: "Type C/D/M does not seat in a " + plugLabel(country) + " socket. Fit " + named + ", an IEC 60309 connector, or a hard-wired junction. Do not use a travel adapter on this machine.",
    };
  }

  function voltageCopy(result) {
    var machineLabel = voltageLabel(result.machine);
    var siteLabel = voltageLabel(result.country);
    if (result.voltage === "match") {
      return {
        tone: "ok",
        badge: "No transformer",
        text: "The machine is built for " + machineLabel + ". The site publishes " + siteLabel + ", inside a 15 V band. Still read the rating plate.",
      };
    }
    if (result.voltage === "confirm") {
      return {
        tone: "warning",
        badge: "Confirm the outlet",
        text: (result.country.note ? result.country.note + " " : "") + "Match the rating plate to the outlet in the room before choosing a transformer.",
      };
    }
    var direction = result.voltage === "step-down" ? "step-down" : "step-up";
    return {
      tone: "error",
      badge: direction === "step-down" ? "Step-down" : "Step-up",
      text: "The machine is built for " + machineLabel + ". The site is " + siteLabel + ". A plug change does not fix that. Use a continuous-duty " + direction + " transformer rated to at least 150% of peak wattage, or build the machine for the site voltage.",
    };
  }

  function frequencyCopy(result) {
    var site = joinSlash(result.siteFreq);
    if (result.frequency === "match") {
      return {
        tone: "ok",
        badge: "50 Hz",
        text: "The site is 50 Hz, the same as the machine. Motor speed stays as built.",
      };
    }
    if (result.frequency === "confirm") {
      return {
        tone: "warning",
        badge: "Confirm the city",
        text: (result.country.note ? result.country.note + " " : "") + "A transformer does not change frequency. Rate the motor for the frequency at the installation city.",
      };
    }
    return {
      tone: "warning",
      badge: "50 Hz → " + site + " Hz",
      text: "The machine is built for 50 Hz. This country is " + site + " Hz. A synchronous motor runs about 20% faster. Specify a motor rated for " + site + " Hz, or a variable-frequency drive. A transformer does not change frequency. A supply marked 50/60 Hz is unaffected.",
    };
  }

  function commissioning(result) {
    return "Above a 13–16 A wall socket, do not use a travel adapter. Specify an IEC 60309 connector with the wall-socket shape shown above, or a hard-wired junction, and prove the protective earth before the first power-on. This check uses the published single-phase nominal. A 400 V three-phase feed is a separate specification.";
  }

  function shapeMarkup(shape) {
    if (shape.t === "rect") {
      return '<rect class="pin" x="' + shape.x + '" y="' + shape.y + '" width="' + shape.w + '" height="' + shape.h + '" rx="2"/>';
    }
    if (shape.t === "circle") {
      return '<circle class="' + (shape.hole ? "hole" : "pin") + '" cx="' + shape.x + '" cy="' + shape.y + '" r="' + shape.r + '"/>';
    }
    if (shape.t === "poly") return '<polygon class="pin" points="' + shape.points + '"/>';
    if (shape.t === "path") return '<path class="pin" d="' + shape.d + '"/>';
    return "";
  }

  function faceSvg(letter) {
    var plug = PLUGS[letter];
    var body = plug.draw.map(shapeMarkup).join("");
    return '<svg viewBox="0 0 120 120" role="img" aria-label="' + plug.type + " " + plug.pins + '"><rect class="face" x="6" y="6" width="108" height="108" rx="22"/>' + body + "</svg>";
  }

  function socketLetters(country) {
    var earthed = earthedPlugs(country.plugs);
    return earthed.length ? earthed : country.plugs.slice();
  }

  function faceFigure(letter) {
    var plug = PLUGS[letter];
    var figure = h("figure", { class: "face-card" }, [
      h("div", { class: "diagram" }),
      h("figcaption", null, [h("strong", null, plug.type), h("span", null, plug.pins)]),
    ]);
    figure.querySelector(".diagram").innerHTML = faceSvg(letter);
    return figure;
  }

  function faceSet(letters, caption) {
    return h("div", null, [
      h("p", { class: "lbl" }, caption),
      h("div", { class: "face-set" }, letters.map(faceFigure)),
    ]);
  }

  function adapterText(result) {
    var wall = socketLetters(result.country).map(function (letter) {
      return PLUGS[letter].type;
    }).join(" or ");
    if (result.connector === "fit") {
      return "No adapter. The Type D or Type M plug on the machine seats in the " + result.country.name + " socket.";
    }
    return "Buy an adapter with a Type D or Type M plug on the machine and a " + wall + " socket on the wall.";
  }

  function adapterBlock(result) {
    var wall = socketLetters(result.country);
    var fits = result.connector === "fit";
    return h("section", { class: "adapter-buy" }, [
      h("h3", null, fits ? "No adapter to buy" : "Adapter to buy"),
      h("div", { class: "adapter-grid" }, [
        faceSet(["D", "M"], "Plug on the machine"),
        h("p", { class: "adapter-mid" }, [h("b", null, fits ? "=" : "→"), fits ? "Same shape" : "Buy"]),
        faceSet(wall, "Wall socket, " + result.country.name),
      ]),
      h("p", { class: "buy-line" }, adapterText(result)),
      h("p", { class: "phase-name" }, "Receiver’s purchase"),
      h("p", { class: "phase-line" }, "Once you receive the machine, purchase the power converter for your country’s supply and voltage. The plug faces show the machine side and the wall side for the country of sale."),
    ]);
  }

  function fillFacts(container, country) {
    container.replaceChildren();
    [voltageLabel(country), freqLabel(country), plugLabel(country)].forEach(function (label) {
      container.append(h("span", { class: "fact" }, label));
    });
  }

  function factorCard(index, title, copy) {
    return h("article", { class: "factor is-" + copy.tone }, [
      h("header", null, [h("h4", null, index + ". " + title), h("span", { class: "badge" }, copy.badge)]),
      h("p", null, copy.text),
    ]);
  }

  function specificationText(result) {
    var connector = connectorCopy(result);
    var voltage = voltageCopy(result);
    var frequency = frequencyCopy(result);
    return [
      "Vision 360° — Machine export supply",
      "Machine: India — 230 V, 50 Hz, Type C/D/M",
      "Country of sale: " + result.country.name + " — " + voltageLabel(result.country) + ", " + freqLabel(result.country) + ", " + plugLabel(result.country),
      "Receiver’s purchase: Once you receive the machine, purchase the power converter for your country’s supply and voltage.",
      "Adapter: " + adapterText(result),
      "Specify: " + result.title,
      "1. Connector — " + connector.badge + ". " + connector.text,
      "2. Voltage — " + voltage.badge + ". " + voltage.text,
      "3. Frequency — " + frequency.badge + ". " + frequency.text,
      "Commissioning: " + commissioning(result),
    ].join("\n");
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

  function markRoute(countryId) {
    document.querySelectorAll("#routes button").forEach(function (button) {
      var on = button.getAttribute("data-target") === countryId;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function renderResult() {
    var country = byId(document.getElementById("countrySelect").value);
    fillFacts(document.getElementById("machineFacts"), MACHINE);
    fillFacts(document.getElementById("countryFacts"), country);
    document.getElementById("machineLock").textContent = MACHINE.name;
    var result = evaluate(MACHINE, country);
    var verdict = h("div", { class: "verdict is-" + result.level }, [
      h("div", { class: "verdict-row" }, [
        h("div", null, [
          h("h3", null, result.title),
          h("p", { class: "route-line" }, "India · 230 V · 50 Hz  →  " + country.name + " · " + voltageLabel(country) + " · " + freqLabel(country)),
        ]),
        h("button", { class: "btn btn-ghost", id: "copySpec", type: "button" }, "Copy specification"),
      ]),
    ]);
    var factors = h("div", { class: "factors" }, [
      factorCard("1", "Connector", connectorCopy(result)),
      factorCard("2", "Voltage", voltageCopy(result)),
      factorCard("3", "Frequency", frequencyCopy(result)),
    ]);
    var note = h("aside", { class: "note note-machinery" }, [
      h("h4", null, "What to ship"),
      h("p", null, commissioning(result)),
    ]);
    var root = document.getElementById("result");
    root.replaceChildren(verdict, adapterBlock(result), factors, note);
    document.getElementById("copySpec").addEventListener("click", function () {
      copyText(specificationText(result)).then(function () {
        toast("Specification copied.");
      });
    });
    markRoute(country.id);
  }

  function populateCountries() {
    var select = document.getElementById("countrySelect");
    COUNTRIES.slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      })
      .forEach(function (country) {
        select.append(h("option", { value: country.id }, optionLabel(country)));
      });
    select.value = "DE";
  }

  function renderRoutes() {
    var root = document.getElementById("routes");
    ROUTES.forEach(function (route) {
      var button = h("button", { type: "button", "data-target": route.target }, route.label);
      button.addEventListener("click", function () {
        document.getElementById("countrySelect").value = route.target;
        renderResult();
      });
      root.append(button);
    });
  }

  function bind() {
    document.getElementById("countrySelect").addEventListener("change", renderResult);
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

  populateCountries();
  renderRoutes();
  bind();
  renderResult();
})();
