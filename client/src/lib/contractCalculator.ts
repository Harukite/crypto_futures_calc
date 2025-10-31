/**
 * 加密货币合约计算器核心逻辑
 * 用于计算合约交易的关键参数
 */

export interface ContractParams {
  // 基础参数
  openPrice: number; // 开仓价格
  margin: number; // 保证金（美元）
  leverage: number; // 杠杆倍数
  marginMode: "isolated" | "cross"; // 保证金模式
  positionType: "long" | "short"; // 头寸类型（多头/空头）

  // 可选参数
  maintainanceRate?: number; // 维持保证金率（默认0.5%）
  openFee?: number; // 开仓手续费率（默认0.02%）
  closeFee?: number; // 平仓手续费率（默认0.02%）
  fundingRate?: number; // 资金费率（默认0）
  fundingPeriodHours?: number; // 资金费率周期（小时，默认8）
}

export interface CalculationResult {
  // 头寸信息
  positionSize: number; // 头寸大小（USD）
  positionSizeInCoin: number; // 头寸大小（币数）
  
  // 爆仓相关
  liquidationPrice: number; // 爆仓价格
  liquidationPricePercent: number; // 爆仓价格相对于开仓价格的百分比变化
  
  // 风险相关
  riskPercentage: number; // 风险百分比（价格需要变化多少才会爆仓）
  maxLoss: number; // 最大损失（USD）
  
  // 费用相关
  openFeeAmount: number; // 开仓手续费
  closeFeeAmount: number; // 平仓手续费
  totalFeeAmount: number; // 总手续费
  
  // 资金费率相关
  fundingFeePerPeriod: number; // 每个周期的资金费
  fundingFeePerDay: number; // 每天的资金费
  
  // 盈亏相关
  breakEvenPrice: number; // 保本价格（考虑手续费）
  profitAtPrice: (price: number) => number; // 在某价格的盈利
  profitPercentAtPrice: (price: number) => number; // 在某价格的盈利百分比
}

/**
 * 计算合约交易的所有关键指标
 */
export function calculateContract(params: ContractParams): CalculationResult {
  // 设置默认值
  const maintainanceRate = params.maintainanceRate ?? 0.005; // 0.5%
  const openFeeRate = params.openFee ?? 0.0002; // 0.02%
  const closeFeeRate = params.closeFee ?? 0.0002; // 0.02%
  const fundingRate = params.fundingRate ?? 0;
  const fundingPeriodHours = params.fundingPeriodHours ?? 8;

  // 基础计算
  const positionSize = params.margin * params.leverage;
  const positionSizeInCoin = positionSize / params.openPrice;

  // 手续费计算
  const openFeeAmount = positionSize * openFeeRate;
  const closeFeeAmount = positionSize * closeFeeRate;
  const totalFeeAmount = openFeeAmount + closeFeeAmount;

  // 爆仓价格计算
  // 公式：对于多头，爆仓价格 = 开仓价格 * (1 - 1/杠杆 + 维持保证金率)
  // 对于空头，爆仓价格 = 开仓价格 * (1 + 1/杠杆 - 维持保证金率)
  let liquidationPrice: number;
  if (params.positionType === "long") {
    liquidationPrice =
      params.openPrice * (1 - 1 / params.leverage + maintainanceRate);
  } else {
    liquidationPrice =
      params.openPrice * (1 + 1 / params.leverage - maintainanceRate);
  }

  // 风险百分比（价格需要变化多少才会爆仓）
  const priceChange = Math.abs(liquidationPrice - params.openPrice);
  const riskPercentage = (priceChange / params.openPrice) * 100;

  // 最大损失（在逐仓模式下就是保证金，在全仓模式下理论上是整个账户）
  const maxLoss = params.margin;

  // 资金费率相关计算
  const fundingFeePerPeriod = positionSize * fundingRate;
  const fundingFeePerDay = (fundingFeePerPeriod / fundingPeriodHours) * 24;

  // 保本价格（考虑手续费）
  let breakEvenPrice: number;
  if (params.positionType === "long") {
    // 多头：需要价格上升来弥补手续费
    breakEvenPrice =
      params.openPrice * (1 + (totalFeeAmount / positionSize) * 1.1); // 乘以1.1是为了保险
  } else {
    // 空头：需要价格下降来弥补手续费
    breakEvenPrice =
      params.openPrice * (1 - (totalFeeAmount / positionSize) * 1.1);
  }

  // 盈亏计算函数
  const profitAtPrice = (price: number): number => {
    let profit: number;
    if (params.positionType === "long") {
      profit = (price - params.openPrice) * positionSizeInCoin - totalFeeAmount;
    } else {
      profit = (params.openPrice - price) * positionSizeInCoin - totalFeeAmount;
    }
    return profit;
  };

  const profitPercentAtPrice = (price: number): number => {
    const profit = profitAtPrice(price);
    return (profit / params.margin) * 100;
  };

  // 爆仓价格相对于开仓价格的百分比变化
  const liquidationPricePercent =
    ((liquidationPrice - params.openPrice) / params.openPrice) * 100;

  return {
    positionSize,
    positionSizeInCoin,
    liquidationPrice,
    liquidationPricePercent,
    riskPercentage,
    maxLoss,
    openFeeAmount,
    closeFeeAmount,
    totalFeeAmount,
    fundingFeePerPeriod,
    fundingFeePerDay,
    breakEvenPrice,
    profitAtPrice,
    profitPercentAtPrice,
  };
}

/**
 * 根据目标爆仓价格反推杠杆倍数
 */
export function calculateLeverageFromLiquidationPrice(
  openPrice: number,
  targetLiquidationPrice: number,
  positionType: "long" | "short",
  maintainanceRate: number = 0.005
): number {
  // 根据爆仓价格公式反推杠杆
  // 多头：liquidationPrice = openPrice * (1 - 1/leverage + maintainanceRate)
  // 空头：liquidationPrice = openPrice * (1 + 1/leverage - maintainanceRate)

  if (positionType === "long") {
    const ratio = targetLiquidationPrice / openPrice;
    const leverage = 1 / (1 - ratio + maintainanceRate);
    return Math.max(1, leverage); // 杠杆至少为1
  } else {
    const ratio = targetLiquidationPrice / openPrice;
    const leverage = 1 / (ratio - 1 - maintainanceRate);
    return Math.max(1, leverage);
  }
}

/**
 * 根据目标风险百分比反推杠杆倍数
 */
export function calculateLeverageFromRiskPercentage(
  riskPercentage: number,
  positionType: "long" | "short",
  maintainanceRate: number = 0.005
): number {
  // 风险百分比 = (1/leverage - maintainanceRate) * 100
  // 所以 leverage = 1 / (riskPercentage/100 + maintainanceRate)

  const leverage = 1 / (riskPercentage / 100 + maintainanceRate);
  return Math.max(1, leverage);
}

/**
 * 格式化数字为美元或百分比
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatPrice(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

