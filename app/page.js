"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';

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
          
          // 显示最新的图像
          setImageUrl(`/outputs/${data.images[0].imageName}`);
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

  const generateImage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch("/api/generateImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_size: imageSize,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
          num_images: numImages,
          enable_safety_checker: enableSafetyChecker,
          strength,
          output_format: outputFormat,
          sync_mode: syncMode,
          model, // Pass the selected model to the backend
          userId, // 添加用户ID
          loras: loraUrls
            .filter(lora => lora.url.trim() !== "") // Filter out any LoRAs with empty URLs
            .map(lora => ({ path: lora.url, scale: lora.scale })),
        }),
      });

      const data = await response.json();
      console.log("API Response:", data); // Log the full response from the API

      if (response.ok) {
        if (data.imageUrl) {
          setImageUrl(data.imageUrl); // Display the image from the local /outputs directory
          // 刷新图像历史
          fetchImageHistory(userId);
        } else {
          throw new Error("No image URL found in the response.");
        }
      } else {
        setError(`Failed to generate image: ${data.message}`);
      }
    } catch (err) {
      console.error("Error occurred:", err.message);
      setError(`Error: ${err.message}`); // This will show more useful information in case something breaks.
    } finally {
      setLoading(false);
    }
  };

  // 点击历史记录中的图像
  const handleHistoryImageClick = (image) => {
    setImageUrl(`/outputs/${image.imageName}`);
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

  return (
    <div className="grid grid-cols-12 gap-4 h-screen p-4 bg-[#C1EEFF]">
      {/* 顶部用户信息栏 */}
      <div className="col-span-12 bg-gray-800 text-white p-3 rounded-lg flex justify-between items-center mb-1">
        <div className="flex items-center space-x-2">
          <span className="font-bold">用户ID:</span>
          <span className="bg-gray-700 px-3 py-1 rounded">{userId}</span>
          {isAdmin && <span className="bg-red-600 px-3 py-1 rounded ml-2">管理员</span>}
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
                className="cursor-pointer border hover:border-gray-500"
                onClick={() => handleHistoryImageClick(image)}
              >
                <div className="aspect-w-1 aspect-h-1 overflow-hidden">
                  <img
                    src={`/outputs/${image.imageName}`}
                    alt={`Generated ${index}`}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                </div>
                <div className="p-1 text-xs truncate bg-gray-800 text-white">
                  {image.userId === userId ? "你的图像" : `用户: ${image.userId.substring(0, 8)}...`}
                </div>
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
    </div>
  );
}
