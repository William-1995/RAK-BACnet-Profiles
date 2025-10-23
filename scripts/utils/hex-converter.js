/**
 * 十六进制转换工具
 */

/**
 * 将十六进制字符串转换为字节数组
 * @param {string} hexString - 十六进制字符串，如 "040164" 或 "04 01 64"
 * @returns {number[]} 字节数组，如 [4, 1, 100]
 */
function hexToBytes(hexString) {
  // 移除所有空格和连字符
  const cleaned = hexString.replace(/[\s-]/g, '');
  
  // 验证是否为有效的十六进制字符串
  if (!/^[0-9A-Fa-f]*$/.test(cleaned)) {
    throw new Error(`Invalid hex string: ${hexString}`);
  }
  
  // 确保长度为偶数
  if (cleaned.length % 2 !== 0) {
    throw new Error(`Hex string length must be even: ${hexString}`);
  }
  
  const bytes = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.substr(i, 2), 16));
  }
  
  return bytes;
}

/**
 * 将字节数组转换为十六进制字符串
 * @param {number[]|Uint8Array} bytes - 字节数组
 * @param {string} separator - 分隔符（默认为空格）
 * @returns {string} 十六进制字符串
 */
function bytesToHex(bytes, separator = ' ') {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(separator);
}

/**
 * 格式化十六进制字符串（添加空格分隔）
 * @param {string} hexString - 十六进制字符串
 * @returns {string} 格式化后的字符串
 */
function formatHex(hexString) {
  const cleaned = hexString.replace(/[\s-]/g, '');
  return cleaned.match(/.{1,2}/g).join(' ');
}

module.exports = {
  hexToBytes,
  bytesToHex,
  formatHex
};

