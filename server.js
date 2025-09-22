import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Página inicial só para testar
app.get("/", (req, res) => {
  res.send("✅ Proxy funcionando 🚀");
});

// Proxy: pega uma URL externa
app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send("⚠️ Faltou parâmetro ?url=");
  }
  try {
    const response = await fetch(url);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error("Erro no fetch:", err.message);
    res.status(500).send("❌ Erro ao buscar: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
