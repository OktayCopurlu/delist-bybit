const express = require("express");
require("dotenv").config();
const { credentialsJson, listMessages, authorize } = require("./readEmail");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  authorize(credentialsJson, listMessages);
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
