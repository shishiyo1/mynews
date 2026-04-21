const fs = require("fs/promises");
const path = require("path");

const API_KEY = process.env.GNEWS_API_KEY;
if (!API_KEY) {
  throw new Error("GNEWS_API_KEY is not set");
}

const CATEGORIES = (process.env.GNEWS_CATEGORIES || "general")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const COUNT = Math.max(1, Math.min(10, Number(process.env.GNEWS_COUNT || "10")));
const BASE_URL = "https://gnews.io/api/v4/top-headlines";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeErrorMessage(data, status) {
  if (Array.isArray(data?.errors)) return data.errors.join(" / ");
  if (typeof data?.errors === "string") return data.errors;
  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(" / ");
  }
  if (typeof data?.message === "string") return data.message;
  return `HTTP ${status}`;
}

async function fetchPage(params) {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });
  url.searchParams.set("apikey", API_KEY);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(normalizeErrorMessage(data, res.status));
  }

  return data;
}

async function fetchArticlesFor(params, desiredCount) {
  const data = await fetchPage({ ...params, max: Math.min(10, desiredCount) });
  const batch = Array.isArray(data?.articles) ? data.articles : [];
  return batch.slice(0, desiredCount).map((a) => ({
    title: a.title || "",
    description: a.description || "",
    url: a.url || "#",
    source: { name: a.source?.name || "" },
    publishedAt: a.publishedAt || null,
    image: a.image || null,
    language: params.lang || "",
  }));
}

async function main() {
  const out = {
    provider: "GNews via GitHub Actions",
    updatedAt: new Date().toISOString(),
    windowLabel: "GitHub Pages 互換版",
    categories: {},
  };

  for (const category of CATEGORIES) {
    out.categories[category] = { jp: [], world: [] };

    console.log(`[${category}] fetching jp...`);
    out.categories[category].jp = await fetchArticlesFor(
      {
        category,
        country: "jp",
        lang: "ja",
      },
      COUNT,
    );

    await sleep(1500);

    console.log(`[${category}] fetching world...`);
    out.categories[category].world = await fetchArticlesFor(
      {
        category,
        lang: "en",
      },
      COUNT,
    );

    await sleep(1500);
  }

  const outputPath = path.join(process.cwd(), "data", "news.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`updated ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
