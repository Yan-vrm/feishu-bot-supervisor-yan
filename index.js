import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔹 Substitua pelos seus valores reais do Feishu Developer Console
const APP_ID = "cli_xxxxxxxxxxxxx";
const APP_SECRET = "xxxxxxxxxxxxxxxxxxxx";

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

  // 🔹 Verifica se é uma mensagem de texto
  if (event && event.message && event.message.message_type === "text") {
    const text = JSON.parse(event.message.content).text;
    const senderId = event.sender.sender_id.open_id;

    console.log(`Mensagem recebida de ${senderId}: ${text}`);

    // 🔹 Envia resposta ao usuário
    try {
      const token = await getTenantAccessToken();
      await axios.post(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
        {
          receive_id: senderId,
          msg_type: "text",
          content: JSON.stringify({
            text: `Recebi sua mensagem: ${text}`,
          }),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Mensagem enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar resposta:", error.response?.data || error);
    }
  }

  res.sendStatus
