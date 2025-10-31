/**
 * 币安API集成模块
 * 用于获取实时价格、手续费、维持保证金率等信息
 * 
 * 环境变量配置：
 * - BINANCE_API_KEY: 币安API密钥（可选）
 * - BINANCE_API_SECRET: 币安API密钥对应的Secret（可选）
 * - BINANCE_API_BASE: 币安API基础URL（默认为https://fapi.binance.com）
 */

import { createHmac } from "crypto";

const BINANCE_API_BASE = process.env.BINANCE_API_BASE || "https://fapi.binance.com";
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "";
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "";
const CACHE_DURATION = 60 * 1000; // 缓存60秒

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

interface FeeData {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  brokered: boolean;
  requiredSelfTradePreventionMode: string;
  preventSor: boolean;
  updateTime: number;
}

interface LeverageBracket {
  bracket: number;
  initialLeverage: number;
  notionalCap: number;
  notionalFloor: number;
  maintMarginRatio: number;
  cum: number;
}

interface SymbolLeverageInfo {
  symbol: string;
  leverageBrackets: LeverageBracket[];
}

// 缓存存储
const priceCache = new Map<string, CacheEntry<PriceData>>();
const feeCache = new Map<string, CacheEntry<FeeData>>();
const leverageCache = new Map<string, CacheEntry<SymbolLeverageInfo>>();

/**
 * 获取币安现货价格
 */
export async function getBinancePrice(symbol: string): Promise<number> {
  const cacheKey = `price:${symbol}`;
  const cached = priceCache.get(cacheKey);

  // 检查缓存是否有效
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data.price;
  }

  try {
    const response = await fetch(
      `${BINANCE_API_BASE}/fapi/v1/ticker/price?symbol=${symbol}`
    );
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { symbol: string; price: string };
    const price = parseFloat(data.price);

    // 更新缓存
    priceCache.set(cacheKey, {
      data: { symbol, price, timestamp: Date.now() },
      timestamp: Date.now(),
    });

    return price;
  } catch (error) {
    console.error(`[Binance] Failed to fetch price for ${symbol}:`, error);
    // 如果请求失败但有缓存，返回缓存数据（即使过期）
    if (cached) {
      return cached.data.price;
    }
    throw error;
  }
}

/**
 * 获取币安交易手续费
 * 如果配置了API密钥，会获取用户特定的手续费
 * 否则返回默认的标准手续费
 * @param clientApiKey - 客户端提供API密钥（可选）
 * @param clientApiSecret - 客户端提供API Secret（可选）
 */
export async function getBinanceFees(
  clientApiKey?: string,
  clientApiSecret?: string
): Promise<FeeData> {
  const cacheKey = "fees";
  const cached = feeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // 优先使用客户端提供的API密钥，然后是会话中配置的，最后是公开API
  const apiKey = clientApiKey || BINANCE_API_KEY;
  const apiSecret = clientApiSecret || BINANCE_API_SECRET;

  try {
    let url = `${BINANCE_API_BASE}/fapi/v1/commissionRates`;
    const headers: Record<string, string> = {};

    if (apiKey && apiSecret) {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      url += `?${queryString}&signature=${signature}`;
      headers["X-MBX-APIKEY"] = apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data = (await response.json()) as FeeData;

    feeCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error("[Binance] Failed to fetch fees:", error);
    // 如果有API密钥但请求失败，返回默认值
    if (apiKey && apiSecret) {
      const defaultFees: FeeData = {
        makerCommission: 0.0002,
        takerCommission: 0.0004,
        buyerCommission: 0,
        sellerCommission: 0,
        canTrade: true,
        canDeposit: true,
        canWithdraw: true,
        brokered: false,
        requiredSelfTradePreventionMode: "NONE",
        preventSor: false,
        updateTime: Date.now(),
      };
      return defaultFees;
    }
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

/**
 * 获取杠杆交易的维持保证金率
 * 如果配置了API密钥，会获取用户特定的杠杆限制
 * 否则使用公开API获取标准杠杆信息
 * @param symbol - 交易对符号
 * @param clientApiKey - 客户端提供API密钥（可选）
 * @param clientApiSecret - 客户端提供API Secret（可选）
 */
export async function getLeverageBrackets(
  symbol: string,
  clientApiKey?: string,
  clientApiSecret?: string
): Promise<SymbolLeverageInfo> {
  const cacheKey = `leverage:${symbol}`;
  const cached = leverageCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // 优先使用客户端提供的API密钥，然后是会话中配置的，最后是公开API
  const apiKey = clientApiKey || BINANCE_API_KEY;
  const apiSecret = clientApiSecret || BINANCE_API_SECRET;

  try {
    let url = `${BINANCE_API_BASE}/fapi/v1/leverageBracket?symbol=${symbol}`;
    const headers: Record<string, string> = {};

    if (apiKey && apiSecret) {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&timestamp=${timestamp}`;
      const signature = createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      url = `${BINANCE_API_BASE}/fapi/v1/leverageBracket?${queryString}&signature=${signature}`;
      headers["X-MBX-APIKEY"] = apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data = (await response.json()) as SymbolLeverageInfo[];
    const symbolData = data[0];

    leverageCache.set(cacheKey, {
      data: symbolData,
      timestamp: Date.now(),
    });

    return symbolData;
  } catch (error) {
    console.error(
      `[Binance] Failed to fetch leverage brackets for ${symbol}:`,
      error
    );
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

/**
 * 获取主流币种列表
 */
export function getMainSymbols(): string[] {
  return [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "SOLUSDT",
    "POLKAUSDT",
    "LTCUSDT",
    "LINKUSDT",
  ];
}

/**
 * 获取符号的显示名称
 */
export function getSymbolDisplayName(symbol: string): string {
  const names: Record<string, string> = {
    BTCUSDT: "Bitcoin (BTC)",
    ETHUSDT: "Ethereum (ETH)",
    BNBUSDT: "Binance Coin (BNB)",
    XRPUSDT: "Ripple (XRP)",
    ADAUSDT: "Cardano (ADA)",
    DOGEUSDT: "Dogecoin (DOGE)",
    SOLUSDT: "Solana (SOL)",
    POLKAUSDT: "Polkadot (DOT)",
    LTCUSDT: "Litecoin (LTC)",
    LINKUSDT: "Chainlink (LINK)",
  };
  return names[symbol] || symbol;
}

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  priceCache.clear();
  feeCache.clear();
  leverageCache.clear();
}

/**
 * 检查是否配置了币安API密钥
 */
export function isBinanceApiConfigured(): boolean {
  return !!(BINANCE_API_KEY && BINANCE_API_SECRET);
}

/**
 * 获取币安API配置状态
 */
export function getBinanceApiStatus() {
  return {
    configured: isBinanceApiConfigured(),
    hasApiKey: !!BINANCE_API_KEY,
    hasApiSecret: !!BINANCE_API_SECRET,
    baseUrl: BINANCE_API_BASE,
  };
}

