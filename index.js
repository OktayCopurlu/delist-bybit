const { RestClientV5 } = require("bybit-api");
const express = require("express");
require("dotenv").config();
const { credentialsJson, listMessages, authorize } = require("./readEmail");
const { placeOrder } = require("./placeOrder");
const { BYBIT_API_KEY, BYBIT_API_SECRET, useTestnet } = require("./constants");

const bybitClient = new RestClientV5({
  key: BYBIT_API_KEY,
  secret: BYBIT_API_SECRET,
  testnet: useTestnet,
});

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  authorize(credentialsJson, listMessages);

  try {
    const parsedMessage = req.body;
    console.log("Received message:", parsedMessage);
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
  res.status(204).send();
});

app.get("/", (req, res) => {
  res.send("Running....");
});

// Start the server
const PORT = process.env.PORT || 7777;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
