const { placeOrder } = require("./placeOrder");
const fs = require("fs");
const path = require("path");

const symbolsFilePath = path.join(__dirname, "symbols.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function placeOrdersFromSymbolsFile() {
  try {
    const symbols = JSON.parse(fs.readFileSync(symbolsFilePath, "utf8"));
    for (const symbol of symbols) {
      await placeOrder({
        symbol: symbol,
        signal: "Buy",
        price: "2",
      });

      await sleep(500);
    }
  } catch (error) {
    console.error("An error occurred while placing orders:", error.message);
  }
}

// placeOrdersFromSymbolsFile();
module.exports = { placeOrdersFromSymbolsFile };
