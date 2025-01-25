const { RestClientV5 } = require("bybit-api");
const express = require("express");
require("dotenv").config();
const { listMessages } = require("./readEmail");
const { placeOrder } = require("./placeOrder");
const { BYBIT_API_KEY, BYBIT_API_SECRET, useTestnet } = require("./constants");
const bodyParser = require("body-parser");

// Bybit client
const bybitClient = new RestClientV5({
  key: BYBIT_API_KEY,
  secret: BYBIT_API_SECRET,
  testnet: useTestnet,
});

// Express server for webhook
const app = express();

// Middleware to parse raw body
app.use(bodyParser.raw({ type: "application/json" }));

app.post("/webhook", async (req, res) => {
  const rawBody = req.body.toString("utf-8"); // Convert raw body to string
  console.log("Received webhook:", rawBody);

  try {
    const parsedMessage = JSON.parse(rawBody);
    console.log("Parsed message:", parsedMessage);
    const data = Buffer.from(parsedMessage.message.data, "base64").toString(
      "utf-8"
    );
    console.log("Received message:", data);

    // Process the message data
    if (data.includes("Delisting of")) {
      const symbolMatch = data.match(/Delisting of (\w+)/);
      console.log("Symbol match:", symbolMatch);
      if (symbolMatch) {
        const symbol = `${symbolMatch[1]}USDT`;
        await placeOrder({
          symbol: symbol,
          signal: "Sell",
          price: "2",
        });
        console.log(`Placed sell order for ${symbol}`);
      }
    }
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
  listMessages();
  console.log(`Server is running on port ${PORT}`);
});

// const axios = require("axios");

// const BASE_URL = "https://api.bybit.com"; // Change to testnet if needed
// const processedDelistings = new Set();

// async function getAnnouncements() {
//   try {
//     const response = await axios.get(`${BASE_URL}/v5/announcements/index`, {
//       params: {
//         locale: "en-US",
//         limit: 15,
//       },
//     });

//     const announcements = response.data.result.list;
//     const delistings = announcements.filter(
//       (announcement) => announcement.type.key === "delistings"
//     );

//     // Open a position for each new delisting
//     delistings.forEach((delisting) => {
//       if (!processedDelistings.has(delisting.title)) {
//         openPosition(delisting);
//         processedDelistings.add(delisting.title);
//       }
//     });

//     console.log("processedDelistings:", processedDelistings);
//   } catch (error) {
//     console.error(
//       "Error fetching announcements:",
//       error.response ? error.response.data : error.message
//     );
//   }
// }

// async function openPosition(delist) {
//   const symbolMatch = delist.title.match(/of (\w+USDT)/);
//   console.log(`Opening position for ${symbolMatch[1]}...`);

//   if (symbolMatch) {
//     placeOrder({
//       symbol: symbolMatch[1],
//       signal: "Sell",
//       price: "2",
//     });
//   } else {
//     console.error(`Could not extract symbol from title: ${delist.title}`);
//   }
// }

// // Fetch announcements every 10 seconds
// // setInterval(getAnnouncements, 10000);

// async function getAllPerpetualSymbols() {
//   try {
//     let allSymbols = [];
//     let cursor = "";
//     let hasMore = true;

//     while (hasMore) {
//       const response = await bybitClient.getInstrumentsInfo({
//         category: "linear",
//         limit: 500,
//         cursor: cursor,
//       });

//       if (response.retCode !== 0) {
//         console.error(`Failed to get Instruments Info: ${response.retMsg}`);
//         return;
//       }

//       allSymbols = allSymbols.concat(
//         response.result.list.map((instrument) => instrument.symbol)
//       );
//       cursor = response.result.nextPageCursor;
//       hasMore = !!cursor;
//     }

//     console.log("Total Perpetual Symbols:", allSymbols.length);
//     // console.log("Perpetual Symbols:", allSymbols.join(", "));
//   } catch (error) {
//     console.error(
//       "An error occurred while fetching perpetual symbols:",
//       error.response ? error.response.data : error.message
//     );
//   }
// }

// // Call the function to get all perpetual symbols
// // getAllPerpetualSymbols();
