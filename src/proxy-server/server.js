const express = require('express');
const axios = require('axios');
const cors = require('cors')

const cookies = require("cookie-parser");

const app = express();

const PORT = 3000; // You can change the port if needed
const baseURL = "https://platform.fintacharts.com"
// const baseWsURL = "wss://platform.fintacharts.com/api/streaming/ws/v1/realtime";
// const PORT = 8080; // Порт локального прокси

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for all routes (to allow your Angular app to communicate with this server)
app.use(cors());
app.use(cookies());

headers = {
    'Content-Type': 'application/x-www-form-urlencoded' // Adjust headers if needed
}

// Proxy endpoint
app.post('/api/proxy/token', async (req, res) => {
    try {
        // Define the external API URL
        const externalApiUrl = `${baseURL}/identity/realms/fintatech/protocol/openid-connect/token`;

        // Define the request body (you can also accept this from the frontend if needed)
        const requestBody = {
            username: "r_test@fintatech.com",
            password: "kisfiz-vUnvy9-sopnyv",
            client_id: "app-cli",
            grant_type: "password"
        };

        // Send a POST request to the external API
        const response = await axios.post(externalApiUrl, requestBody, { headers });

        res.cookie('access_token', response.data.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict'
        });

        res.cookie('refresh_token', response.data.refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict'
        });

        res.json({ message: 'Tokens stored in HttpOnly cookie' });
    } catch (error) {
        // Handle errors
        console.error('Error in proxy:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/proxy/instruments', async (req, res) => {
    try {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const provider = "oanda";
        const kind = "forex";

        // Define the external API URL
        const externalApiUrl = `${baseURL}/api/instruments/v1/instruments?provider=${provider}&kind=${kind}`;

        const response = await axios.get(externalApiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        // Return the response from the external API to the client
        res.json(response.data);
    } catch (error) {
        // Handle errors
        console.error('Error in proxy:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/proxy/providers', async (req, res) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Define the external API URL
        const externalApiUrl = `${baseURL}/api/instruments/v1/providers`;

        // Send a POST request to the external API
        const response = await axios.get(externalApiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        // Return the response from the external API to the client
        res.json(response.data);
    } catch (error) {
        // Handle errors
        console.error('Error in proxy:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/proxy/exchanges', async (req, res) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Define the external API URL
        const externalApiUrl = `${baseURL}/api/instruments/v1/exchanges`;

        // Send a POST request to the external API
        const response = await axios.get(externalApiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        // Return the response from the external API to the client
        res.json(response.data);
    } catch (error) {
        // Handle errors
        console.error('Error in proxy:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});