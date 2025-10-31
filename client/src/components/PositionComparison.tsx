import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import {
  calculateContract,
  ContractParams,
  formatCurrency,
  formatPercent,
  formatPrice,
} from "@/lib/contractCalculator";

export interface Position {
  id: string;
  name: string;
  openPrice: number;
  margin: number;
  leverage: number;
  positionType: "long" | "short";
  marginMode: "isolated" | "cross";
}

interface PositionComparisonProps {
  currentPrice: number;
}

export function PositionComparison({ currentPrice }: PositionComparisonProps) {
  const [positions, setPositions] = useState<Position[]>([
    {
      id: "1",
      name: "仓位 1",
      openPrice: 60000,
      margin: 20,
      leverage: 5,
      positionType: "long",
      marginMode: "isolated",
    },
    {
      id: "2",
      name: "仓位 2",
      openPrice: 60000,
      margin: 50,
      leverage: 3,
      positionType: "long",
      marginMode: "isolated",
    },
  ]);

  const addPosition = () => {
    const newId = Math.max(...positions.map((p) => parseInt(p.id)), 0) + 1;
    setPositions([
      ...positions,
      {
        id: newId.toString(),
        name: `仓位 ${newId}`,
        openPrice: 60000,
        margin: 20,
        leverage: 5,
        positionType: "long",
        marginMode: "isolated",
      },
    ]);
  };

  const deletePosition = (id: string) => {
    if (positions.length > 1) {
      setPositions(positions.filter((p) => p.id !== id));
    }
  };

  const updatePosition = (id: string, updates: Partial<Position>) => {
    setPositions(
      positions.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // 计算所有仓位的结果
  const results = positions.map((pos) => {
    const params: ContractParams = {
      openPrice: pos.openPrice,
      margin: pos.margin,
      leverage: pos.leverage,
      marginMode: pos.marginMode,
      positionType: pos.positionType,
      maintainanceRate: 0.005,
      openFee: 0.0002,
      closeFee: 0.0002,
      fundingRate: 0,
    };
    return {
      position: pos,
      result: calculateContract(params),
      profit: calculateContract(params).profitAtPrice(currentPrice),
      profitPercent: calculateContract(params).profitPercentAtPrice(currentPrice),
    };
  });

  // 计算总体指标
  const totalMargin = results.reduce((sum, r) => sum + r.position.margin, 0);
  const totalPositionSize = results.reduce((sum, r) => sum + r.result.positionSize, 0);
  const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
  const totalProfitPercent = totalMargin > 0 ? (totalProfit / totalMargin) * 100 : 0;
  const avgLiquidationPrice =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.result.liquidationPrice, 0) /
        results.length
      : 0;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">多仓位对比分析</CardTitle>
            <CardDescription className="text-slate-400">
              同时管理和对比多个合约仓位
            </CardDescription>
          </div>
          <Button
            onClick={addPosition}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            添加仓位
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 仓位列表 */}
        <div className="space-y-4">
          {positions.map((pos, index) => {
            const posResult = results[index];
            const isProfit = posResult.profit >= 0;

            return (
              <div
                key={pos.id}
                className="bg-slate-700 rounded-lg p-4 border border-slate-600"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  {/* 仓位名称 */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1 block">
                      仓位名称
                    </Label>
                    <Input
                      value={pos.name}
                      onChange={(e) => updatePosition(pos.id, { name: e.target.value })}
                      className="bg-slate-600 border-slate-500 text-white text-sm"
                      placeholder="仓位名称"
                    />
                  </div>

                  {/* 开仓价格 */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1 block">
                      开仓价格
                    </Label>
                    <Input
                      type="number"
                      value={pos.openPrice}
                      onChange={(e) =>
                        updatePosition(pos.id, { openPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-600 border-slate-500 text-white text-sm"
                      placeholder="60000"
                      step="100"
                    />
                  </div>

                  {/* 保证金 */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1 block">
                      保证金 (USD)
                    </Label>
                    <Input
                      type="number"
                      value={pos.margin}
                      onChange={(e) =>
                        updatePosition(pos.id, { margin: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-600 border-slate-500 text-white text-sm"
                      placeholder="20"
                      step="1"
                    />
                  </div>

                  {/* 杠杆倍数 */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1 block">
                      杠杆倍数
                    </Label>
                    <Input
                      type="number"
                      value={pos.leverage}
                      onChange={(e) =>
                        updatePosition(pos.id, { leverage: parseFloat(e.target.value) || 1 })
                      }
                      className="bg-slate-600 border-slate-500 text-white text-sm"
                      placeholder="5"
                      step="0.1"
                      min="1"
                    />
                  </div>

                  {/* 删除按钮 */}
                  <div className="flex items-end">
                    <Button
                      onClick={() => deletePosition(pos.id)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={positions.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 仓位详情 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div className="bg-slate-600 rounded p-3">
                    <p className="text-slate-400 text-xs mb-1">头寸价值</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(posResult.result.positionSize)}
                    </p>
                  </div>

                  <div className="bg-slate-600 rounded p-3">
                    <p className="text-slate-400 text-xs mb-1">爆仓价格</p>
                    <p className={`font-semibold ${
                      pos.positionType === "long" ? "text-red-400" : "text-green-400"
                    }`}>
                      {formatPrice(posResult.result.liquidationPrice)}
                    </p>
                  </div>

                  <div className="bg-slate-600 rounded p-3">
                    <p className="text-slate-400 text-xs mb-1">风险</p>
                    <p className="text-yellow-400 font-semibold">
                      {formatPercent(posResult.result.riskPercentage)}
                    </p>
                  </div>

                  <div className={`rounded p-3 ${
                    isProfit ? "bg-green-900/30" : "bg-red-900/30"
                  }`}>
                    <p className="text-slate-400 text-xs mb-1">当前盈亏</p>
                    <p className={`font-semibold ${
                      isProfit ? "text-green-400" : "text-red-400"
                    }`}>
                      {formatCurrency(posResult.profit)}
                    </p>
                  </div>

                  <div className={`rounded p-3 ${
                    isProfit ? "bg-green-900/30" : "bg-red-900/30"
                  }`}>
                    <p className="text-slate-400 text-xs mb-1">盈亏 %</p>
                    <p className={`font-semibold ${
                      isProfit ? "text-green-400" : "text-red-400"
                    }`}>
                      {formatPercent(posResult.profitPercent)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 总体统计 */}
        <div className="border-t border-slate-600 pt-6">
          <h3 className="text-white font-semibold mb-4">总体统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-sm mb-2">总保证金</p>
                <p className="text-white text-lg font-bold">
                  {formatCurrency(totalMargin)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-sm mb-2">总头寸价值</p>
                <p className="text-white text-lg font-bold">
                  {formatCurrency(totalPositionSize)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-sm mb-2">平均爆仓价格</p>
                <p className="text-yellow-400 text-lg font-bold">
                  {formatPrice(avgLiquidationPrice)}
                </p>
              </CardContent>
            </Card>

            <Card className={`border-slate-600 ${
              totalProfit >= 0 ? "bg-green-900/20" : "bg-red-900/20"
            }`}>
              <CardContent className="pt-6">
                <p className="text-slate-400 text-sm mb-2">总盈亏</p>
                <p className={`text-lg font-bold ${
                  totalProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {formatCurrency(totalProfit)}
                </p>
              </CardContent>
            </Card>

            <Card className={`border-slate-600 ${
              totalProfitPercent >= 0 ? "bg-green-900/20" : "bg-red-900/20"
            }`}>
              <CardContent className="pt-6">
                <p className="text-slate-400 text-sm mb-2">总盈亏 %</p>
                <p className={`text-lg font-bold ${
                  totalProfitPercent >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {formatPercent(totalProfitPercent)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 对比表格 */}
        <div className="border-t border-slate-600 pt-6">
          <h3 className="text-white font-semibold mb-4">详细对比表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left text-slate-400 py-2 px-3">仓位</th>
                  <th className="text-right text-slate-400 py-2 px-3">保证金</th>
                  <th className="text-right text-slate-400 py-2 px-3">头寸价值</th>
                  <th className="text-right text-slate-400 py-2 px-3">爆仓价格</th>
                  <th className="text-right text-slate-400 py-2 px-3">风险 %</th>
                  <th className="text-right text-slate-400 py-2 px-3">当前盈亏</th>
                  <th className="text-right text-slate-400 py-2 px-3">盈亏 %</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.position.id} className="border-b border-slate-700">
                    <td className="text-white py-3 px-3">{r.position.name}</td>
                    <td className="text-right text-slate-300 py-3 px-3">
                      {formatCurrency(r.position.margin)}
                    </td>
                    <td className="text-right text-slate-300 py-3 px-3">
                      {formatCurrency(r.result.positionSize)}
                    </td>
                    <td className="text-right py-3 px-3">
                      <span className={r.position.positionType === "long" ? "text-red-400" : "text-green-400"}>
                        {formatPrice(r.result.liquidationPrice)}
                      </span>
                    </td>
                    <td className="text-right text-yellow-400 py-3 px-3">
                      {formatPercent(r.result.riskPercentage)}
                    </td>
                    <td className={`text-right py-3 px-3 ${
                      r.profit >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {formatCurrency(r.profit)}
                    </td>
                    <td className={`text-right py-3 px-3 ${
                      r.profitPercent >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {formatPercent(r.profitPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

