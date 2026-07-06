import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";

const app = express();
app.use(bodyParser.json());

// 🔹 Credenciais do seu app Feishu
const APP_ID = "cli_aac3ff41a578dcef";
const APP_SECRET = "E6Obo8U9KbLNUV2KVkWlygl3ymmrD8IL";

// 🔹 Seu open_id pessoal (SUPERVISOR)
const SUPERVISOR_OPEN_ID = "ou_c4766cc5fbbee2f41839435392d4c889";

// 🔹 Arquivo onde os promotores serão salvos
const PROMOTORES_FILE = "./promotores.json";

// 🔹 Carregar promotores do arquivo
function loadPromotores() {
  try {
    if (fs.existsSync(PROMOTORES_FILE)) {
      const data = fs.readFileSync(PROMOTORES_FILE, "utf8");
      const json = JSON.parse(data);
      return new Map(Object.entries(json)); // open_id → nome
    }
  } catch (err) {
    console.error("Erro ao carregar promotores:", err);
  }
  return new Map();
}

// 🔹 Salvar promotores no arquivo
function savePromotores() {
  try {
    const obj = Object.fromEntries(promotores);
    fs.writeFileSync(PROMOTORES_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error("Erro ao salvar promotores:", err);
  }
}

// 🔹 Lista de promotores supervisionados (persistente)
const promotores = loadPromotores();
console.log("Promotores carregados:", promotores);

// 🔹 Função para obter o tenant_access_token
async function getTenantAccessToken() {
  try {
    const response = await axios.post(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/",
      {
        app_id: APP_ID,
        app_secret: APP_SECRET,
      }
    );

    const token = response.data.tenant_access_token;
    if (!token) throw new Error("Token não retornado pelo Feishu");

    console.log("Novo tenant_access_token obtido!");
    return token;
  } catch (error) {
    console.error("Erro ao obter tenant_access_token:", error.response?.data || error);
    return null;
  }
}

// 🔹 Sistema de comandos com menção
function handleSupervisorCommand(text, mentions) {
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  // ➕ Adicionar promotor
  if (command === "add_promotor") {
    if (!mentions || mentions.length === 0) {
      return "Você precisa mencionar o promotor. Ex: add_promotor @João";
    }

    const openId = mentions[0].id.open_id;
    const name = mentions[0].name;

    promotores.set(openId, name);
    savePromotores();

    return `Promotor ${name} (${openId}) adicionado à supervisão.`;
  }

  // ➖ Remover promotor
  if (command === "remove_promotor") {
    if (!mentions || mentions.length === 0) {
      return "Você precisa mencionar o promotor. Ex: remove_promotor @João";
    }

    const openId = mentions[0].id.open_id;
    const name = mentions[0].name;

    if (!promotores.has(openId)) {
      return `Promotor ${name} não está na lista.`;
    }

    promotores.delete(openId);
    savePromotores();

    return `Promotor ${name} (${openId}) removido da supervisão.`;
  }

  // 📋 Listar promotores com nome
  if (command === "list_promotores") {
    if (promotores.size === 0) {
      return "Nenhum promotor cadastrado na supervisão.";
    }

    let lista = "Promotores supervisionados:\n\n";

    for (const [openId, name] of promotores.entries()) {
      lista += `• ${name} — ${openId}\n`;
    }

    return lista;
  }

  return "Comando inválido. Use: add_promotor @nome, remove_promotor @nome, list_promotores.";
}

// 🔹 Endpoint principal do bot
app.post("/bot", async (req, res) => {
  const { challenge, event } = req.body;

  if (challenge) {
    console.log("Challenge recebido e respondido!");
    return res.send({ challenge });
  }

  console.log("Received event:", event);

  if (!event || !event.message || event.message.message_type !== "text") {
    return res.sendStatus(200);
  }

  const text = JSON.parse(event.message.content).text;
  const mentions = event.message.mentions || [];
  const senderOpenId = event.sender.sender_id.open_id;
  const chatType = event.message.chat_type;

  console.log(`Mensagem recebida de ${senderOpenId} (${chatType}): ${text}`);

  const token = await getTenantAccessToken();
  if (!token) {
    console.error("Token inválido — não foi possível enviar mensagem.");
    return res.sendStatus(500);
  }

  // 1️⃣ Mensagens no seu chat pessoal → comandos
  if (chatType === "p2p" && senderOpenId === SUPERVISOR_OPEN_ID) {
    const resposta = handleSupervisorCommand(text, mentions);

    await axios.post(
      "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
      {
        receive_id: senderOpenId,
        msg_type: "text",
        content: JSON.stringify({ text: resposta }),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      }
    );

    return res.sendStatus(200);
  }

  // 2️⃣ Mensagens no grupo geral → encaminhar se for promotor
  if (chatType === "group") {
    if (promotores.has(senderOpenId)) {
      const nomePromotor = promotores.get(senderOpenId);

      await axios.post(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
        {
          receive_id: SUPERVISOR_OPEN_ID,
          msg_type: "text",
          content: JSON.stringify({
            text: `Mensagem de ${nomePromotor} (${senderOpenId}) no grupo:\n${text}`,
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        }
      );
    }
  }

  res.sendStatus(200);
});

// 🔹 Inicializa o servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});
