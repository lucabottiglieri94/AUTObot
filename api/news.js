import * as cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ items: [], error: "Method Not Allowed" });

  try {
    const FEED_URL = "https://it.motor1.com/rss/news/all/";

    const response = await fetch(FEED_URL, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept":
          "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8"
      }
    });

    if (!response.ok) {
      return res.status(502).json({ items: [], error: "Upstream HTTP " + response.status });
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items = [];
    const seen = new Set();

    $("item").each((_, el) => {
      if (items.length >= 12) return;
      const title = $(el).find("title").first().text().trim();
      const link = $(el).find("link").first().text().trim();
      const pubDate = $(el).find("pubDate").first().text().trim();
      if (!title || !link) return;
      if (!link.startsWith("http")) return;
      if (seen.has(link)) return;
      seen.add(link);
      items.push({ title, url: link, date: pubDate || "" });
    });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ items: [], error: e?.message || "Internal error" });
  }
}
