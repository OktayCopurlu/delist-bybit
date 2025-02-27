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

    console.log("Market Price Data:", marketPriceData);

    if (marketPriceData.retCode !== 0) {
      return `Failed to get tickers : ${marketPriceData.retMsg}`;
    }

    const symbolPrice = parseFloat(marketPriceData.result.list[0].lastPrice);
    console.log("Symbol Price:", symbolPrice);

    // If data not found in JSON, fetch from API
    const instrumentDetails = await bybitClient.getInstrumentsInfo({
      category: "linear",
      symbol: signal.symbol,
    });

    console.log("Instrument Details:", instrumentDetails);

    if (instrumentDetails.retCode !== 0) {
      return `Failed to get Instruments Info : ${instrumentDetails.retMsg}`;
    }

    const instrument = instrumentDetails.result.list[0];
    const qtyPrecision = parseInt(
      instrument.lotSizeFilter.qtyStep.split(".")[1]?.length || 0
    );
    const tickSize = parseFloat(instrument.priceFilter.tickSize);

    console.log("Quantity Precision:", qtyPrecision);
    console.log("Tick Size:", tickSize);

    // Calculate the correct quantity for the target leverage
    const targetNotional = totalMarginSize * targetLeverage;
    let calculatedQuantity = (targetNotional / symbolPrice).toFixed(
      qtyPrecision
    );
    calculatedQuantity = Math.max(calculatedQuantity, 1).toFixed(qtyPrecision);

    console.log("Calculated Quantity:", calculatedQuantity);

    // Calculate limit price
    const priceOffset = parseFloat(tickSize) * 5;
    const limitPrice =
      side === "Buy"
        ? (symbolPrice - priceOffset).toFixed(4)
        : (symbolPrice + priceOffset).toFixed(4);

    console.log("Limit Price:", limitPrice);

    // Check for existing positions
    const openPositions = await bybitClient.getPositionInfo({
      category: "linear",
      symbol: signal.symbol,
    });

    console.log("Open Positions:", openPositions);

    if (openPositions.result) {
      const openPosition = openPositions.result.list[0];
      const openPositionSide = openPosition.side;

      console.log("Open Position Side:", openPositionSide);

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

          console.log("Order Response for Closing Position:", orderResponse);

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

    console.log("Order Response for New Order:", response);

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

      console.log("Take Profit Prices:", takeProfitPrice1, takeProfitPrice2);
      console.log("Stop Loss Price:", stopLossPrice);
      console.log(
        "Take Profit Quantities:",
        takeProfitQuantity1,
        takeProfitQuantity2
      );

      const position = await bybitClient.getPositionInfo({
        category: "linear",
        symbol: signal.symbol,
      });

      console.log("Position Info:", position);

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

          console.log("Take Profit Response:", takeProfitResponse);

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

        console.log("Stop Loss Response:", stopLossResponse);

        if (stopLossResponse.retCode !== 0) {
          return `Stop Loss rejected: ${stopLossResponse.retMsg}`;
        } else {
          return `Stop Loss set for ${signal.symbol} at ${stopLossPrice}`;
        }
      }
    }
  } catch (error) {
    console.log(
      `An error occurred while placing the order: ${JSON.stringify(error)}`
    );
    return `An error occurred while placing the order: ${JSON.stringify(
      error
    )}`;
  }
}

module.exports = { placeOrder };
