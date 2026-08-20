const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const state = {
  tab: "home",
  bootstrap: null,
  members: [],
  types: [],
  scanItems: [],
  memberId: null,
  familyId: null,
  addUnder: null,
  docType: null,
};

const ROLES = ["Head", "Husband", "Wife", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"];

function svgIcon(kind) {
  const map = {
    passport: "P",
    pan: "PAN",
    aadhaar: "A",
    dl: "DL",
    voter: "EC",
    birth: "B",
    rc: "RC",
    insurance: "IN",
    medical: "M",
    photo: "PH",
    other: "+",
  };
  return map[kind] || kind.slice(0, 2).toUpperCase();
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function api(url, options = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...options });
  const data = await res.json().catch(() => ({ ok: false, error: "Bad response" }));
  if (res.status === 401) {
    if (data.error === "setup_required") showLock(true);
    else showLock(false);
    throw new Error(data.error || "auth");
  }
  if (!res.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data;
}

function showLock(setup) {
  $("#app").classList.add("hidden");
  $("#lock").classList.remove("hidden");
  $("#confirm-wrap").classList.toggle("hidden", !setup);
  $("#lock-title").textContent = setup ? "Create family PIN" : "Welcome back";
  $("#lock-copy").textContent = setup
    ? "This PIN opens the app on iPhone and every other family phone."
    : "Same PIN on every phone. Documents stay saved.";
  $("#lock-btn").textContent = setup ? "Save PIN & open" : "Open";
  $("#lock-form").dataset.setup = setup ? "1" : "0";
}

function showApp() {
  $("#lock").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

function memberOptions(selected) {
  const opts = [`<option value="">Unassigned</option>`]
    .concat(
      state.members.map((m) => {
        const extra = m.family_name ? ` · ${m.family_name}` : "";
        return `<option value="${m.id}" ${String(m.id) === String(selected) ? "selected" : ""}>${esc(m.name)}${esc(extra)}</option>`;
      })
    )
    .join("");
  return opts;
}

function roleOptions(selected) {
  const cur = selected || "Wife";
  return ROLES.map(
    (r) => `<option value="${r}" ${r === cur ? "selected" : ""}>${r}</option>`
  ).join("");
}

function relPill(role) {
  const key = (role || "").toLowerCase();
  return `<span class="rel ${esc(key)}">${esc(role || "Member")}</span>`;
}

function setHouseTitle() {
  const el = $("#house-title");
  if (el && state.bootstrap && state.bootstrap.household_name) {
    el.textContent = state.bootstrap.household_name;
  }
}

function typeOptions(selected) {
  return state.types
    .map(
      (t) =>
        `<option value="${t.id}" ${t.id === selected ? "selected" : ""}>${esc(t.label)}</option>`
    )
    .join("");
}

function avatarHtml(url, fallback) {
  if (url) return `<img class="avatar" src="${esc(url)}" alt="" />`;
  return `<div class="avatar">${esc((fallback || "?").slice(0, 3).toUpperCase())}</div>`;
}

function pill(bucket, expiry) {
  if (!expiry) return `<span class="pill grey">No expiry</span>`;
  const label =
    bucket === "red" ? "Under 2 months" : bucket === "orange" ? "Under 4 months" : bucket === "green" ? "Under 6 months" : "OK";
  return `<span class="pill ${bucket || "grey"}">${esc(label)}</span>`;
}

async function render() {
  setHouseTitle();
  const screen = $("#screen");
  if (state.tab === "home") await renderHome(screen);
  if (state.tab === "family") await renderFamily(screen);
  if (state.tab === "docs") await renderDocs(screen);
  if (state.tab === "insurance") await renderInsurance(screen);
  if (state.tab === "upload") await renderUpload(screen);
  if (state.tab === "settings") await renderSettings(screen);
}

async function renderHome(screen) {
  const [data, stats] = await Promise.all([api("/api/dashboard"), api("/api/stats")]);
  const rows = data.items
    .map((item) => {
      return `<article class="card item ${item.bucket || ""}">
        <div class="row-card">
          ${avatarHtml(item.member_photo_url, item.member_name || item.person_name)}
          <div>
            <h3>${esc(item.member_name || item.person_name || "Family member")}</h3>
            <div>${esc(item.label)} · ${esc(item.doc_number || "No number yet")}</div>
            <div class="muted">${item.family_name ? esc(item.family_name) + " · " : ""}Expiry ${esc(item.expiry_date || "—")} · Renew ${esc(item.renew_date || item.end_date || "—")}</div>
            ${item.notes ? `<div class="muted">${esc(item.notes)}</div>` : ""}
          </div>
          <div>${pill(item.bucket, item.expiry_date)}</div>
        </div>
        <div class="actions">
          ${item.file_url ? `<a class="btn small ghost" href="${esc(item.file_url)}" target="_blank">View</a>` : ""}
        </div>
      </article>`;
    })
    .join("");
  screen.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${stats.families}</b><span>Families</span></div>
      <div class="stat"><b>${stats.members}</b><span>People</span></div>
      <div class="stat"><b>${stats.documents}</b><span>Docs</span></div>
      <div class="stat"><b>${data.items.length}</b><span>Due soon</span></div>
    </div>
    <h2>Upcoming expiry</h2>
    <div class="banner">Red = under 2 months · Orange = under 4 months · Green = under 6 months. A row stays here until you upload the renewed copy.</div>
    ${rows || `<div class="empty">Nothing expiring soon. Add a family and upload documents.</div>`}
  `;
}

async function renderFamily(screen) {
  const data = await api("/api/families");
  const membersData = await api("/api/members");
  state.members = membersData.members;

  if (state.memberId) {
    const detail = await api(`/api/members/${state.memberId}`);
    const m = detail.member;
    const docs = detail.documents
      .map(
        (d) => `<article class="card item ${d.bucket || ""}">
          <h3>${esc(d.label)}</h3>
          <div>${esc(d.doc_number || "—")}</div>
          <div class="muted">Expiry ${esc(d.expiry_date || "none")} · Renew ${esc(d.renew_date || "—")}</div>
          <div class="actions">
            ${d.file_url ? `<a class="btn small ghost" href="${esc(d.file_url)}" target="_blank">View</a>` : ""}
            <button class="btn small danger" data-del-doc="${d.id}">Delete</button>
          </div>
        </article>`
      )
      .join("");
    const relatives = (detail.relatives || [])
      .map(
        (r) => `<button class="family-person" data-member="${r.id}">
          ${avatarHtml(r.photo_url, r.code || r.name)}
          <div class="meta"><b>${esc(r.name)}</b><div class="muted">${esc(r.role || r.relation || "")}</div></div>
          ${relPill(r.role || r.relation || "Member")}
        </button>`
      )
      .join("");
    screen.innerHTML = `
      <button class="btn ghost" id="back-family">← Families</button>
      <div class="card" style="margin-top:12px">
        <div class="row-card">
          ${avatarHtml(m.photo_url, m.code || m.name)}
          <div>
            <h2>${esc(m.name)}</h2>
            <div class="muted">${esc(m.code || "")} ${m.family_name ? "· " + esc(m.family_name) : ""}</div>
            <div style="margin-top:6px">${relPill(m.role || m.relation || "Member")}</div>
          </div>
        </div>
      </div>
      <div class="section-title"><h3>People in this family</h3>
        <button class="btn small ghost" id="add-under-this">+ Add under ${esc((m.code || m.name.split(" ")[0]))}</button>
      </div>
      ${relatives || `<div class="empty">No one else in this family yet. Add a wife, child, or parent.</div>`}
      <h3>Documents</h3>
      ${docs || `<div class="empty">No documents yet. Use Upload.</div>`}
      <div class="card" id="under-form-wrap">${memberFormHtml({ under: m.id, title: "Add someone under " + m.name })}</div>
    `;
    $("#back-family").onclick = () => {
      state.memberId = null;
      render();
    };
    $("#add-under-this").onclick = () => {
      $("#under-form-wrap").scrollIntoView({ behavior: "smooth" });
    };
    bindMemberForm("#add-member");
    $$("[data-member]").forEach((btn) => {
      btn.onclick = () => {
        state.memberId = btn.dataset.member;
        render();
      };
    });
    $$("[data-del-doc]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete this document?")) return;
        await api(`/api/documents/${btn.dataset.delDoc}`, { method: "DELETE" });
        render();
      };
    });
    return;
  }

  const familyCards = (data.families || [])
    .map((fam) => {
      const head = fam.head;
      const others = (fam.members || []).filter((p) => !p.is_head);
      const branch = others
        .map(
          (p) => `<button class="family-person" data-member="${p.id}">
            ${avatarHtml(p.photo_url, p.code || p.name)}
            <div class="meta"><b>${esc(p.name)}</b><div class="muted">${esc(p.code || "")} · ${p.doc_count} docs</div></div>
            ${relPill(p.role || p.relation || "Member")}
          </button>`
        )
        .join("");
      return `<article class="family-card">
        <div class="section-title">
          <div>
            <h3>${esc(fam.name)}</h3>
            <div class="muted">${fam.count} people</div>
          </div>
        </div>
        ${
          head
            ? `<button class="family-head" data-member="${head.id}">
                ${avatarHtml(head.photo_url, head.code || head.name)}
                <div class="meta"><b>${esc(head.name)}</b><div class="muted">${esc(head.code || "")} · ${head.doc_count} docs</div></div>
                ${relPill("Head")}
              </button>`
            : ""
        }
        ${branch ? `<div class="family-branch">${branch}</div>` : `<p class="muted" style="margin:8px 0 0">No one added under this head yet.</p>`}
        <div class="actions">
          ${head ? `<button class="btn small ghost" data-add-under="${head.id}">+ Add under ${esc(head.code || head.name.split(" ")[0])}</button>` : ""}
        </div>
      </article>`;
    })
    .join("");

  const loose = (data.unassigned || [])
    .map(
      (m) => `<button class="tile" data-member="${m.id}">
        ${m.photo_url ? `<img src="${esc(m.photo_url)}" alt="" />` : `<div class="avatar" style="margin:0 auto 6px">${esc((m.code || m.name).slice(0, 3).toUpperCase())}</div>`}
        <div class="code">${esc(m.code || m.name.split(" ")[0])}</div>
        <div class="sub">${esc(m.name)}</div>
      </button>`
    )
    .join("");

  const underPrefill = state.addUnder
    ? memberFormHtml({ under: state.addUnder, title: "Add this person under a family head" })
    : memberFormHtml({ title: "Add a person" });

  screen.innerHTML = `
    <div class="section-title">
      <h2>Families</h2>
    </div>
    <p class="muted">Each head can have their own people. Example: VBA’s family with wife NVA under him.</p>
    ${familyCards || `<div class="empty">No families yet. Add VBA as a head, then add NVA under him.</div>`}
    ${loose ? `<h3>Not in a family yet</h3><div class="member-grid">${loose}</div>` : ""}
    <div class="card">
      <h3>Start a new family</h3>
      <form id="add-family">
        <label class="field">Family name<input name="name" placeholder="VBA's family" required /></label>
        <label class="field">Head of family
          <select name="head_member_id">
            <option value="">Choose later</option>
            ${state.members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}
          </select>
        </label>
        <button class="btn primary" type="submit">Create family</button>
      </form>
    </div>
    <div class="card">${underPrefill}</div>
  `;

  $$("[data-member]").forEach((btn) => {
    btn.onclick = () => {
      state.memberId = btn.dataset.member;
      state.addUnder = null;
      render();
    };
  });
  $$("[data-add-under]").forEach((btn) => {
    btn.onclick = () => {
      state.addUnder = btn.dataset.addUnder;
      render();
    };
  });
  bindMemberForm("#add-member");
  $("#add-family").onsubmit = async (e) => {
    e.preventDefault();
    await api("/api/families", { method: "POST", body: new FormData(e.target) });
    e.target.reset();
    render();
  };
}

function memberFormHtml({ under, title }) {
  const underVal = under || "";
  return `
    <h3>${esc(title)}</h3>
    <form id="add-member">
      <input type="hidden" name="under_member_id" value="${esc(underVal)}" />
      <label class="field">Name<input name="name" required placeholder="NVA / Nehal" /></label>
      <div class="grid2">
        <label class="field">Short code<input name="code" maxlength="8" placeholder="NVA" /></label>
        <label class="field">Relation to head
          <select name="role">${roleOptions(under ? "Wife" : "Head")}</select>
        </label>
      </div>
      ${
        under
          ? ""
          : `<label class="field"><input type="checkbox" name="start_family" value="1" checked /> This person is head of their own family</label>`
      }
      <div class="grid2">
        <label class="field">Phone<input name="phone" inputmode="tel" /></label>
        <label class="field">Date of birth<input name="dob" type="date" /></label>
      </div>
      <label class="field">Photo<input name="photo" type="file" accept="image/*" /></label>
      <button class="btn primary" type="submit">${under ? "Add to this family" : "Save person"}</button>
    </form>
  `;
}

function bindMemberForm(sel) {
  const form = $(sel);
  if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.set("relation", fd.get("role") || "");
    await api("/api/members", { method: "POST", body: fd });
    state.addUnder = null;
    render();
  };
}

async function renderDocs(screen) {
  const type = state.docType;
  const q = type ? `?doc_type=${encodeURIComponent(type)}` : "";
  const data = await api("/api/documents" + q);
  const typeTiles = state.types
    .map(
      (t) => `<button class="tile ${t.id === type ? "item orange" : ""}" data-type="${t.id}">
        <div class="code">${esc(svgIcon(t.id))}</div>
        <div class="sub">${esc(t.label)}</div>
      </button>`
    )
    .join("");
  const rows = data.documents
    .map(
      (d) => `<article class="card item ${d.bucket || ""}">
        <div class="row-card">
          ${avatarHtml(d.member_photo_url, d.member_name || d.person_name)}
          <div>
            <h3>${esc(d.member_name || d.person_name || "Unassigned")}</h3>
            <div>${esc(d.label)} · ${esc(d.doc_number || "—")}</div>
            <div class="muted">Expiry ${esc(d.expiry_date || "none")}</div>
          </div>
          ${d.file_url ? `<a class="btn small ghost" href="${esc(d.file_url)}" target="_blank">View</a>` : ""}
        </div>
      </article>`
    )
    .join("");
  screen.innerHTML = `
    <h2>Documents by type</h2>
    <p class="muted">Tap Passport, PAN, Aadhaar… to see that document for the whole family.</p>
    <div class="type-grid">${typeTiles}</div>
    <div style="margin-top:12px">
      ${type ? `<button class="btn ghost" id="clear-type">Show all types</button>` : ""}
      ${rows || `<div class="empty">No documents in this view yet.</div>`}
    </div>
  `;
  $$("[data-type]").forEach((btn) => {
    btn.onclick = () => {
      state.docType = btn.dataset.type;
      render();
    };
  });
  const clear = $("#clear-type");
  if (clear) clear.onclick = () => { state.docType = null; render(); };
}

async function renderInsurance(screen) {
  const data = await api("/api/policies");
  const rows = data.policies
    .map(
      (p) => `<article class="card item ${p.bucket || ""}">
        <h3>${esc(p.member_name || p.person_name || "Member")} · ${esc(p.provider || "Policy")}</h3>
        <div>${esc(p.policy_number || "—")}</div>
        <div class="muted">${esc(p.start_date || "—")} to ${esc(p.end_date || "—")} · ${esc(p.payment_mode || "")} ${esc(p.premium || "")}</div>
        <div class="actions">
          ${p.file_url ? `<a class="btn small ghost" href="${esc(p.file_url)}" target="_blank">View</a>` : ""}
          <button class="btn small danger" data-del-pol="${p.id}">Delete</button>
        </div>
      </article>`
    )
    .join("");
  screen.innerHTML = `
    <h2>Insurance policies</h2>
    <div class="banner">If expiry is inside 2 months the row turns red so you can update / upload the new policy.</div>
    ${rows || `<div class="empty">No policies yet. Upload a policy PDF or add one below.</div>`}
    <div class="card">
      <h3>Add policy</h3>
      <form id="add-policy">
        <label class="field">Family member<select name="member_id">${memberOptions()}</select></label>
        <label class="field">Provider<input name="provider" placeholder="HDFC / ICICI / Star Health" /></label>
        <label class="field">Policy number<input name="policy_number" /></label>
        <div class="grid2">
          <label class="field">Start date<input type="date" name="start_date" /></label>
          <label class="field">End date<input type="date" name="end_date" /></label>
        </div>
        <div class="grid2">
          <label class="field">Premium<input name="premium" /></label>
          <label class="field">Mode<select name="payment_mode"><option value="">—</option><option>Yearly</option><option>Monthly</option></select></label>
        </div>
        <label class="field">Policy PDF / photo<input type="file" name="file" accept=".pdf,image/*" /></label>
        <button class="btn primary" type="submit">Save policy</button>
      </form>
    </div>
  `;
  $$("[data-del-pol]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete this policy?")) return;
      await api(`/api/policies/${btn.dataset.delPol}`, { method: "DELETE" });
      render();
    };
  });
  $("#add-policy").onsubmit = async (e) => {
    e.preventDefault();
    await api("/api/policies", { method: "POST", body: new FormData(e.target) });
    e.target.reset();
    render();
  };
}

function reviewCard(item, idx) {
  const isIns = item.doc_type === "insurance";
  return `<form class="card" data-review="${idx}">
    <div class="review-file">${esc(item.original_name || item.file_name)}</div>
    <div class="muted">Read confidence ${esc(item.confidence || 0)}% ${item.needs_review ? "· please check" : "· looks good"}</div>
    ${item.raw_text ? `<details><summary class="muted">Text the app read</summary><pre class="review-file">${esc(item.raw_text).slice(0, 1200)}</pre></details>` : ""}
    ${item.error ? `<div class="banner">${esc(item.error)}</div>` : ""}
    <label class="field">Document type
      <select name="doc_type">${typeOptions(item.doc_type)}</select>
    </label>
    <label class="field">Family member
      <select name="member_id">${memberOptions(item.suggested_member_id)}</select>
    </label>
    <label class="field">${isIns ? "Policy number" : "Document number"}
      <input name="doc_number" value="${esc(item.doc_number || "")}" />
    </label>
    <label class="field">Name on document
      <input name="person_name" value="${esc(item.person_name || "")}" />
    </label>
    ${
      isIns
        ? `<label class="field">Provider<input name="provider" value="${esc(item.provider || "")}" /></label>
           <div class="grid2">
             <label class="field">Start<input type="date" name="issue_date" value="${esc(item.issue_date || "")}" /></label>
             <label class="field">End<input type="date" name="expiry_date" value="${esc(item.expiry_date || "")}" /></label>
           </div>`
        : `<div class="grid2">
             <label class="field">Issue date<input type="date" name="issue_date" value="${esc(item.issue_date || "")}" /></label>
             <label class="field">Expiry date<input type="date" name="expiry_date" value="${esc(item.expiry_date || "")}" /></label>
           </div>`
    }
    <label class="field">Notes (renew / renew + changes)
      <input name="notes" placeholder="Just renew, or renew + address change" />
    </label>
    <input type="hidden" name="file_path" value="${esc(item.file_path || "")}" />
    <input type="hidden" name="file_name" value="${esc(item.original_name || item.file_name || "")}" />
    <input type="hidden" name="sha256" value="${esc(item.sha256 || "")}" />
    <input type="hidden" name="raw_text" value="${esc(item.raw_text || "")}" />
    <input type="hidden" name="confidence" value="${esc(item.confidence || 0)}" />
    <button class="btn primary" type="submit">Save this document</button>
  </form>`;
}

async function renderUpload(screen) {
  const members = await api("/api/members");
  state.members = members.members;
  const reviews = state.scanItems.map(reviewCard).join("");
  screen.innerHTML = `
    <h2>Upload & auto-read</h2>
    <p class="muted">Zip, PDF, JPG, or PNG. Passport, PAN, Aadhaar, DL and policy files are read automatically. Check the details once, then save.</p>
    <div class="banner" id="storage-banner"></div>
    <form id="scan-form" class="card">
      <label class="drop">Tap to choose files from iPhone
        <input id="scan-files" name="files" type="file" accept=".zip,.pdf,.jpg,.jpeg,.png,.webp,.heic,image/*" multiple style="margin-top:10px" />
      </label>
      <p class="muted">You can send a zip of many PDFs/photos. The app splits them and fills the fields.</p>
      <button class="btn primary" type="submit">Read documents</button>
      <p class="muted" id="scan-status"></p>
    </form>
    ${reviews}
  `;
  const store = $("#storage-banner");
  if (store && state.bootstrap && state.bootstrap.files_dir) {
    store.textContent =
      "Original files are stored in " +
      state.bootstrap.files_dir +
      ". Names, numbers and dates are stored in " +
      state.bootstrap.database +
      ". They stay on this computer until you delete them.";
  }
  $("#scan-form").onsubmit = async (e) => {
    e.preventDefault();
    const input = $("#scan-files");
    if (!input.files.length) {
      $("#scan-status").textContent = "Choose at least one file.";
      return;
    }
    $("#scan-status").textContent = "Reading… this can take a few seconds.";
    const fd = new FormData();
    [...input.files].forEach((f) => fd.append("files", f));
    try {
      const data = await api("/api/scan", { method: "POST", body: fd });
      state.scanItems = data.items;
      $("#scan-status").textContent = `Read ${data.items.length} file(s). Confirm and save.`;
      render();
    } catch (err) {
      $("#scan-status").textContent = err.message;
    }
  };
  $$("form[data-review]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const type = fd.get("doc_type");
      if (type === "insurance") {
        const p = new FormData();
        p.set("member_id", fd.get("member_id"));
        p.set("provider", fd.get("provider") || "");
        p.set("policy_number", fd.get("doc_number"));
        p.set("person_name", fd.get("person_name"));
        p.set("start_date", fd.get("issue_date"));
        p.set("end_date", fd.get("expiry_date"));
        p.set("notes", fd.get("notes"));
        p.set("file_path", fd.get("file_path"));
        p.set("file_name", fd.get("file_name"));
        await api("/api/policies", { method: "POST", body: p });
      } else {
        await api("/api/documents", { method: "POST", body: fd });
      }
      const idx = Number(form.dataset.review);
      state.scanItems.splice(idx, 1);
      render();
    };
  });
}

async function renderSettings(screen) {
  const [settings, stats] = await Promise.all([api("/api/settings"), api("/api/stats")]);
  screen.innerHTML = `
    <h2>Settings</h2>
    <div class="stats">
      <div class="stat"><b>${stats.families}</b><span>Families</span></div>
      <div class="stat"><b>${stats.members}</b><span>People</span></div>
      <div class="stat"><b>${stats.documents}</b><span>Docs</span></div>
      <div class="stat"><b>${stats.policies}</b><span>Policies</span></div>
    </div>
    <div class="card">
      <h3>Household</h3>
      <form id="save-settings">
        <label class="field">Household name
          <input name="household_name" value="${esc(settings.household_name || "")}" />
        </label>
        <label class="field">Show on Home if expiry is within (days)
          <input name="reminder_days" type="number" min="14" max="365" value="${esc(settings.reminder_days)}" />
        </label>
        <div class="settings-row">
          <div><b>Show already-expired docs</b><div class="hint">Keep them on Home until you upload the new copy</div></div>
          <input class="toggle" type="checkbox" name="show_expired" value="1" ${settings.show_expired ? "checked" : ""} />
        </div>
        <button class="btn primary" type="submit">Save settings</button>
      </form>
    </div>
    <div class="card">
      <h3>Change family PIN</h3>
      <p class="muted">Same PIN on every phone. Choose 4–8 digits.</p>
      <form id="change-pin">
        <label class="field">Current PIN<input name="current" inputmode="numeric" maxlength="8" required /></label>
        <label class="field">New PIN<input name="pin" inputmode="numeric" maxlength="8" required /></label>
        <label class="field">Confirm new PIN<input name="confirm" inputmode="numeric" maxlength="8" required /></label>
        <button class="btn primary" type="submit">Update PIN</button>
        <p class="muted" id="pin-status"></p>
      </form>
    </div>
    <div class="card">
      <h3>Backup</h3>
      <p class="muted">Download a zip of the database and every uploaded PDF/photo. Keep this somewhere safe.</p>
      <a class="btn primary" href="/api/backup">Download backup zip</a>
    </div>
    <div class="card">
      <h3>Where files live</h3>
      <div class="settings-row"><div>Photos & PDFs</div><div class="hint">${esc(settings.files_dir)}</div></div>
      <div class="settings-row"><div>Names & dates</div><div class="hint">${esc(settings.database)}</div></div>
      <p class="muted">Copy the data folder to back up. Files stay on this computer, not on the iPhone.</p>
    </div>
  `;
  $("#save-settings").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!fd.get("show_expired")) fd.set("show_expired", "0");
    const saved = await api("/api/settings", { method: "POST", body: fd });
    state.bootstrap = { ...state.bootstrap, household_name: saved.household_name };
    setHouseTitle();
    render();
  };
  $("#change-pin").onsubmit = async (e) => {
    e.preventDefault();
    $("#pin-status").textContent = "";
    try {
      await api("/api/pin/change", { method: "POST", body: new FormData(e.target) });
      $("#pin-status").textContent = "PIN updated.";
      e.target.reset();
    } catch (err) {
      $("#pin-status").textContent = err.message;
    }
  };
}

async function boot() {
  const info = await fetch("/api/bootstrap").then((r) => r.json());
  state.bootstrap = info;
  state.types = info.doc_types;
  if (!info.pin_set) {
    showLock(true);
    return;
  }
  if (!info.authed) {
    showLock(false);
    return;
  }
  showApp();
  setHouseTitle();
  const members = await api("/api/members");
  state.members = members.members;
  render();
}

$("#lock-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#lock-error").textContent = "";
  const pin = $("#pin").value.trim();
  const setup = e.target.dataset.setup === "1";
  const fd = new FormData();
  fd.set("pin", pin);
  try {
    if (setup) {
      fd.set("confirm", $("#pin2").value.trim());
      await api("/api/setup", { method: "POST", body: fd });
    } else {
      await api("/api/login", { method: "POST", body: fd });
    }
    showApp();
    const members = await api("/api/members");
    state.members = members.members;
    render();
  } catch (err) {
    $("#lock-error").textContent = err.message;
  }
});

$("#logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showLock(false);
});

$("#open-settings").addEventListener("click", () => {
  $$(".tabs button").forEach((b) => b.classList.remove("active"));
  state.tab = "settings";
  state.memberId = null;
  render();
});

$$(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.tab = btn.dataset.tab;
    state.memberId = null;
    state.addUnder = null;
    render();
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

boot().catch((err) => {
  $("#lock").classList.remove("hidden");
  $("#lock-error").textContent = err.message;
});
