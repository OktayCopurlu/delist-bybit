require("dotenv").config();

const totalMarginSize = parseFloat(process.env.TOTAL_MARGIN_SIZE);
const targetLeverage = parseFloat(process.env.TARGET_LEVERAGE);
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;
const useTestnet = false;
const SHORT_TAKE_PROFIT_1 = process.env.SHORT_TAKE_PROFIT_1;
const SHORT_TAKE_PROFIT_2 = process.env.SHORT_TAKE_PROFIT_2;
const SHORT_STOP_LOSS = process.env.SHORT_STOP_LOSS;

module.exports = {
  totalMarginSize,
  targetLeverage,
  BYBIT_API_KEY,
  BYBIT_API_SECRET,
  useTestnet,
  SHORT_TAKE_PROFIT_1,
  SHORT_TAKE_PROFIT_2,
  SHORT_STOP_LOSS,
};
