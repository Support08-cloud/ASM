const V360Names = {
  parseHtml(html) {
    const rows = extractRows(html);
    return idsFromRows(rows, "the HTML file");
  },

  async parseXlsx(buffer, inflateRaw) {
    const entries = await readZip(buffer, inflateRaw);
    const sharedKey = Object.keys(entries).find((name) => name.toLowerCase().endsWith("sharedstrings.xml"));
    const strings = sharedKey ? sharedStrings(decodeXmlBytes(entries[sharedKey])) : [];
    const sheets = Object.keys(entries)
      .filter((name) => /xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort();
    if (sheets.length === 0) {
      throw new Error("The workbook has no worksheets. The first row must contain a NAME ID column.");
    }

    for (const sheetName of sheets) {
      const rows = sheetRows(decodeXmlBytes(entries[sheetName]), strings);
      const parsed = tryIdsFromRowMap(rows);
      if (parsed) {
        return parsed;
      }
    }

    throw new Error("The required column NAME ID is missing. Keep the header as NAME ID and put one ID on each row below it.");
  },

  async buildZip(files, deflateRaw) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    const encoder = new TextEncoder();
    for (const file of files) {
      const nameBytes = encoder.encode(file.path.replace(/\\/g, "/"));
      const raw = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
      const compressed = deflateRaw ? await deflateRaw(raw) : raw;
      const method = deflateRaw ? 8 : 0;
      const crc = crc32(raw);
      const local = new Uint8Array(30 + nameBytes.length + compressed.length);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(8, method, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, compressed.length, true);
      view.setUint32(22, raw.length, true);
      view.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30);
      local.set(compressed, 30 + nameBytes.length);
      locals.push(local);

      const central = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(10, method, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, compressed.length, true);
      centralView.setUint32(24, raw.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint32(42, offset, true);
      central.set(nameBytes, 46);
      centrals.push(central);
      offset += local.length;
    }

    const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
    const eocd = new Uint8Array(22);
    const endView = new DataView(eocd.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    const total = offset + centralSize + eocd.length;
    const zip = new Uint8Array(total);
    let cursor = 0;
    for (const local of locals) {
      zip.set(local, cursor);
      cursor += local.length;
    }
    for (const central of centrals) {
      zip.set(central, cursor);
      cursor += central.length;
    }
    zip.set(eocd, cursor);
    return zip;
  },

  planCopies(relativePaths, ids) {
    const idMap = new Map();
    const ordered = [];
    for (const raw of ids) {
      const id = String(raw).trim();
      const key = id.toLowerCase();
      if (!id || idMap.has(key)) {
        continue;
      }
      idMap.set(key, id);
      ordered.push(id);
    }

    const roots = [];
    const seenRoot = new Set();
    const addRoot = (id, rootPath, kind, leaf) => {
      const key = kind + ":" + rootPath.toLowerCase();
      if (seenRoot.has(key)) {
        return;
      }
      seenRoot.add(key);
      roots.push({ id, rootPath, kind, leaf });
    };

    for (const rel of relativePaths) {
      const parts = String(rel).split("/").filter(Boolean);
      if (parts.length === 0) {
        continue;
      }
      for (let index = 0; index < parts.length - 1; index += 1) {
        const id = idMap.get(parts[index].toLowerCase());
        if (id) {
          addRoot(id, parts.slice(0, index + 1).join("/"), "folder", parts[index]);
        }
      }
      const fileName = parts[parts.length - 1];
      const fileId = lookupFile(fileName, idMap);
      if (fileId) {
        addRoot(fileId, parts.join("/"), "file", fileName);
      }
    }

    const used = new Set();
    const plannedRoots = roots.map((root) => {
      let dest = root.leaf;
      if (used.has(dest.toLowerCase())) {
        const parent = root.rootPath.split("/").slice(0, -1).join("/");
        const nested = parent ? parent + "/" + root.leaf : "";
        dest = nested && !used.has(nested.toLowerCase()) ? nested : nextFree(root.leaf, used);
      }
      used.add(dest.toLowerCase());
      return { ...root, dest };
    });

    const copies = [];
    for (const rel of relativePaths) {
      for (const root of plannedRoots) {
        if (root.kind === "file" && rel === root.rootPath) {
          copies.push({ source: rel, dest: root.dest });
        } else if (root.kind === "folder" && (rel === root.rootPath || rel.startsWith(root.rootPath + "/"))) {
          const rest = rel.slice(root.rootPath.length + 1);
          copies.push({ source: rel, dest: rest ? root.dest + "/" + rest : root.dest });
        }
      }
    }

    const matched = new Set(plannedRoots.map((root) => root.id.toLowerCase()));
    return {
      copies,
      missing: ordered.filter((id) => !matched.has(id.toLowerCase())),
    };
  },
};

function nextFree(leaf, used) {
  for (let number = 2; number < 10000; number += 1) {
    const candidate = leaf + " (" + number + ")";
    if (!used.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return leaf + " (extra)";
}

function lookupFile(fileName, idMap) {
  const exact = idMap.get(fileName.toLowerCase());
  if (exact) {
    return exact;
  }
  const dot = fileName.lastIndexOf(".");
  if (dot > 0) {
    const stem = fileName.slice(0, dot);
    return idMap.get(stem.toLowerCase()) || null;
  }
  return null;
}

function idsFromRows(rows, sourceLabel) {
  let headerRow = -1;
  let headerColumn = -1;
  const scanUntil = Math.min(rows.length, 30);
  for (let rowIndex = 0; rowIndex < scanUntil; rowIndex += 1) {
    const column = rows[rowIndex].findIndex((cell) => isNameId(cell));
    if (column >= 0) {
      headerRow = rowIndex;
      headerColumn = column;
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error("The required column NAME ID is missing from " + sourceLabel + ". Keep the header as NAME ID and put one ID on each row below it.");
  }

  const seen = new Set();
  const ids = [];
  let duplicates = 0;
  let emptyRows = 0;
  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const text = (rows[rowIndex][headerColumn] || "").trim();
    if (!text) {
      emptyRows += 1;
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    ids.push(text);
  }
  return { ids, duplicates, emptyRows };
}

function tryIdsFromRowMap(rowMap) {
  const rowNumbers = [...rowMap.keys()].sort((left, right) => left - right);
  const limited = rowNumbers.filter((number) => number <= 30);
  for (const headerRow of limited) {
    const cells = rowMap.get(headerRow);
    let headerColumn = "";
    for (const [column, text] of cells) {
      if (isNameId(text)) {
        headerColumn = column;
        break;
      }
    }
    if (!headerColumn) {
      continue;
    }
    const seen = new Set();
    const ids = [];
    let duplicates = 0;
    let emptyRows = 0;
    for (const rowNumber of rowNumbers) {
      if (rowNumber <= headerRow) {
        continue;
      }
      const text = (rowMap.get(rowNumber).get(headerColumn) || "").trim();
      if (!text) {
        emptyRows += 1;
        continue;
      }
      const key = text.toLowerCase();
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      ids.push(text);
    }
    return { ids, duplicates, emptyRows };
  }
  return null;
}

function isNameId(text) {
  const normalized = String(text || "").trim().split(/\s+/).filter(Boolean).join(" ");
  return normalized.toLowerCase() === "name id";
}

function extractRows(html) {
  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html))) {
    const cells = [];
    const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(cellText(cellMatch[1]));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

function cellText(value) {
  return decodeXml(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeXml(text) {
  return text
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function decodeXmlBytes(bytes) {
  return new TextDecoder().decode(bytes);
}

function sharedStrings(xml) {
  return xml.split(/<(?:[\w]+:)?si\b[^>]*>/i).slice(1).map((block) => {
    const end = block.search(/<\/(?:[\w]+:)?si>/i);
    const body = end >= 0 ? block.slice(0, end) : block;
    return [...body.matchAll(/<(?:[\w]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?t>/gi)].map((match) => decodeXml(match[1])).join("");
  });
}

function sheetRows(xml, strings) {
  const rows = new Map();
  const pattern = /<(?:[\w]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w]+:)?c>/gi;
  let match;
  while ((match = pattern.exec(xml))) {
    const attrs = match[1];
    const inner = match[2];
    const ref = /r="([A-Z]+)(\d+)"/i.exec(attrs);
    if (!ref) {
      continue;
    }
    const type = (/t="([^"]+)"/i.exec(attrs) || [])[1] || "";
    let text = "";
    if (type === "s") {
      const value = /<(?:[\w]+:)?v>([\s\S]*?)<\/(?:[\w]+:)?v>/i.exec(inner);
      text = strings[Number(value ? value[1] : NaN)] || "";
    } else if (type === "inlineStr") {
      text = [...inner.matchAll(/<(?:[\w]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?t>/gi)].map((item) => decodeXml(item[1])).join("");
    } else if (type === "str") {
      const value = /<(?:[\w]+:)?v>([\s\S]*?)<\/(?:[\w]+:)?v>/i.exec(inner);
      text = value ? decodeXml(value[1]) : "";
    } else {
      const value = /<(?:[\w]+:)?v>([\s\S]*?)<\/(?:[\w]+:)?v>/i.exec(inner);
      if (value) {
        const number = Number(value[1]);
        text = Number.isFinite(number) && number >= 0 && Math.abs(number - Math.round(number)) < 1e-6
          ? String(Math.round(number))
          : value[1];
      }
    }
    if (!rows.has(Number(ref[2]))) {
      rows.set(Number(ref[2]), new Map());
    }
    rows.get(Number(ref[2])).set(ref[1].toUpperCase(), text.trim());
  }
  return rows;
}

async function readZip(buffer, inflateRaw) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error("Could not read this file as an .xlsx workbook.");
  }
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const entries = {};
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("Could not read this file as an .xlsx workbook.");
    }
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) {
      entries[name] = compressed;
    } else if (method === 8) {
      entries[name] = await inflateRaw(compressed);
    } else {
      throw new Error("Could not read this file as an .xlsx workbook.");
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function crc32(bytes) {
  let crc = -1;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

globalThis.V360Names = V360Names;
