const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// 🔹 Coloque aqui os IDs Feishu dos seus promotores
const meusPromotores = [
    "ou_1234567890",
    "ou_0987654321",
    "ou_1122334455"
];

// 🔹 Seu ID Feishu (para onde o bot vai enviar as mensagens filtradas)
const SUPERVISOR_ID = "SEU_FEISHU_ID";

// 🔹 Token de acesso do app (você pega no Feishu Developer Console)
const ACCESS_TOKEN = "SEU_ACCESS_TOKEN";

// 📌 Endpoint que o Feishu chama quando chega mensagem no grupo
app.post("/bot", async (req, res) => {
    const event = req.body.event;

    // Segurança: ignora eventos sem mensagem
    if (!event || !event.message) {
        return res.send({ code: 0 });
    }

    const senderId = event.sender.sender_id.user_id;
    const messageContent = event.message.content;

    // 🔍 Verifica se o autor da mensagem é um dos seus promotores
    if (meusPromotores.includes(senderId)) {
        console.log("Mensagem de promotor detectada:", messageContent);
        await enviarParaSupervisor(messageContent);
    }

    // Resposta obrigatória para Feishu
    res.send({ code: 0 });
});

// 📌 Função que envia a mensagem filtrada para você
async function enviarParaSupervisor(texto) {
    try {
        await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                receive_id: SUPERVISOR_ID,
                msg_type: "text",
                content: JSON.stringify({
                    text: `📌 Venda identificada:\n${texto}`
                })
            })
        });

        console.log("Mensagem enviada para o supervisor.");
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
    }
}

// 📌 Inicia o servidor
app.listen(3000, () => {
    console.log("Bot rodando na porta 3000");
});
