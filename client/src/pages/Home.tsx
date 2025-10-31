import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PositionComparison } from "@/components/PositionComparison";
import { SymbolSelector } from "@/components/SymbolSelector";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import {
  calculateContract,
  ContractParams,
  formatCurrency,
  formatPercent,
  formatPrice,
} from "@/lib/contractCalculator";

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // 币种选择
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");

  // 基础参数
  const [openPrice, setOpenPrice] = useState<number>(60000);
  const [margin, setMargin] = useState<number>(20);
  const [leverage, setLeverage] = useState<number>(5);
  const [marginMode, setMarginMode] = useState<"isolated" | "cross">("isolated");
  const [positionType, setPositionType] = useState<"long" | "short">("long");

  // 高级参数
  const [maintainanceRate, setMaintainanceRate] = useState<number>(0.5);
  const [openFee, setOpenFee] = useState<number>(0.02);
  const [closeFee, setCloseFee] = useState<number>(0.02);
  const [fundingRate, setFundingRate] = useState<number>(0);

  // 盈亏计算
  const [targetPrice, setTargetPrice] = useState<number>(62000);
  // 处理价格更新
  const handlePriceUpdate = (price: number) => {
    setOpenPrice(price);
  };


  // 计算结果
  const result = useMemo(() => {
    const params: ContractParams = {
      openPrice,
      margin,
      leverage,
      marginMode,
      positionType,
      maintainanceRate: maintainanceRate / 100,
      openFee: openFee / 100,
      closeFee: closeFee / 100,
      fundingRate: fundingRate / 100,
    };
    return calculateContract(params);
  }, [openPrice, margin, leverage, marginMode, positionType, maintainanceRate, openFee, closeFee, fundingRate]);

  // 目标价格的盈亏
  const targetProfit = useMemo(() => {
    return result.profitAtPrice(targetPrice);
  }, [result, targetPrice]);

  const targetProfitPercent = useMemo(() => {
    return result.profitPercentAtPrice(targetPrice);
  }, [result, targetPrice]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🚀 加密货币合约计算器
          </h1>
          <p className="text-slate-300 text-lg">
            专业的合约交易风险计算工具 - 帮助您理解开仓参数和风险
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：输入表单 */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">基础参数</CardTitle>
                <CardDescription className="text-slate-400">
                  输入您的合约交易参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 开仓价格 */}
                <div>
                {/* 币种选择器 */}
                <SymbolSelector
                  selectedSymbol={selectedSymbol}
                  onSymbolChange={setSelectedSymbol}
                  onPriceUpdate={handlePriceUpdate}
                />

                  <Label className="text-slate-300 mb-2 block">
                    当前价格 (USD)
                  </Label>
                  <Input
                    type="number"
                    value={openPrice}
                    onChange={(e) => setOpenPrice(parseFloat(e.target.value) || 0)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="60000"
                    step="100"
                  />
                </div>

                {/* 保证金 */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    保证金 (USD)
                  </Label>
                  <Input
                    type="number"
                    value={margin}
                    onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="20"
                    step="1"
                  />
                </div>

                {/* 杠杆倍数 */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    杠杆倍数
                  </Label>
                  <div className="flex gap-2 mb-2">
                    {[1, 2, 5, 10, 20].map((lev) => (
                      <Button
                        key={lev}
                        variant={leverage === lev ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLeverage(lev)}
                        className={leverage === lev ? "bg-blue-600" : "border-slate-600 text-slate-300"}
                      >
                        {lev}x
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(parseFloat(e.target.value) || 1)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="5"
                    step="0.1"
                    min="1"
                  />
                </div>

                {/* 头寸类型 */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    头寸类型
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={positionType === "long" ? "default" : "outline"}
                      className={
                        positionType === "long"
                          ? "flex-1 bg-green-600"
                          : "flex-1 border-slate-600 text-slate-300"
                      }
                      onClick={() => setPositionType("long")}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      多头
                    </Button>
                    <Button
                      variant={positionType === "short" ? "default" : "outline"}
                      className={
                        positionType === "short"
                          ? "flex-1 bg-red-600"
                          : "flex-1 border-slate-600 text-slate-300"
                      }
                      onClick={() => setPositionType("short")}
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      空头
                    </Button>
                  </div>
                </div>

                {/* 保证金模式 */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    保证金模式
                  </Label>
                  <Select value={marginMode} onValueChange={(v: any) => setMarginMode(v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="isolated" className="text-white">
                        逐仓 (Isolated)
                      </SelectItem>
                      <SelectItem value="cross" className="text-white">
                        全仓 (Cross)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 高级参数折叠 */}
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                    <TabsTrigger value="basic" className="text-slate-300">
                      基础
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="text-slate-300">
                      高级
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="advanced" className="space-y-4 mt-4">
                    {/* 维持保证金率 */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">
                        维持保证金率 (%)
                      </Label>
                      <Input
                        type="number"
                        value={maintainanceRate}
                        onChange={(e) => setMaintainanceRate(parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="0.5"
                        step="0.1"
                      />
                    </div>

                    {/* 开仓手续费 */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">
                        开仓手续费 (%)
                      </Label>
                      <Input
                        type="number"
                        value={openFee}
                        onChange={(e) => setOpenFee(parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="0.02"
                        step="0.01"
                      />
                    </div>

                    {/* 平仓手续费 */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">
                        平仓手续费 (%)
                      </Label>
                      <Input
                        type="number"
                        value={closeFee}
                        onChange={(e) => setCloseFee(parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="0.02"
                        step="0.01"
                      />
                    </div>

                    {/* 资金费率 */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">
                        资金费率 (%)
                      </Label>
                      <Input
                        type="number"
                        value={fundingRate}
                        onChange={(e) => setFundingRate(parseFloat(e.target.value) || 0)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：计算结果 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 风险警告 */}
            <Alert className="bg-red-900/20 border-red-700">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-300 ml-2">
                加密货币市场波动性极高。使用高杠杆会显著增加爆仓风险。请务必理解风险并谨慎交易。
              </AlertDescription>
            </Alert>

            {/* 核心指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 头寸价值 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    头寸总价值
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(result.positionSize)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatPrice(result.positionSizeInCoin, 4)} BTC
                  </p>
                </CardContent>
              </Card>

              {/* 爆仓价格 */}
              <Card className={`border-slate-700 ${
                positionType === "long"
                  ? "bg-red-900/20 border-red-700"
                  : "bg-green-900/20 border-green-700"
              }`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    爆仓价格
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    positionType === "long" ? "text-red-400" : "text-green-400"
                  }`}>
                    {formatPrice(result.liquidationPrice)}
                  </div>
                  <p className={`text-xs mt-1 ${
                    positionType === "long" ? "text-red-300" : "text-green-300"
                  }`}>
                    {formatPercent(result.liquidationPricePercent)}
                  </p>
                </CardContent>
              </Card>

              {/* 风险百分比 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    价格容忍度
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">
                    {formatPercent(result.riskPercentage)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    价格需要变化此幅度才会爆仓
                  </p>
                </CardContent>
              </Card>

              {/* 最大损失 */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    最大损失
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {formatCurrency(result.maxLoss)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {marginMode === "isolated"
                      ? "逐仓模式：仅限保证金"
                      : "全仓模式：整个账户"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 费用和资金费率 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">费用和资金费率</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">开仓手续费</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(result.openFeeAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">平仓手续费</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(result.closeFeeAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">总手续费</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(result.totalFeeAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">每日资金费</p>
                    <p className={`text-lg font-semibold ${
                      fundingRate >= 0 ? "text-red-400" : "text-green-400"
                    }`}>
                      {formatCurrency(result.fundingFeePerDay)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 盈亏计算 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">盈亏计算</CardTitle>
                <CardDescription className="text-slate-400">
                  输入目标价格查看预期盈亏
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    目标价格 (USD)
                  </Label>
                  <Input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="62000"
                    step="100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${
                    targetProfit >= 0
                      ? "bg-green-900/20 border border-green-700"
                      : "bg-red-900/20 border border-red-700"
                  }`}>
                    <p className="text-xs text-slate-400 mb-1">盈亏金额</p>
                    <p className={`text-2xl font-bold ${
                      targetProfit >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {formatCurrency(targetProfit)}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    targetProfitPercent >= 0
                      ? "bg-green-900/20 border border-green-700"
                      : "bg-red-900/20 border border-red-700"
                  }`}>
                    <p className="text-xs text-slate-400 mb-1">盈亏百分比</p>
                    <p className={`text-2xl font-bold ${
                      targetProfitPercent >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {formatPercent(targetProfitPercent)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">
                    💡 <strong>保本价格：</strong> {formatPrice(result.breakEvenPrice)}
                  </p>
                  <p className="text-xs text-slate-500">
                    这是考虑所有手续费后，您需要达到的价格才能不亏不盈。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API密钥管理 */}
        <div className="mt-8">
          <ApiKeyManager />
        </div>

        {/* 多仓位对比分析 */}
        <div className="mt-8">
          <PositionComparison currentPrice={openPrice} />
        </div>

        {/* 底部说明 */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-2 text-sm">
            <p>
              <strong>基础参数：</strong> 输入您的开仓价格、保证金金额和杠杆倍数。计算器会自动计算爆仓价格、风险百分比等关键指标。
            </p>
            <p>
              <strong>高级参数：</strong> 可以调整维持保证金率、手续费和资金费率以获得更精确的计算结果。
            </p>
            <p>
              <strong>盈亏计算：</strong> 输入目标价格，查看在该价格下您的预期盈亏。
            </p>
            <p>
              <strong>风险管理：</strong> 始终使用止损订单来限制风险。低杠杆和充足的保证金是避免爆仓的关键。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

