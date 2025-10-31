import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Eye, EyeOff, Trash2, Save, CheckCircle } from "lucide-react";
import {
  saveEncryptedApiKeys,
  getDecryptedApiKeys,
  clearApiKeys,
  hasApiKeys,
  getMaskedApiKey,
} from "@/lib/encryption";

export function ApiKeyManager() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");

  // 初始化时检查是否已配置
  useEffect(() => {
    const keys = getDecryptedApiKeys();
    if (keys) {
      setIsConfigured(true);
      setMaskedKey(getMaskedApiKey(keys.apiKey));
      setApiKey(keys.apiKey);
      setApiSecret(keys.apiSecret);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    // 验证输入
    if (!apiKey.trim()) {
      setError("API密钥不能为空");
      return;
    }

    if (!apiSecret.trim()) {
      setError("API Secret不能为空");
      return;
    }

    if (apiKey.length < 10) {
      setError("API密钥格式不正确");
      return;
    }

    if (apiSecret.length < 10) {
      setError("API Secret格式不正确");
      return;
    }

    try {
      saveEncryptedApiKeys(apiKey, apiSecret);
      setIsSaved(true);
      setIsConfigured(true);
      setMaskedKey(getMaskedApiKey(apiKey));
      setSuccess("API密钥已安全保存");
      
      // 3秒后清除成功提示
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("保存失败，请重试");
      console.error(err);
    }
  };

  const handleClear = () => {
    if (confirm("确定要删除保存的API密钥吗？")) {
      try {
        clearApiKeys();
        setApiKey("");
        setApiSecret("");
        setIsSaved(false);
        setIsConfigured(false);
        setMaskedKey("");
        setSuccess("API密钥已删除");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError("删除失败，请重试");
        console.error(err);
      }
    }
  };

  return (
    <Card className="w-full bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">币安API配置</CardTitle>
        <CardDescription className="text-slate-400">
          配置您的币安API密钥以获取用户特定的手续费和杠杆限制
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 状态指示 */}
        <div className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg border border-slate-600">
          {isConfigured ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-400">已配置</p>
                <p className="text-xs text-slate-400">API密钥: {maskedKey}</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-400">未配置</p>
                <p className="text-xs text-slate-400">使用币安公开API获取标准数据</p>
              </div>
            </>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert className="bg-green-900 border-green-700">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* 标签页 */}
        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700">
            <TabsTrigger value="configure" className="text-slate-300">
              配置
            </TabsTrigger>
            <TabsTrigger value="security" className="text-slate-300">
              安全说明
            </TabsTrigger>
          </TabsList>

          {/* 配置标签页 */}
          <TabsContent value="configure" className="space-y-4 mt-4">
            {/* API密钥输入 */}
            <div className="space-y-2">
              <Label className="text-slate-300">API密钥</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的币安API密钥"
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                  disabled={isSaved && isConfigured}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  disabled={isSaved && isConfigured}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* API Secret输入 */}
            <div className="space-y-2">
              <Label className="text-slate-300">API Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="输入您的币安API Secret"
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                  disabled={isSaved && isConfigured}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  disabled={isSaved && isConfigured}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              {!isSaved || !isConfigured ? (
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存密钥
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsSaved(false);
                    setApiKey("");
                    setApiSecret("");
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600"
                >
                  编辑
                </Button>
              )}

              {isConfigured && (
                <Button
                  onClick={handleClear}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              )}
            </div>

            {/* 信息提示 */}
            <Alert className="bg-blue-900 border-blue-700">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-400 text-xs">
                您的API密钥使用客户端加密存储在浏览器本地，不会发送到服务器。
                建议只授予"现货及杠杆交易"权限，不要授予提现权限。
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* 安全说明标签页 */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-white mb-2">🔐 加密方式</h4>
                <p className="text-slate-400">
                  API密钥使用基于浏览器指纹的客户端加密存储，防止明文存储在localStorage中。
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">⚠️ 安全建议</h4>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li>只在可信的设备上配置API密钥</li>
                  <li>定期更换API密钥</li>
                  <li>不要在公共WiFi上配置API密钥</li>
                  <li>不要分享您的API密钥给任何人</li>
                  <li>在币安账户设置中启用IP白名单</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">🛡️ 权限设置</h4>
                <p className="text-slate-400 mb-2">
                  在币安API管理页面创建API密钥时，建议：
                </p>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li>✅ 启用：现货及杠杆交易</li>
                  <li>❌ 禁用：提现、转账等敏感操作</li>
                  <li>✅ 设置IP白名单</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">🔄 数据流程</h4>
                <p className="text-slate-400">
                  1. 您的API密钥在客户端加密后存储在浏览器<br />
                  2. 需要时，客户端解密密钥<br />
                  3. 密钥通过HTTPS发送到服务器<br />
                  4. 服务器使用密钥调用币安API<br />
                  5. 服务器不存储您的API密钥
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">❌ 如何删除</h4>
                <p className="text-slate-400">
                  点击"删除"按钮可以清除本地存储的API密钥。
                  同时建议在币安账户设置中删除对应的API密钥。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

