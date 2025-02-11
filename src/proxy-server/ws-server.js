const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const cookies = require("cookie-parser");

const PORT = 8080;

const app = express();
app.use(cookies());

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on("connection", (clientSocket, req) => {
    // const token = req.headers.cookie.split("=")[1];

    // if (!token) {
    //     console.log("No token provided, closing connection.");
    //     clientSocket.close();
    //     return
    // }

    // const TARGET_WS_URL = `wss://platform.fintacharts.com/api/streaming/ws/v1/realtime?token=${token}`;
    const TARGET_WS_URL = 'wss://platform.fintacharts.com/api/streaming/ws/v1/realtime?token=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJTUDJFWmlsdm8zS2g3aGEtSFRVU0I3bmZ6dERRN21tb3M3TXZndlI5UnZjIn0.eyJleHAiOjE3MzkzMTI0OTQsImlhdCI6MTczOTMxMDY5NCwianRpIjoiOTAwYWEyMDUtYTYzNi00ZmJhLThmM2MtZjAwMDQyOTQwYWFlIiwiaXNzIjoiaHR0cHM6Ly9wbGF0Zm9ybS5maW50YWNoYXJ0cy5jb20vaWRlbnRpdHkvcmVhbG1zL2ZpbnRhdGVjaCIsImF1ZCI6WyJuZXdzLWNvbnNvbGlkYXRvciIsImJhcnMtY29uc29saWRhdG9yIiwidHJhZGluZy1jb25zb2xpZGF0b3IiLCJlZHVjYXRpb24iLCJjb3B5LXRyYWRlci1jb25zb2xpZGF0b3IiLCJwYXltZW50cyIsIndlYi1zb2NrZXRzLXN0cmVhbWluZyIsInVzZXItZGF0YS1zdG9yZSIsImFsZXJ0cy1jb25zb2xpZGF0b3IiLCJ1c2VyLXByb2ZpbGUiLCJpbnN0cnVtZW50cy1jb25zb2xpZGF0b3IiLCJhY2NvdW50Il0sInN1YiI6Ijk1ZTY2ZGJiLTQ3YTctNDhkOS05ZGZlLTRlYzZjZTQxY2I0MSIsInR5cCI6IkJlYXJlciIsImF6cCI6ImFwcC1jbGkiLCJzaWQiOiI1MGY2YTYxZS1iZDBhLTQ0ODItYWVlMC1kZTE5YmEyNjA2NzUiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1maW50YXRlY2giLCJ1c2VycyJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicHJvZmlsZSIsInJvbGVzIjpbImRlZmF1bHQtcm9sZXMtZmludGF0ZWNoIiwidXNlcnMiXSwiZW1haWwiOiJyX3Rlc3RAZmludGF0ZWNoLmNvbSJ9.Uz7RRy7r6nspGHp-iBvKSkStL8ag_2wiMjXMTu9KoF85Y2N6raEhIBn83I2bMy8meEbMHy5NEp71flLcLV0MCsfFWpyPh6ZMUZrt2LiyvGzpD0UVyashazZQrlRu6kuZv-E2PL9xgmsQGPs-8CPB4OZnAAiYUoy0t1toaoIUVaXBnAyE9Ncim_1t2-NLMdj92j5tX7AMEEcQuVDHpLsLygptWL7vTppteNblDN0ae9unhgVBLFVT8wTrElJZPm3BF1N2dU4770DsSZMjljZ96PobCipNw5YpVoyZRbaPHle0pspuN7YPAMu9PYo-JXjjIm9cwx0wN8viZKtbrx4gPw';
    const targetSocket = new WebSocket(TARGET_WS_URL);

    // Handle connection opened - send subscription message
    targetSocket.on('open', () => {
        const subscriptionMessage = {
            "type": "l1-subscription",
            "id": "1",
            "instrumentId": "ad9e5345-4c3b-41fc-9437-1d253f62db52",
            "provider": "simulation",
            "subscribe": true,
            "kinds": ["ask", "bid", "last"]
        };
        
        targetSocket.send(JSON.stringify(subscriptionMessage));
        console.log('Subscription message sent');
    });


    clientSocket.on("message", (message) => {
        if (targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(message);
        }
    });

    targetSocket.on("message", (message) => {
        clientSocket.send(message);
    });

    clientSocket.on("close", () => {
        targetSocket.close();
        console.log("Client disconnected");
    });

    targetSocket.on("close", () => {
        clientSocket.close();
        console.log("API closed");
    });
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`WebSocket-proxy works on ws://localhost:${PORT}`);
});
