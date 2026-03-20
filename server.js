const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Define API endpoints
app.get('/', (req, res) => {
    res.send('Welcome to the Kishi AI Bot API!');
});

// Example endpoint for OpenRouter API integration
app.post('/api/request', async (req, res) => {
    const { input } = req.body;
    try {
        const response = await axios.post('https://api.openrouter.com/request', { input });
        res.json(response.data);
    } catch (error) {
        console.error('Error communicating with OpenRouter API:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
