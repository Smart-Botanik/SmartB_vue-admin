/**
 * Smoke: icons-hub PNG catalog API (requires icons-hub on :3020).
 *
 * Usage:
 *   node scripts/smoke-icon-catalog.mjs
 *
 * Optional: ICON_CATALOG_URL (default http://127.0.0.1:3020/api/v1)
 * Optional: SMOKE_QUERY (default tomato)
 */
const BASE = (
  process.env.ICON_CATALOG_URL || "http://127.0.0.1:3020/api/v1"
).replace(/\/+$/, "");
const QUERY = (process.env.SMOKE_QUERY || "tomato").trim() || "tomato";
const MAX_PNG_BYTES = 4 * 1024 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function fail(msg) {
  throw new Error(msg);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
}

async function getJson(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    ...options,
  });
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, text };
}

function isPngBytes(buf) {
  const view = new Uint8Array(buf);
  return (
    view.length >= 4 &&
    view[0] === PNG_MAGIC[0] &&
    view[1] === PNG_MAGIC[1] &&
    view[2] === PNG_MAGIC[2] &&
    view[3] === PNG_MAGIC[3]
  );
}

async function main() {
  console.log(`Icon catalog: ${BASE}`);

  // Reachability
  try {
    const probe = await fetch(`${BASE}/icons/search?q=${encodeURIComponent(QUERY)}&offset=0&limit=1`, {
      headers: { Accept: "application/json" },
    });
    assert(probe.status !== 0, "Нет ответа от каталога");
    console.log(`Reachable (search probe HTTP ${probe.status})`);
  } catch (error) {
    fail(
      `Каталог недоступен (${BASE}): ${error instanceof Error ? error.message : error}. Запустите icons-hub: npm run dev:backend`,
    );
  }

  // Empty q → 400
  {
    const { res, body } = await getJson("/icons/search?q=");
    assert(res.status === 400, `Empty q: ожидался 400, получили ${res.status}`);
    const code = body && typeof body === "object" ? body.code : undefined;
    assert(
      code === "EMPTY_QUERY" || !code,
      `Empty q: ожидался code EMPTY_QUERY, получили ${JSON.stringify(body)}`,
    );
    console.log("Empty q → 400 OK");
  }

  // Search
  let firstId = null;
  {
    const { res, body } = await getJson(
      `/icons/search?q=${encodeURIComponent(QUERY)}&offset=0&limit=5`,
    );
    assert(res.status === 200, `Search: ожидался 200, получили ${res.status}`);
    assert(body && Array.isArray(body.items), "Search: нет items[]");
    assert(body.page && typeof body.page === "object", "Search: нет page");
    assert(
      typeof body.page.total === "number" &&
        typeof body.page.hasMore === "boolean",
      "Search: page.total / hasMore",
    );
    for (const item of body.items) {
      assert(item.id && item.title && item.previewUrl, `Search item неполный: ${JSON.stringify(item)}`);
    }
    firstId = body.items[0]?.id ?? null;
    console.log(
      `Search OK: ${body.items.length} item(s), total=${body.page.total}, hasMore=${body.page.hasMore}`,
    );
  }

  assert(firstId, `Search по «${QUERY}» вернул 0 items — нечем проверить download-png`);

  // download-png
  let downloadUrl = null;
  {
    const { res, body } = await getJson(
      `/icons/${encodeURIComponent(firstId)}/download-png`,
    );
    assert(
      res.status === 200,
      `download-png: ожидался 200, получили ${res.status}: ${JSON.stringify(body)}`,
    );
    assert(body && typeof body === "object", "download-png: пустое тело");
    const mime = body.mimeType ?? body.mime_type;
    const url = body.downloadUrl ?? body.download_url;
    const fileName = body.fileName ?? body.file_name ?? "";
    assert(mime === "image/png", `download-png mimeType: ${mime}`);
    assert(typeof url === "string" && url.trim(), "download-png: нет downloadUrl");
    assert(
      String(fileName).toLowerCase().endsWith(".png"),
      `download-png fileName должен оканчиваться на .png: ${fileName}`,
    );
    downloadUrl = url.trim();
    console.log(`download-png OK: ${fileName} → ${downloadUrl}`);
  }

  // file bytes
  {
    const res = await fetch(downloadUrl);
    assert(res.ok, `file-png HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 0, "file-png: пустой файл");
    assert(
      buf.byteLength <= MAX_PNG_BYTES,
      `file-png слишком большой: ${buf.byteLength}`,
    );
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    assert(
      isPngBytes(buf) || ct.includes("png"),
      `Ожидался PNG (magic или content-type), ct=${ct}, bytes=${buf.byteLength}`,
    );
    console.log(`file-png OK: ${buf.byteLength} bytes, ct=${ct || "(none)"}`);
  }

  // Unknown id → 404
  {
    const { res } = await getJson("/icons/__smoke_missing_id__/download-png");
    assert(res.status === 404, `Unknown id: ожидался 404, получили ${res.status}`);
    console.log("Unknown id → 404 OK");
  }

  console.log("Smoke icon-catalog OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
