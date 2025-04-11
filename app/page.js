"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // For modal
  const [userId, setUserId] = useState(""); // 用户ID
  const [isAdmin, setIsAdmin] = useState(false); // 是否为管理员

  // 显示用户ID的输入框
  const [showUserIdInput, setShowUserIdInput] = useState(false);
  const [userIdInput, setUserIdInput] = useState("");
  
  // 速率限制状态
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);
  
  // 免责声明弹窗相关状态
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [pendingGenerateData, setPendingGenerateData] = useState(null);
  
  // 懒加载相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleImages, setVisibleImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  // Additional parameters for fine-tuning
  const [imageSize, setImageSize] = useState("landscape_4_3");
  const [numInferenceSteps, setNumInferenceSteps] = useState(28);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [numImages, setNumImages] = useState(1);
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(true);
  const [strength, setStrength] = useState(1);
  const [outputFormat, setOutputFormat] = useState("jpeg");
  const [syncMode, setSyncMode] = useState(false);
  const [loraUrls, setLoraUrls] = useState([{ url: "", scale: 1 }]);

  // Model Selection
  const [model, setModel] = useState("fal-ai/flux-lora");

  // 每页显示的图片数量
  const IMAGES_PER_PAGE = 6;

  // 管理员面板相关状态
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [ipStats, setIpStats] = useState([]);
  const [loadingIpStats, setLoadingIpStats] = useState(false);
  
  // 用户IP状态面板
  const [isUserIpPanelOpen, setIsUserIpPanelOpen] = useState(false);
  const [userIpInfo, setUserIpInfo] = useState(null);
  const [loadingUserIpInfo, setLoadingUserIpInfo] = useState(false);

  // 生成或从localStorage获取用户ID
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
      // 检查是否是管理员
      if (storedUserId === "admin-wang") {
        setIsAdmin(true);
      }
      // 获取该用户的图像历史
      fetchImageHistory(storedUserId);
    } else {
      generateUserId();
    }
  }, []);

  // 设置交叉观察器用于懒加载
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMoreImages();
      }
    }, options);
    
    observerRef.current = observer;
    
    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, page]);

  // 加载更多图片的函数
  const loadMoreImages = useCallback(() => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    
    // 计算要显示的图片
    const startIndex = (page - 1) * IMAGES_PER_PAGE;
    const endIndex = page * IMAGES_PER_PAGE;
    const newImages = allImages.slice(startIndex, endIndex);
    
    if (newImages.length > 0) {
      setVisibleImages(prev => [...prev, ...newImages]);
      setPage(prev => prev + 1);
      
      // 如果已经加载了所有图片，就设置hasMore为false
      if (endIndex >= allImages.length) {
        setHasMore(false);
      }
    } else {
      setHasMore(false);
    }
    
    setLoadingMore(false);
  }, [page, allImages, hasMore, loadingMore]);

  // 生成唯一用户ID
  const generateUserId = async () => {
    try {
      const response = await fetch("/api/generateUserId");
      const data = await response.json();
      
      if (response.ok) {
        setUserId(data.userId);
        localStorage.setItem("userId", data.userId);
        fetchImageHistory(data.userId);
      }
    } catch (error) {
      console.error("Failed to generate user ID:", error);
    }
  };

  // 重置图片加载状态
  const resetImageLoading = () => {
    setPage(1);
    setHasMore(true);
    setVisibleImages([]);
    setAllImages([]);
    setImageUrl(null);
  };

  // 获取用户图像历史
  const fetchImageHistory = async (id) => {
    try {
      // 重置图片加载状态
      resetImageLoading();
      
      const response = await fetch(`/api/getImageHistory?userId=${id}`);
      const data = await response.json();

      if (response.ok) {
        setIsAdmin(data.isAdmin);
        
        if (data.images && data.images.length > 0) {
          // 存储所有图片
          setAllImages(data.images);
          
          // 只加载第一页图片
          const initialImages = data.images.slice(0, IMAGES_PER_PAGE);
          setVisibleImages(initialImages);
          
          // 如果图片总数小于每页显示数，就没有更多图片了
          if (data.images.length <= IMAGES_PER_PAGE) {
            setHasMore(false);
          } else {
            setHasMore(true);
            setPage(2); // 准备加载第二页
          }
          
          // 显示最新的图像 - 使用图像记录中的imageUrl而不是构建本地路径
          setImageUrl(data.images[0].imageUrl);
        } else {
          // 如果没有图片，清空显示
          setImageUrl(null);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch image history:", error);
      setImageUrl(null);
    }
  };

  // 切换用户ID输入框
  const toggleUserIdInput = () => {
    setShowUserIdInput(!showUserIdInput);
    setUserIdInput("");
  };

  // 提交用户ID
  const submitUserId = () => {
    if (userIdInput) {
      // 如果ID不同，才重新设置
      if (userIdInput !== userId) {
        setUserId(userIdInput);
        localStorage.setItem("userId", userIdInput);
        
        // 检查是否是管理员
        if (userIdInput === "admin-wang") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
        
        // 清空当前显示的图片
        setImageUrl(null);
        setGeneratedImages([]);
        
        // 获取新用户的图像历史
        fetchImageHistory(userIdInput);
      }
      
      setShowUserIdInput(false);
    }
  };

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  // 关闭错误弹窗
  const handleCloseErrorModal = () => {
    setErrorModalOpen(false);
  };

  // 关闭速率限制弹窗
  const handleCloseRateLimitModal = () => {
    setIsRateLimitModalOpen(false);
  };

  // 关闭免责声明弹窗
  const handleCloseDisclaimerModal = () => {
    setIsDisclaimerModalOpen(false);
    // 取消生成操作
    setPendingGenerateData(null);
  };

  // 同意免责声明并继续生成
  const handleAcceptDisclaimer = () => {
    setIsDisclaimerModalOpen(false);
    // 继续生成操作
    if (pendingGenerateData) {
      proceedWithImageGeneration(pendingGenerateData);
    }
  };

  const generateImage = async (e) => {
    e.preventDefault();
    
    // 显示免责声明弹窗
    const formData = {
      prompt,
      image_size: imageSize,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      num_images: numImages,
      enable_safety_checker: enableSafetyChecker,
      strength,
      output_format: outputFormat,
      sync_mode: syncMode,
      model,
      userId,
      loras: loraUrls
        .filter(lora => lora.url.trim() !== "")
        .map(lora => ({ path: lora.url, scale: lora.scale })),
    };
    
    setPendingGenerateData(formData);
    setIsDisclaimerModalOpen(true);
  };

  // 实际执行图片生成的函数
  const proceedWithImageGeneration = async (formData) => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch("/api/generateImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("API Response:", data); // Log the full response from the API

      // 保存速率限制信息（如果有）
      if (data.rateLimitInfo) {
        setRateLimitInfo(data.rateLimitInfo);
      }

      if (response.status === 429) {
        // 速率限制错误
        setError(`生成图像频率受限: ${data.message}`);
        setIsRateLimitModalOpen(true);
        return;
      }

      if (response.ok) {
        if (data.imageUrl) {
          // 立即设置图片URL以便显示
          setImageUrl(data.imageUrl);
          
          // 然后刷新图像历史
          await fetchImageHistory(userId);
          
          // 显示使用的密钥信息（可选）
          if (data.keyInfo) {
            console.log(`使用了第 ${data.keyInfo.keyIndex}/${data.keyInfo.totalKeys} 个密钥: ${data.keyInfo.maskedKey}`);
          }
        } else {
          throw new Error("No image URL found in the response.");
        }
      } else {
        // 显示更详细的错误信息，包括失败的密钥
        if (data.keyInfo && data.keyInfo.status === 'failed') {
          setError(`生成图像失败: ${data.message}。密钥 #${data.keyInfo.keyIndex}/${data.keyInfo.totalKeys} (${data.keyInfo.maskedKey}) 出现问题，请检查该密钥。`);
          // 显示密钥错误弹窗
          setErrorModalOpen(true);
          setErrorModalMessage(`生成图像失败: ${data.message}。密钥 #${data.keyInfo.keyIndex}/${data.keyInfo.totalKeys} (${data.keyInfo.maskedKey}) 出现问题，请检查该密钥。`);
        } else {
          setError(`生成图像失败: ${data.message}`);
          // 显示一般错误弹窗
          setErrorModalOpen(true);
          setErrorModalMessage(`生成图像失败: ${data.message}`);
        }
      }
    } catch (err) {
      console.error("Error occurred:", err.message);
      setError(`错误: ${err.message}`);
      // 显示异常错误弹窗
      setErrorModalOpen(true);
      setErrorModalMessage(`错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 点击历史记录中的图像
  const handleHistoryImageClick = (image) => {
    // 使用来自image对象的imageUrl而不是构建本地路径
    setImageUrl(image.imageUrl);
    setPrompt(image.prompt); // 同时设置对应的提示词
  };

  const handleImageClick = () => {
    setIsModalOpen(true); // Open the modal when the image is clicked
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // Close the modal
  };

  const addLoraField = () => {
    setLoraUrls([...loraUrls, { url: "", scale: 1 }]);
  };

  const removeLoraField = () => {
    if (loraUrls.length > 1) {
      setLoraUrls(loraUrls.slice(0, -1)); // Remove the last element from the array
    }
  };

  const handleLoraChange = (index, value) => {
    const updatedLoraUrls = [...loraUrls];
    updatedLoraUrls[index].url = value;
    setLoraUrls(updatedLoraUrls);
  };

  const handleLoraScaleChange = (index, scale) => {
    const updatedLoraUrls = [...loraUrls];
    updatedLoraUrls[index].scale = scale;
    setLoraUrls(updatedLoraUrls);
  };

  // 处理图片加载错误（404）
  const handleImageError = (image) => {
    console.log(`图片加载失败(404): ${image.imageName}`);
    deleteImage(image.imageName);
  };

  // 新增删除图片函数
  const deleteImage = async (imageName, event) => {
    // 阻止事件冒泡，避免触发图片点击事件
    if (event) {
      event.stopPropagation();
    }
    
    try {
      const response = await fetch(`/api/deleteImage?imageName=${imageName}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        console.log(`图片删除成功: ${imageName}`);
        
        // 从可见图片和所有图片中移除该图片
        const newVisibleImages = visibleImages.filter(img => img.imageName !== imageName);
        const newAllImages = allImages.filter(img => img.imageName !== imageName);
        
        setVisibleImages(newVisibleImages);
        setAllImages(newAllImages);
        
        // 如果删除的是当前显示的图片，显示下一张图片
        if (imageUrl && newVisibleImages.length > 0) {
          // 检查是否是当前显示的图片
          const isCurrentImage = visibleImages.find(
            img => img.imageName === imageName && img.imageUrl === imageUrl
          );
          
          if (isCurrentImage) {
            setImageUrl(newVisibleImages[0].imageUrl);
            setPrompt(newVisibleImages[0].prompt);
          }
        } else if (newVisibleImages.length === 0) {
          setImageUrl(null);
        }
        
        // 重新计算是否有更多图片
        const remainingImagesCount = newAllImages.length - newVisibleImages.length;
        setHasMore(remainingImagesCount > 0);
      } else {
        console.error('删除图片失败');
      }
    } catch (error) {
      console.error(`删除图片出错: ${error.message}`);
    }
  };

  // 获取IP统计信息
  const fetchIpStats = async () => {
    if (!isAdmin) return;
    
    setLoadingIpStats(true);
    try {
      const response = await fetch(`/api/getIpStats?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setIpStats(data.stats);
        console.log(`[管理员] 获取到 ${data.stats.length} 个IP的统计信息`);
      } else {
        console.error(`[管理员] 获取IP统计信息失败: ${data.message}`);
      }
    } catch (error) {
      console.error(`[管理员] 获取IP统计信息出错: ${error.message}`);
    } finally {
      setLoadingIpStats(false);
    }
  };
  
  // 切换管理员面板
  const toggleAdminPanel = () => {
    if (!isAdmin) return;
    
    const newStatus = !isAdminPanelOpen;
    setIsAdminPanelOpen(newStatus);
    
    // 打开面板时获取统计信息
    if (newStatus) {
      fetchIpStats();
    }
  };
  
  // 刷新IP统计信息
  const refreshIpStats = () => {
    fetchIpStats();
  };

  // 获取用户自己的IP限制状态
  const fetchUserIpStatus = async () => {
    setLoadingUserIpInfo(true);
    try {
      const response = await fetch(`/api/getUserIpStatus?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setUserIpInfo(data.ipInfo);
        console.log(`[用户] 获取到IP状态信息:`, data.ipInfo);
      } else {
        console.error(`[用户] 获取IP状态信息失败: ${data.message}`);
      }
    } catch (error) {
      console.error(`[用户] 获取IP状态信息出错: ${error.message}`);
    } finally {
      setLoadingUserIpInfo(false);
    }
  };
  
  // 切换用户IP状态面板
  const toggleUserIpPanel = () => {
    const newStatus = !isUserIpPanelOpen;
    setIsUserIpPanelOpen(newStatus);
    
    // 打开面板时获取IP状态
    if (newStatus) {
      fetchUserIpStatus();
    }
  };
  
  // 刷新用户IP状态
  const refreshUserIpStatus = () => {
    fetchUserIpStatus();
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-screen p-4 bg-[#C1EEFF]">
      {/* 顶部用户信息栏 */}
      <div className="col-span-12 bg-gray-800 text-white p-3 rounded-lg flex justify-between items-center mb-1">
        <div className="flex items-center space-x-2">
          <span className="font-bold">用户ID:</span>
          <span className="bg-gray-700 px-3 py-1 rounded">{userId}</span>
          {isAdmin ? (
            <button 
              onClick={toggleAdminPanel}
              className={`bg-red-600 px-3 py-1 rounded ml-2 hover:bg-red-700 flex items-center gap-1`}
            >
              <span>管理面板</span>
              <span className="text-xs">{isAdminPanelOpen ? '▲' : '▼'}</span>
            </button>
          ) : (
            <button 
              onClick={toggleUserIpPanel}
              className={`bg-blue-600 px-3 py-1 rounded ml-2 hover:bg-blue-700 flex items-center gap-1`}
            >
              <span>我的IP状态</span>
              <span className="text-xs">{isUserIpPanelOpen ? '▲' : '▼'}</span>
            </button>
          )}
          
          {/* 速率限制信息显示 */}
          {rateLimitInfo && (
            <div className="ml-4 flex items-center">
              <span className="text-sm">剩余请求: </span>
              <span className={`ml-1 px-2 py-1 rounded text-sm ${
                rateLimitInfo.remaining < 2 ? 'bg-red-600' : 
                rateLimitInfo.remaining < 4 ? 'bg-yellow-600' : 'bg-green-600'
              }`}>
                {rateLimitInfo.remaining}/{rateLimitInfo.limit}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={toggleUserIdInput}
          className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded"
        >
          切换用户
        </button>
      </div>

      {/* 用户ID输入对话框 */}
      {showUserIdInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">输入用户ID</h3>
            <input
              type="text"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4"
              placeholder="输入用户ID"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUserIdInput(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={submitUserId}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理员面板 */}
      {isAdmin && isAdminPanelOpen && (
        <div className="col-span-12 bg-gray-700 text-white p-3 rounded-lg mb-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">IP限制统计</h2>
            <button
              onClick={refreshIpStats}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center gap-1"
              disabled={loadingIpStats}
            >
              {loadingIpStats ? (
                <span>加载中...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span>刷新</span>
                </>
              )}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900">
                <tr>
                  <th className="py-2 px-4 text-left">IP地址</th>
                  <th className="py-2 px-4 text-left">请求次数</th>
                  <th className="py-2 px-4 text-left">剩余次数</th>
                  <th className="py-2 px-4 text-left">限制状态</th>
                  <th className="py-2 px-4 text-left">重置时间</th>
                </tr>
              </thead>
              <tbody>
                {ipStats.length > 0 ? (
                  ipStats.map((stat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                      <td className="py-2 px-4">{stat.ip}</td>
                      <td className="py-2 px-4">{stat.requestCount}</td>
                      <td className="py-2 px-4">{stat.remaining}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          stat.limited ? 'bg-red-600' : 'bg-green-600'
                        }`}>
                          {stat.limited ? '已限制' : '正常'}
                        </span>
                      </td>
                      <td className="py-2 px-4">{new Date(stat.resetTime).toLocaleTimeString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center">
                      {loadingIpStats ? '正在加载IP统计信息...' : '暂无IP统计数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            说明: 限制规则为每IP每10分钟最多生成5张图片。超出限制后需要等待时间重置。
          </p>
        </div>
      )}

      {/* 用户IP状态面板 */}
      {!isAdmin && isUserIpPanelOpen && (
        <div className="col-span-12 bg-gray-700 text-white p-3 rounded-lg mb-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">我的IP使用情况</h2>
            <button
              onClick={refreshUserIpStatus}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center gap-1"
              disabled={loadingUserIpInfo}
            >
              {loadingUserIpInfo ? (
                <span>加载中...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span>刷新</span>
                </>
              )}
            </button>
          </div>
          
          {loadingUserIpInfo ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-2">加载中...</span>
            </div>
          ) : userIpInfo ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-300 mb-1">您的IP地址</div>
                  <div className="text-white font-semibold">{userIpInfo.ip}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-300 mb-1">限制规则</div>
                  <div className="text-white font-semibold">{userIpInfo.limit} 张图片 / 10分钟</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-300 mb-1">已使用次数</div>
                  <div className="text-white font-semibold">{userIpInfo.requestCount || 0} 次</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-300 mb-1">剩余次数</div>
                  <div className={`font-semibold ${userIpInfo.remaining < 2 ? 'text-red-400' : 'text-white'}`}>
                    {userIpInfo.remaining} 次
                  </div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-300 mb-1">限制状态</div>
                  <div className={`font-semibold ${userIpInfo.limited ? 'text-red-400' : 'text-green-400'}`}>
                    {userIpInfo.limited ? '已限制' : '正常'}
                  </div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-gray-300 mb-1">重置时间</div>
                  <div className="text-white font-semibold">
                    {userIpInfo.resetTime ? new Date(userIpInfo.resetTime).toLocaleTimeString() : '未知'}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-400">
                <p>提示: 如果您已达到限制，需要等到重置时间后才能继续生成图片。</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p>暂无IP使用数据，请尝试刷新或生成一张图片。</p>
            </div>
          )}
        </div>
      )}

      {/* Left Sidebar for form */}
      <div className="col-span-3 bg-gray-100 border-r border-gray-300 overflow-y-auto space-y-6 shadow-lg p-4 h-full">
        <h2 className="text-2xl font-bold text-gray-800">fal.ai Image Generator</h2>
        <form onSubmit={generateImage} className="space-y-4">

          {/* Prompt */}
          <div>
            <label htmlFor="prompt" className="block text-lg font-medium text-gray-700">
              Enter your prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              className="mt-2 p-3 w-full h-24 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-gray-300 resize-y overflow-y-auto"
              placeholder="A charismatic speaker is captured mid-speech..."
            />
          </div>

          {/* Submit Prompt */}
          <button
            type="submit"
            className="w-full py-3 px-6 bg-black text-white rounded-lg shadow-md hover:bg-gray-700"
          >
            Try this prompt →
          </button>

          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block text-lg font-medium text-gray-700">
              Select Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
            >
              <option value="fal-ai/flux-lora">flux-lora</option>
              <option value="fal-ai/flux/dev">flux/dev</option>
              <option value="fal-ai/flux-realism">flux-realism</option>
            </select>
          </div>

          {/* Image Size */}
          <div>
            <label htmlFor="imageSize" className="block text-lg font-medium text-gray-700">
              Image Size
            </label>
            <select
              id="imageSize"
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
            >
              <option value="square_hd">Square HD</option>
              <option value="portrait_4_3">Portrait (3:4)</option>
              <option value="portrait_16_9">Portrait (9:16)</option>
              <option value="landscape_4_3">Landscape (4:3)</option>
              <option value="landscape_16_9">Landscape (16:9)</option>
            </select>
          </div>

          {/* LoRA URL Input */}
          <div>
            <label htmlFor="loraUrl" className="block text-lg font-medium text-gray-700">
              LoRA URLs
            </label>
            {loraUrls.map((lora, index) => (
              <div key={index} className="mt-2">
                <input
                  type="text"
                  value={lora.url}
                  onChange={(e) => handleLoraChange(index, e.target.value)}
                  className="p-3 w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-gray-300"
                  placeholder="Enter LoRA URL"
                />
                <input
                  type="number"
                  value={lora.scale}
                  onChange={(e) => handleLoraScaleChange(index, e.target.value)}
                  className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
                  placeholder="Enter Scale (0.0 - 1.0)"
                />
              </div>
            ))}

            {/* Buttons to add/remove LoRA fields */}
            <div className="mt-2">
              <button
                type="button"
                onClick={addLoraField}
                className="py-3 px-6 bg-black text-white rounded-lg shadow-md hover:bg-gray-700"
              >
                <FontAwesomeIcon icon={faPlus} /> {/* Add icon */}
              </button>

              {loraUrls.length > 1 && (
                <button
                  type="button"
                  onClick={removeLoraField}
                  className="py-3 px-6 bg-black text-white rounded-lg shadow-md hover:bg-gray-700 ml-2"
                >
                  <FontAwesomeIcon icon={faMinus} /> {/* Remove icon */}
                </button>
              )}
            </div>

          </div>

          {/* Number of Inference Steps */}
          <div>
            <label htmlFor="numInferenceSteps" className="block text-lg font-medium text-gray-700">
              Number of Inference Steps
            </label>
            <input
              type="number"
              id="numInferenceSteps"
              value={numInferenceSteps}
              onChange={(e) => setNumInferenceSteps(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
              min="1"
            />
          </div>

          {/* Guidance Scale */}
          <div>
            <label htmlFor="guidanceScale" className="block text-lg font-medium text-gray-700">
              Guidance Scale
            </label>
            <input
              type="number"
              step="0.1"
              id="guidanceScale"
              value={guidanceScale}
              onChange={(e) => setGuidanceScale(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
            />
          </div>

          {/* Number of Images */}
          <div>
            <label htmlFor="numImages" className="block text-lg font-medium text-gray-700">
              Number of Images
            </label>
            <input
              type="number"
              id="numImages"
              value={numImages}
              onChange={(e) => setNumImages(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
              min="1"
            />
          </div>

          {/* Enable Safety Checker */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableSafetyChecker"
              checked={enableSafetyChecker}
              onChange={(e) => setEnableSafetyChecker(e.target.checked)}
              className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-gray-300"
            />
            <label htmlFor="enableSafetyChecker" className="ml-2 text-lg font-medium text-gray-700">
              NSFW Disabled
            </label>
          </div>

          {/* Strength */}
          <div>
            <label htmlFor="strength" className="block text-lg font-medium text-gray-700">
              Strength
            </label>
            <input
              type="number"
              step="0.1"
              id="strength"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
            />
          </div>

          {/* Output Format */}
          <div>
            <label htmlFor="outputFormat" className="block text-lg font-medium text-gray-700">
              Output Format
            </label>
            <select
              id="outputFormat"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="mt-2 p-3 w-full border border-gray-300 rounded-lg shadow-sm"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>

          {/* Sync Mode */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="syncMode"
              checked={syncMode}
              onChange={(e) => setSyncMode(e.target.checked)}
              className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-gray-300"
            />
            <label htmlFor="syncMode" className="ml-2 text-lg font-medium text-gray-700">
              Sync Mode
            </label>
          </div>

        </form>

        {loading && <p className="text-lg text-gray-700">Generating image...</p>}
        {error && <p className="text-lg text-red-600">{error}</p>}
      </div>

      {/* 图片生成区域 - 扩大显示空间 */}
      <div className="col-span-8 flex items-center justify-center p-4 bg-white shadow-lg">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gray-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">图像生成中...</p>
          </div>
        ) : imageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Generated AI Image"
              className="max-w-full max-h-[75vh] object-contain border border-gray-300 rounded-lg shadow-lg cursor-pointer"
              onClick={handleImageClick}
              onError={() => {
                // 当图片加载失败时，找到对应的图片并删除
                const image = [...visibleImages, ...allImages].find(img => img.imageUrl === imageUrl);
                if (image) {
                  handleImageError(image);
                }
              }}
            />
          </div>
        ) : (
          <p className="text-gray-600">尚未生成图像</p>
        )}
      </div>

      {/* 右侧历史记录区域 - 紧贴右侧，使用固定滚动条 */}
      <div className="col-span-1 bg-gray-100 shadow-lg h-full flex flex-col p-0 overflow-hidden">
        <h2 className="text-center py-2 bg-gray-200 font-bold text-gray-800 border-b border-gray-300">图像历史</h2>
        
        {/* 添加固定高度和强制显示滚动条的容器 */}
        <div className="flex-grow overflow-y-scroll" style={{ scrollbarWidth: 'thin', height: 'calc(100vh - 120px)' }}>
          <div className="grid grid-cols-1 gap-2 p-2">
            {visibleImages.map((image, index) => (
              <div 
                key={index} 
                className="group cursor-pointer border hover:border-gray-500 rounded-md overflow-hidden relative"
                onClick={() => handleHistoryImageClick(image)}
              >
                <div className="aspect-w-1 aspect-h-1 overflow-hidden">
                  <img
                    src={image.imageUrl}
                    alt={`Generated ${index}`}
                    className="object-cover w-full h-full transition duration-300 group-hover:brightness-90"
                    loading="lazy"
                    onError={() => handleImageError(image)}
                  />
                </div>
                <div className="p-1 text-xs truncate bg-gray-800 text-white">
                  {image.userId === userId ? "你的图像" : `用户: ${image.userId.substring(0, 8)}...`}
                </div>
                
                {/* 悬停时显示的删除按钮 */}
                <button
                  className="absolute bottom-8 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-md"
                  onClick={(e) => deleteImage(image.imageName, e)}
                  aria-label="删除图片"
                  title="删除此图片"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              </div>
            ))}
            
            {/* 加载更多的指示器 */}
            {hasMore && (
              <div 
                ref={loadingRef} 
                className="flex justify-center items-center py-4"
              >
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-500"></div>
                ) : (
                  <button 
                    onClick={loadMoreImages}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                  >
                    加载更多
                  </button>
                )}
              </div>
            )}
            
            {/* 如果没有图片，显示提示信息 */}
            {visibleImages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                暂无图片历史记录
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for full-size image */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-auto max-w-full p-4 bg-white rounded-lg shadow-lg overflow-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '95vh' }}
          >
            <button
              className="absolute top-4 right-4 text-gray-700 text-3xl font-bold hover:text-gray-900"
              onClick={handleCloseModal}
            >
              &times;
            </button>

            <div className="flex justify-center items-center">
              <img
                src={imageUrl}
                alt="Full-size Generated AI Image"
                className="w-auto h-auto"
                style={{ maxWidth: '100%', maxHeight: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 错误弹窗 */}
      {errorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={handleCloseErrorModal}
        >
          <div
            className="relative w-auto max-w-lg p-6 bg-white rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-700 text-3xl font-bold hover:text-gray-900"
              onClick={handleCloseErrorModal}
            >
              &times;
            </button>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">错误</h3>
              <p className="text-gray-700 text-center">{errorModalMessage}</p>
              <button
                className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={handleCloseErrorModal}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 免责声明弹窗 */}
      {isDisclaimerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={handleCloseDisclaimerModal}
        >
          <div
            className="relative w-auto max-w-lg p-6 bg-white rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-700 text-3xl font-bold hover:text-gray-900"
              onClick={handleCloseDisclaimerModal}
            >
              &times;
            </button>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">免责声明</h3>
              <div className="text-gray-700 text-center mb-4 max-h-60 overflow-y-auto p-4 bg-gray-50 rounded-lg w-full">
                <p className="mb-3">尊敬的用户，在继续使用本服务前，请您知悉并同意以下条款：</p>
                <ol className="list-decimal pl-5 text-left space-y-2">
                  <li>本服务为防止用户滥用，限制了用户每天的生成次数，每个IP每10分钟只能生成5张图片，请用户自觉遵守。</li>
                  <li>本服务生成的所有图像内容均由AI自动创建，不代表本平台及其运营者的观点或立场。</li>
                  <li>用户应自觉遵守中华人民共和国相关法律法规，不得利用本服务生成、传播违法违规内容。</li>
                  <li>用户对使用本服务生成的内容承担全部责任，包括但不限于内容的合法性、道德性及后果。</li>
                  <li>本平台不对AI生成内容的准确性、适用性、合法性提供任何形式的保证。</li>
                  <li>用户应尊重他人知识产权，不得利用本服务侵犯他人合法权益。</li>
                  <li>本平台保留在不通知的情况下修改服务条款、暂停或终止服务的权利。</li>
                </ol>
                <p className="mt-3 font-semibold">本服务仅供学习交流使用，请勿用于商业或其他用途。</p>
              </div>
              <div className="flex space-x-4">
                <button
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  onClick={handleCloseDisclaimerModal}
                >
                  不同意并取消
                </button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={handleAcceptDisclaimer}
                >
                  同意并继续
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 速率限制弹窗 */}
      {isRateLimitModalOpen && rateLimitInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={handleCloseRateLimitModal}
        >
          <div
            className="relative w-auto max-w-lg p-6 bg-white rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-700 text-3xl font-bold hover:text-gray-900"
              onClick={handleCloseRateLimitModal}
            >
              &times;
            </button>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">请求频率限制</h3>
              <p className="text-gray-700 text-center mb-2">
                您的IP地址已达到图片生成频率限制。
              </p>
              <div className="text-gray-700 bg-gray-100 p-3 rounded-lg w-full mb-3">
                <div className="flex justify-between mb-1">
                  <span>限制:</span>
                  <span>{rateLimitInfo.limit} 张图片 / 10分钟</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>剩余次数:</span>
                  <span className={rateLimitInfo.remaining === 0 ? "text-red-600 font-bold" : ""}>
                    {rateLimitInfo.remaining}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>重置时间:</span>
                  <span>{rateLimitInfo.resetTimeFormatted}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic text-center">
                您可以继续浏览和查看已生成的图片，但暂时无法生成新图片。
              </p>
              <button
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={handleCloseRateLimitModal}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
