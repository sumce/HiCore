import React, { useState, useRef, useEffect } from 'react';
import { STATIC_BASE_URL } from '../constants';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageViewerProps {
  image: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ image }) => {
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset view when image changes
  useEffect(() => {
    if (image !== currentImage) {
      setIsLoaded(false);
      setCurrentImage(image);
      setScale(0.8);
      setPosition({ x: 0, y: 0 });
    }
  }, [image, currentImage]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  if (!image) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 text-gray-400 select-none">
        <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-gray-800 rounded-full">
              <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium">暂无图片数据</span>
        </div>
      </div>
    );
  }

  // Improved Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const zoomIntensity = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(Math.max(0.1, scale + direction * zoomIntensity), 8);
    
    setScale(newScale);
  };

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const currentSrc = `${STATIC_BASE_URL}${image}`;

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full bg-[#1a1a1a] overflow-hidden select-none cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 加载动画 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 z-10">
          <div className="flex gap-3 text-5xl font-bold tracking-widest">
            {['U', 'N', 'S', 'I', 'A', 'O'].map((letter, i) => (
              <span
                key={i}
                className="text-blue-500 animate-pulse"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.2s'
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="mt-6 text-gray-500 text-sm tracking-wide">图片加载中</p>
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center">
        <img 
          src={currentSrc} 
          alt="Task Document" 
          draggable={false}
          onLoad={handleImageLoad}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(90deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: 'none',
            maxHeight: 'none',
            opacity: isLoaded ? 1 : 0,
          }}
          className="shadow-2xl ring-1 ring-white/10 transition-opacity duration-300"
        />
      </div>

      {/* Helper Text for Zoom */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/40 text-white/60 px-3 py-1 rounded-full text-xs pointer-events-none backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
        滚轮缩放 • 拖拽移动
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-32 right-4 flex flex-col gap-2 z-20">
        <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="p-2 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-colors backdrop-blur"><ZoomIn size={20}/></button>
        <button onClick={() => { setScale(0.8); setPosition({x:0, y:0}); }} className="p-2 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-colors backdrop-blur"><Move size={20}/></button>
        <button onClick={() => setScale(s => Math.max(0.1, s - 0.5))} className="p-2 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-colors backdrop-blur"><ZoomOut size={20}/></button>
      </div>
    </div>
  );
};
