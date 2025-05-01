require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// POST endpoint to handle user messages
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.contents[0]?.parts?.[0]?.text;

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Forward the request to the AI API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions", // Replace this with your AI API endpoint
      {
        model: "gpt-3.5-turbo", // Replace this with your desired model
        messages: [{ role: "user", content: userMessage }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    // Respond to the frontend with AI's reply

    const data = response.data;
    const aiAnswer = data.choices[0].message.content;
    const formattedAnswer = aiAnswer.replace(/\n/g, "<br>");
    res.json(formattedAnswer);
  } catch (error) {
    console.error("Error communicating with AI API:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
