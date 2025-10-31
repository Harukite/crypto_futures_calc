/**
 * API密钥处理模块
 * 用于安全处理客户端发送的API密钥
 */

import { createHmac } from "crypto";

interface ApiKeyCredentials {
  apiKey: string;
  apiSecret: string;
}

/**
 * 验证API密钥格式
 */
export function validateApiKeyFormat(apiKey: string, apiSecret: string): boolean {
  // 基本的格式验证
  if (!apiKey || !apiSecret) {
    return false;
  }

  // API密钥通常是字母数字，长度在20-100之间
  if (apiKey.length < 10 || apiKey.length > 200) {
    return false;
  }

  // Secret通常也是字母数字，长度在20-100之间
  if (apiSecret.length < 10 || apiSecret.length > 200) {
    return false;
  }

  return true;
}

/**
 * 为API请求生成签名
 */
export function generateSignature(
  queryString: string,
  apiSecret: string
): string {
  return createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");
}

/**
 * 创建带签名的API请求URL
 */
export function createSignedUrl(
  baseUrl: string,
  queryParams: Record<string, string | number>,
  apiSecret: string
): string {
  // 将参数转换为查询字符串
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    params.append(key, String(value));
  });

  const queryString = params.toString();
  const signature = generateSignature(queryString, apiSecret);

  return `${baseUrl}?${queryString}&signature=${signature}`;
}

/**
 * 创建API请求头
 */
export function createApiHeaders(apiKey: string): Record<string, string> {
  return {
    "X-MBX-APIKEY": apiKey,
    "Content-Type": "application/json",
  };
}

/**
 * 安全地处理API密钥（不存储，只在内存中使用）
 * 这个函数应该在请求处理完成后立即清除
 */
export class SecureApiKeyHandler {
  private apiKey: string = "";
  private apiSecret: string = "";

  constructor(apiKey: string, apiSecret: string) {
    if (!validateApiKeyFormat(apiKey, apiSecret)) {
      throw new Error("Invalid API key format");
    }
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * 获取API密钥（仅供内部使用）
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * 获取API Secret（仅供内部使用）
   */
  getApiSecret(): string {
    return this.apiSecret;
  }

  /**
   * 为请求生成签名
   */
  sign(queryString: string): string {
    return generateSignature(queryString, this.apiSecret);
  }

  /**
   * 清除敏感信息
   */
  clear(): void {
    this.apiKey = "";
    this.apiSecret = "";
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.clear();
  }
}

/**
 * 日志记录（不记录敏感信息）
 */
export function logApiKeyUsage(
  action: string,
  maskedApiKey: string,
  success: boolean,
  error?: string
): void {
  const timestamp = new Date().toISOString();
  const status = success ? "SUCCESS" : "FAILED";

  console.log(
    `[${timestamp}] [API_KEY_USAGE] Action: ${action}, Key: ${maskedApiKey}, Status: ${status}${
      error ? `, Error: ${error}` : ""
    }`
  );
}

/**
 * 获取API密钥的掩码版本（用于日志）
 */
export function getMaskedApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****";
  }
  return apiKey.substring(0, 4) + "****" + apiKey.substring(apiKey.length - 4);
}

