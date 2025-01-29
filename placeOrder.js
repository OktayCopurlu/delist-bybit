const {
  totalMarginSize,
  targetLeverage,
  SHORT_TAKE_PROFIT_1,
  SHORT_TAKE_PROFIT_2,
  SHORT_STOP_LOSS,
} = require("./constants");
const { bybitClient } = require("./config");

async function placeOrder(signal) {
  console.log(signal);
  try {
    const side = signal.signal;

    // Fetch market price
    const marketPriceData = await bybitClient.getTickers({
      category: "linear",
      symbol: signal.symbol,
    });

    if (marketPriceData.retCode !== 0) {
      return `Failed to get tickers : ${marketPriceData.retMsg}`;
    }

    const symbolPrice = parseFloat(marketPriceData.result.list[0].lastPrice);

    // If data not found in JSON, fetch from API
    const instrumentDetails = await bybitClient.getInstrumentsInfo({
      category: "linear",
      symbol: signal.symbol,
    });

    if (instrumentDetails.retCode !== 0) {
      return `Failed to get Instruments Info : ${instrumentDetails.retMsg}`;
    }

    const instrument = instrumentDetails.result.list[0];
    const qtyPrecision = parseInt(
      instrument.lotSizeFilter.qtyStep.split(".")[1]?.length || 0
    );
    const tickSize = parseFloat(instrument.priceFilter.tickSize);

    // Calculate the correct quantity for the target leverage
    const targetNotional = totalMarginSize * targetLeverage;
    let calculatedQuantity = (targetNotional / symbolPrice).toFixed(
      qtyPrecision
    );
    calculatedQuantity = Math.max(calculatedQuantity, 1).toFixed(qtyPrecision);

    // Calculate limit price
    const priceOffset = parseFloat(tickSize) * 5;
    const limitPrice =
      side === "Buy"
        ? (symbolPrice - priceOffset).toFixed(4)
        : (symbolPrice + priceOffset).toFixed(4);

    // Check for existing positions
    const openPositions = await bybitClient.getPositionInfo({
      category: "linear",
      symbol: signal.symbol,
    });

    if (openPositions.result) {
      const openPosition = openPositions.result.list[0];
      const openPositionSide = openPosition.side;

      if (openPositionSide !== side) {
        if (openPositionSide !== "") {
          const orderResponse = await bybitClient.submitOrder({
            category: "linear",
            symbol: signal.symbol,
            side: openPositionSide === "Buy" ? "Sell" : "Buy",
            orderType: "Market",
            qty: openPosition.size,
            timeInForce: "GoodTillCancel",
          });

          if (orderResponse.retCode !== 0) {
            return `Failed to close position: ${orderResponse.retMsg}`;
          }
        }
      } else {
        console.log(
          `Open ${openPositionSide} position already exists for ${signal.symbol}`
        );
        return `Open ${openPositionSide} position already exists for ${signal.symbol}`;
      }
    }

    // Place the new order
    const response = await bybitClient.submitOrder({
      category: "linear",
      symbol: signal.symbol,
      side,
      orderType: "Market",
      qty: calculatedQuantity,
      price: limitPrice,
    });

    if (response.retCode !== 0) {
      return `Order rejected: ${response.retMsg}`;
    } else {
      console.log(
        `Order placed: ${signal.symbol} ${side}, Quantity: ${calculatedQuantity}, Price: ${limitPrice}`
      );

      const takeProfitPrice1 = (symbolPrice * SHORT_TAKE_PROFIT_1).toFixed(4); // %10 aşağı fiyat
      const takeProfitPrice2 = (symbolPrice * SHORT_TAKE_PROFIT_2).toFixed(4); // %20 aşağı fiyat
      const stopLossPrice = (symbolPrice * SHORT_STOP_LOSS).toFixed(4); // %1 yukarı fiyat
      const takeProfitQuantity1 = (calculatedQuantity * 0.5).toFixed(
        qtyPrecision
      );
      const takeProfitQuantity2 = (takeProfitQuantity1 * 0.5).toFixed(
        qtyPrecision
      );

      const position = await bybitClient.getPositionInfo({
        category: "linear",
        symbol: signal.symbol,
      });

      if (position.retCode !== 0) {
        return `Failed to close position: ${position.retMsg}`;
      }

      const takeProfitPoints = [takeProfitPrice1, takeProfitPrice2];
      const takeProfitSizes = [takeProfitQuantity1, takeProfitQuantity2];

      if (position.result.list[0].size > 0) {
        for (let i = 0; i < takeProfitPoints.length; i++) {
          const takeProfitPrice = takeProfitPoints[i];
          const takeProfitQuantity = takeProfitSizes[i];

          const takeProfitResponse = await bybitClient.setTradingStop({
            category: "linear",
            symbol: signal.symbol,
            takeProfit: takeProfitPrice,
            tpTriggerBy: "MarkPrice",
            tpslMode: "Partial",
            tpOrderType: "Limit",
            tpSize: takeProfitQuantity,
            tpLimitPrice: takeProfitPrice,
            positionIdx: 0,
          });

          if (takeProfitResponse.retCode !== 0) {
            console.log(`Take profit rejected: ${takeProfitResponse.retMsg}`);
          } else {
            console.log(
              `Take profit order placed: ${signal.symbol} ${takeProfitQuantity} at ${takeProfitPrice}`
            );
          }
        }

        // Create Stop Loss order
        const stopLossResponse = await bybitClient.setTradingStop({
          category: "linear",
          symbol: signal.symbol,
          stopLoss: stopLossPrice,
          slTriggerBy: "MarkPrice",
        });

        if (stopLossResponse.retCode !== 0) {
          return `Stop Loss rejected: ${stopLossResponse.retMsg}`;
        } else {
          return `Stop Loss set for ${signal.symbol} at ${stopLossPrice}`;
        }
      }
    }
  } catch (error) {
    return `An error occurred while placing the order: ${JSON.stringify(
      error
    )}`;
  }
}

module.exports = { placeOrder };
