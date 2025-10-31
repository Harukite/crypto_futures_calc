/**
 * 客户端加密工具
 * 用于安全存储API密钥
 * 
 * 注意：这是客户端加密，主要用于防止明文存储在localStorage中
 * 不应该依赖这个加密来保护敏感信息，因为加密密钥也在客户端
 * 最安全的做法是通过HTTPS传输，并在服务器端处理敏感信息
 */

/**
 * 简单的XOR加密（用于混淆，不是真正的加密）
 * 这只是为了防止casual inspection，不应该用于真正的安全敏感数据
 */
function simpleEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result); // Base64编码
}

function simpleDecrypt(encrypted: string, key: string): string {
  try {
    const decoded = atob(encrypted);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}

/**
 * 获取本地加密密钥（基于浏览器指纹）
 */
function getLocalEncryptionKey(): string {
  // 使用浏览器信息生成一个基础密钥
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseKey = `${userAgent}-${language}-${timezone}`;

  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < baseKey.length; i++) {
    const char = baseKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * 保存加密的API密钥到localStorage
 */
export function saveEncryptedApiKeys(apiKey: string, apiSecret: string): void {
  try {
    const encryptionKey = getLocalEncryptionKey();

    const encrypted = {
      key: simpleEncrypt(apiKey, encryptionKey),
      secret: simpleEncrypt(apiSecret, encryptionKey),
      timestamp: Date.now(),
    };

    localStorage.setItem(
      "binance_api_encrypted",
      JSON.stringify(encrypted)
    );
  } catch (error) {
    console.error("Failed to save encrypted API keys:", error);
    throw new Error("Failed to save API keys");
  }
}

/**
 * 从localStorage读取解密的API密钥
 */
export function getDecryptedApiKeys(): {
  apiKey: string;
  apiSecret: string;
} | null {
  try {
    const encrypted = localStorage.getItem("binance_api_encrypted");
    if (!encrypted) {
      return null;
    }

    const encryptionKey = getLocalEncryptionKey();
    const data = JSON.parse(encrypted);

    const apiKey = simpleDecrypt(data.key, encryptionKey);
    const apiSecret = simpleDecrypt(data.secret, encryptionKey);

    if (!apiKey || !apiSecret) {
      return null;
    }

    return { apiKey, apiSecret };
  } catch (error) {
    console.error("Failed to decrypt API keys:", error);
    return null;
  }
}

/**
 * 删除保存的API密钥
 */
export function clearApiKeys(): void {
  try {
    localStorage.removeItem("binance_api_encrypted");
  } catch (error) {
    console.error("Failed to clear API keys:", error);
  }
}

/**
 * 检查是否已配置API密钥
 */
export function hasApiKeys(): boolean {
  try {
    const encrypted = localStorage.getItem("binance_api_encrypted");
    if (!encrypted) {
      return false;
    }

    const data = JSON.parse(encrypted);
    return !!(data.key && data.secret);
  } catch (error) {
    return false;
  }
}

/**
 * 获取API密钥的掩码版本（用于显示）
 */
export function getMaskedApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****";
  }
  return apiKey.substring(0, 4) + "****" + apiKey.substring(apiKey.length - 4);
}

