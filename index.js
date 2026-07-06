import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔹 Substitua pelo seu próprio App ID e App Secret do Feishu
const APP_ID = "cli_xxxxxxxxxxxxx";
const APP_SECRET = "xxxxxxxxxxxxxxxxxxxx";

// 🔹 Endpoint principal do bot
app.post("/bot", async (req, res) => {
  const { challenge, event } = req.body;

  // ✅ Responde ao Feishu quando ele faz o teste de verificação
  if (challenge) {
    console.log("Challenge recebido e respondido!");
    return res.send({ challenge });
  }

  // ✅ Loga o evento recebido
  console.log("Received event:", event);

  // 🔹 Exemplo: responder mensagens privadas
  if (event && event.message && event.message.message_type === "text") {
    const text = event.message.content;
    const senderId = event.sender.sender_id.open_id;

    console.log(`Mensagem recebida de ${senderId}: ${text}`);

    // 🔹 Responde ao usuário
    try {
      await axios.post(
        "https://open.feishu.cn/open-apis/message/v4/send/",
        {
          open_id: senderId,
          msg_type: "text",
          content: JSON.stringify({
            text: `Recebi sua mensagem: ${text}`,
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${await getTenantAccessToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Erro ao enviar resposta:", error.response?.data || error);
    }
  }

  res.sendStatus(200);
});

// 🔹 Função para obter o token de acesso do Feishu
async function getTenantAccessToken() {
  try {
    const response = await axios.post(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/",
      {
        app_id: APP_ID,
        app_secret: APP_SECRET,
      }
    );
    return response.data.tenant_access_token;
  } catch (error) {
    console.error("Erro ao obter tenant_access_token:", error.response?.data || error);
    return null;
  }
}

// 🔹 Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});
