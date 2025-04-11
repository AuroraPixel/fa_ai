import { getRateLimitInfo } from '../../utils/rateLimit';

// 从环境变量获取免责声明配置
// 默认为true，即显示免责声明
function getDisclaimerConfig() {
  const config = process.env.SHOW_DISCLAIMER;
  
  // 如果明确设置为 "false"，则禁用免责声明
  if (config === "false") {
    console.log('[系统配置] 免责声明已禁用');
    return false;
  }
  
  // 默认启用免责声明
  console.log('[系统配置] 免责声明已启用');
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // 获取速率限制配置
    const rateLimitInfo = getRateLimitInfo();
    
    // 获取免责声明配置
    const showDisclaimer = getDisclaimerConfig();
    
    // 返回系统配置信息
    return res.status(200).json({
      rateLimit: {
        enabled: rateLimitInfo.enabled,
        maxRequests: rateLimitInfo.maxRequests,
        windowMs: rateLimitInfo.windowMs,
        minutes: rateLimitInfo.minutes
      },
      showDisclaimer,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`[API错误] 获取系统配置时出错: ${error.message}`);
    return res.status(500).json({ 
      message: "获取系统配置失败", 
      error: error.message 
    });
  }
} 