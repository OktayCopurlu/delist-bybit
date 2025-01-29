const { bybitClient } = require("./config");
const fs = require("fs");
const path = require("path");

const symbolsFilePath = path.join(__dirname, "symbols.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setLeverage() {
  try {
    const symbols = JSON.parse(fs.readFileSync(symbolsFilePath, "utf8"));
    for (const symbol of symbols) {
      try {
        let response = await bybitClient.setLeverage({
          category: "linear",
          symbol: symbol,
          buyLeverage: "25",
          sellLeverage: "25",
        });

        if (response.retMsg === "buy leverage invalid") {
          response = await bybitClient.setLeverage({
            category: "linear",
            symbol: symbol,
            buyLeverage: "16",
            sellLeverage: "16",
          });

          console.log(`Leverage set to 16 for ${symbol}:`, response);

          if (response.retMsg === "buy leverage invalid") {
            response = await bybitClient.setLeverage({
              category: "linear",
              symbol: symbol,
              buyLeverage: "12",
              sellLeverage: "12",
            });

            console.log(`Leverage set to 12 for ${symbol}:`, response);
          }
        } else {
          console.log(`Leverage set to 25 for ${symbol}:`, response);
        }
      } catch (error) {
        console.error(`Error setting leverage for ${symbol}:`, error.message);
      }

      await sleep(500);
    }
  } catch (error) {
    console.error("An error occurred while setting leverage:", error.message);
  }
}

// setLeverage();
module.exports = { setLeverage };
