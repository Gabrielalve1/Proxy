// server.js
const express = require("express");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");
const LRU = require("lru-cache");
const cors = require("cors");

const app = express();
app.use(cors());

// Limite de requisições
const limiter = rateLimit({
  windowMs: 10 * 1000, // 10s
  max: 30,
  message: "Muitas requisições, tente novamente em alguns segundos."
});
app.use(limiter);

// Cache simples
const cache = new LRU({ max: 500, ttl: 1000 * 30 });

// User-Agent rotation
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
];
function pickUA() { return UAS[Math.floor(Math.random() * UAS.length)]; }

// Safe URL
function safeUrl(raw) {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Endpoint principal
app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL ausente");

  const target = safeUrl(url);
  if (!target) return res.status(400).send("URL inválida");

  if (cache.has(target)) {
    const cached = cache.get(target);
    res.set(cached.headers);
    return res.status(200).send(cached.body);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const r = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": pickUA(),
        "Accept": "text/html,application/json,application/xml,*/*"
      },
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timeout);

    const contentType = r.headers.get("content-type") || "text/plain";
    const body = await r.text();

    if (body && body.length < 200000) {
      cache.set(target, {
        headers: { "content-type": contentType },
        body
      });
    }

    res.set("content-type", contentType);
    res.set("cache-control", "no-store");
    return res.status(r.status).send(body);
  } catch (err) {
    console.error("Erro ao buscar:", err.message);
    return res.status(502).send("Falha ao buscar upstream");
  }
});

// Health check
app.get("/", (req, res) => res.send("Proxy funcionando 🚀"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
