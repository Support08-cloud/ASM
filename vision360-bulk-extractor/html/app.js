const listInput = document.querySelector("#list-file");
const sourceInput = document.querySelector("#source-folder");
const startButton = document.querySelector("#start");
const statusText = document.querySelector("#status");
const errorText = document.querySelector("#error");
const summaryText = document.querySelector("#summary");
const fileNameText = document.querySelector("#file-name");
const previewBody = document.querySelector("#preview");
const filterInput = document.querySelector("#filter");
const progress = document.querySelector("#progress");
const resultText = document.querySelector("#result");
const skipInput = document.querySelector("#skip-existing");

let imported = null;
let sourceEntries = [];
let busy = false;
let cancelRequested = false;

listInput.addEventListener("change", () => {
  const file = listInput.files && listInput.files[0];
  if (!file) {
    return;
  }
  loadList(file);
});

sourceInput.addEventListener("change", () => {
  sourceEntries = [...sourceInput.files].map((file) => {
    const parts = (file.webkitRelativePath || file.name).split("/");
    return { rel: parts.slice(1).join("/"), file };
  }).filter((entry) => entry.rel);
  setStatus(sourceEntries.length + " file(s) found in the source folder.");
  errorText.textContent = "";
});

filterInput.addEventListener("input", renderPreview);
startButton.addEventListener("click", start);
document.querySelector("#cancel").addEventListener("click", () => {
  cancelRequested = true;
  setStatus("Cancelling…");
});

async function loadList(file) {
  errorText.textContent = "";
  setStatus("Reading " + file.name + "…");
  try {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      imported = V360Names.parseHtml(await file.text());
    } else if (lower.endsWith(".xlsx")) {
      imported = await V360Names.parseXlsx(await file.arrayBuffer(), inflateRaw);
    } else {
      throw new Error("Select an Excel workbook (.xlsx) or an HTML file (.html) with a NAME ID column.");
    }
    imported.fileName = file.name;
    fileNameText.textContent = file.name;
    summaryText.textContent = imported.ids.length + " NAME ID value(s) loaded. "
      + imported.duplicates + " duplicate(s) skipped, " + imported.emptyRows + " empty row(s).";
    renderPreview();
    setStatus(imported.ids.length
      ? "Loaded " + imported.ids.length + " ID(s) from " + file.name + ". Choose the source folder, then start."
      : "The file has a NAME ID column, but no ID values were found.");
    if (imported.ids.length === 0) {
      errorText.textContent = "Add at least one NAME ID below the header.";
    }
  } catch (error) {
    imported = null;
    fileNameText.textContent = file.name;
    summaryText.textContent = "The file was not imported.";
    previewBody.innerHTML = "";
    errorText.textContent = error.message || "The file could not be read.";
    setStatus("The file was not imported.");
  }
}

function renderPreview() {
  const filter = filterInput.value.trim().toLowerCase();
  const ids = imported ? imported.ids.filter((id) => !filter || id.toLowerCase().includes(filter)) : [];
  previewBody.innerHTML = ids.map((id) => "<tr><td>" + escapeHtml(id) + "</td></tr>").join("");
  document.querySelector("#visible").textContent = "Showing " + ids.length;
}

async function start() {
  if (busy) {
    return;
  }
  errorText.textContent = "";
  resultText.textContent = "";
  if (!imported || imported.ids.length === 0) {
    errorText.textContent = "Select an Excel or HTML file with at least one NAME ID before processing.";
    setStatus("Fix the items above before processing.");
    return;
  }
  if (sourceEntries.length === 0) {
    errorText.textContent = "Select the source folder that contains the files and folders.";
    setStatus("Fix the items above before processing.");
    return;
  }

  const plan = V360Names.planCopies(sourceEntries.map((entry) => entry.rel), imported.ids);
  if (plan.copies.length === 0) {
    errorText.textContent = "No matching files or folders were found. Nothing was processed.";
    resultText.textContent = "Missing IDs: " + (plan.missing.join(", ") || "none");
    setStatus("No matching data found.");
    return;
  }

  busy = true;
  cancelRequested = false;
  progress.value = 0;
  const bySource = new Map(sourceEntries.map((entry) => [entry.rel, entry.file]));
  const started = performance.now();
  try {
    if (window.isSecureContext && window.showDirectoryPicker) {
      const destination = await window.showDirectoryPicker({ mode: "readwrite" });
      await copyIntoFolder(destination, plan.copies, bySource);
      finish(plan, started, "Copied into the selected destination folder.");
    } else {
      await downloadZip(plan.copies, bySource);
      finish(plan, started, "Downloaded Vision360-Extracted.zip. Unzip it into the destination folder.");
    }
  } catch (error) {
    if (cancelRequested || (error && error.name === "AbortError")) {
      setStatus(error && error.name === "AbortError" ? "Destination folder was not selected." : "Processing cancelled.");
      return;
    }
    try {
      await downloadZip(plan.copies, bySource);
      finish(plan, started, "Downloaded Vision360-Extracted.zip. Unzip it into the destination folder.");
    } catch (zipError) {
      errorText.textContent = zipError.message || "Processing failed.";
      setStatus("Processing failed.");
    }
  } finally {
    busy = false;
  }
}

async function copyIntoFolder(root, copies, bySource) {
  let done = 0;
  for (const copy of copies) {
    if (cancelRequested) {
      throw new Error("Cancelled.");
    }
    const file = bySource.get(copy.source);
    await writeFile(root, copy.dest, file, skipInput.checked);
    done += 1;
    progress.value = Math.round(100 * done / copies.length);
    setStatus("Processing " + copy.dest);
  }
}

async function writeFile(root, relativePath, file, skipExisting) {
  const parts = relativePath.split("/");
  let directory = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    directory = await directory.getDirectoryHandle(parts[index], { create: true });
  }
  const name = parts[parts.length - 1];
  if (skipExisting) {
    try {
      await directory.getFileHandle(name);
      return;
    } catch {
      // The file is not in the destination yet.
    }
  }
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();
}

async function downloadZip(copies, bySource) {
  const files = [];
  let done = 0;
  for (const copy of copies) {
    if (cancelRequested) {
      throw new Error("Cancelled.");
    }
    const bytes = new Uint8Array(await bySource.get(copy.source).arrayBuffer());
    files.push({ path: copy.dest, bytes });
    done += 1;
    progress.value = Math.round(100 * done / copies.length);
    setStatus("Packing " + copy.dest);
  }
  const zip = await V360Names.buildZip(files, deflateRaw);
  const blob = new Blob([zip], { type: "application/zip" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Vision360-Extracted.zip";
  link.click();
  URL.revokeObjectURL(link.href);
}

function finish(plan, started, message) {
  const seconds = Math.max(1, Math.round((performance.now() - started) / 1000));
  resultText.textContent = message
    + " Files prepared: " + plan.copies.length
    + ". Missing IDs: " + (plan.missing.length ? plan.missing.join(", ") : "none")
    + ". Time: " + seconds + "s.";
  setStatus(message);
  progress.value = 100;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function setStatus(message) {
  statusText.textContent = message;
}

function escapeHtml(value) {
  return value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character]));
}
