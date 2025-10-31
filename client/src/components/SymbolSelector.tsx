import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SymbolSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  onPriceUpdate: (price: number) => void;
}

export function SymbolSelector({
  selectedSymbol,
  onSymbolChange,
  onPriceUpdate,
}: SymbolSelectorProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 获取币种列表
  const { data: symbols, isLoading: symbolsLoading } =
    trpc.binance.symbols.useQuery();

  // 获取价格
  const { data: priceData, isLoading: priceLoading } =
    trpc.binance.price.useQuery(
      { symbol: selectedSymbol },
      {
        enabled: !!selectedSymbol,
        refetchInterval: 30000, // 每30秒刷新一次
      }
    );

  useEffect(() => {
    if (priceData?.success && priceData.price) {
      setPrice(priceData.price);
      setLastUpdate(new Date());
      onPriceUpdate(priceData.price);
      setError(null);
    } else if (priceData && !priceData.success) {
      setError(priceData.error || "Failed to fetch price");
      setPrice(null);
    }
  }, [priceData, onPriceUpdate]);

  const handleSymbolChange = (symbol: string) => {
    onSymbolChange(symbol);
    setPrice(null);
    setError(null);
  };

  const symbolName = symbols?.find((s) => s.symbol === selectedSymbol)
    ?.displayName || selectedSymbol;

  return (
    <Card className="w-full bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">币种选择</CardTitle>
        <CardDescription className="text-slate-400">从币安实时获取价格数据</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 币种选择器 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">选择交易对</label>
          <Select value={selectedSymbol} onValueChange={handleSymbolChange}>
            <SelectTrigger disabled={symbolsLoading} className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="选择币种..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {symbols?.map((symbol) => (
                <SelectItem key={symbol.symbol} value={symbol.symbol} className="text-white">
                  {symbol.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 价格显示 */}
        {selectedSymbol && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">当前价格 ({symbolName})</label>
            <div className="flex items-center justify-between p-3 bg-slate-700 border border-slate-600 rounded-lg">
              <div>
                {priceLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-slate-400">
                      获取价格中...
                    </span>
                  </div>
                ) : price !== null ? (
                  <div>
                    <p className="text-lg font-semibold text-white">
                      ${price.toFixed(2)}
                    </p>
                    {lastUpdate && (
                      <p className="text-xs text-slate-400">
                        更新于: {lastUpdate.toLocaleTimeString("zh-CN")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    无法获取价格
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 信息提示 */}
        <div className="text-xs text-slate-400 space-y-1 bg-slate-700 p-3 rounded-lg border border-slate-600">
          <p>💡 价格每30秒自动更新一次</p>
          <p>💡 需要配置币安API密钥以获取用户特定的手续费和杠杆限制</p>
        </div>
      </CardContent>
    </Card>
  );
}

