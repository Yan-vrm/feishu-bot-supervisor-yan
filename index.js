import fs from "fs";
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Carrega promotores
function carregarPromotores() {
  const data = fs.readFileSync("promotores.json");
  return JSON.parse(data).lista;
}

// Salva promotores
function salvarPromotores(lista) {
  fs.writeFileSync("promotores.json", JSON.stringify({ lista }, null, 2));
}

// Enviar mensagem
async function enviarMensagem(chatId, texto) {
  const token = await gerarToken();
  await axios.post(
    "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
    {
      receive_id: chatId,
      msg_type: "text",
      content: JSON.stringify({ text: texto })
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// Token
async function gerarToken() {
  const res = await axios.post(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      app_id: process.env.APP_ID,
      app_secret: process.env.APP_SECRET
    }
  );
  return res.data.tenant_access_token;
}

// BOT
app.post("/bot", async (req, res) => {
  const event = req.body;

  if (event.type === "url_verification") {
    return res.send({ challenge: event.challenge });
  }

  if (event.header.event_type === "im.message.receive_v1") {
    const msg = event.event;

    const chatId = msg.message.chat_id;
    const senderId = msg.sender.sender_id.open_id;
    const texto = JSON.parse(msg.message.content).text.trim();

    let promotores = carregarPromotores();

    // Comando: adicionar promotor
    if (texto === "/addpromotor") {
      if (!promotores.includes(senderId)) {
        promotores.push(senderId);
        salvarPromotores(promotores);
        await enviarMensagem(chatId, "✔ Você agora é um promotor!");
      } else {
        await enviarMensagem(chatId, "Você já é promotor.");
      }
      return res.sendStatus(200);
    }

    // Comando: remover promotor
    if (texto === "/removepromotor") {
      if (promotores.includes(senderId)) {
        promotores = promotores.filter(id => id !== senderId);
        salvarPromotores(promotores);
        await enviarMensagem(chatId, "❌ Você foi removido da lista de promotores.");
      } else {
        await enviarMensagem(chatId, "Você não está na lista de promotores.");
      }
      return res.sendStatus(200);
    }

    // Se não for promotor → ignorar
    if (!promotores.includes(senderId)) {
      console.log("Ignorado: não é promotor.");
      return res.sendStatus(200);
    }

    // Mensagem de promotor
    await enviarMensagem(chatId, `Promotor falou: ${texto}`);

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Iniciar servidor
app.listen(3000, () => console.log("Bot rodando!"));

