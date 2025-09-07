"use client";

import { useState, useEffect, useRef } from "react";
import Video from "next-video";

interface VideoBackgroundProps {
  src: any;
  className?: string;
  style?: React.CSSProperties;
}

export default function VideoBackground({
  src,
  className = "",
  style = {},
}: VideoBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  // Page Visibility API to detect when tab becomes active/inactive
  useEffect(() => {
    const findAndControlVideo = (action: "play" | "pause") => {
      if (containerRef.current) {
        const videoElement = containerRef.current.querySelector("video");
        if (videoElement) {
          if (action === "play") {
            videoElement.play().catch(() => {
              // Handle play error silently
            });
          } else {
            videoElement.pause();
          }
        }
      }
    };

    const handleVisibilityChange = () => {
      const isPageVisible = !document.hidden;
      setIsVisible(isPageVisible);

      if (isPageVisible) {
        findAndControlVideo("play");
      } else {
        findAndControlVideo("pause");
      }
    };

    const handleFocus = () => {
      if (!document.hidden) {
        setIsVisible(true);
        findAndControlVideo("play");
      }
    };

    const handleBlur = () => {
      setIsVisible(false);
      findAndControlVideo("pause");
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full bg-black overflow-hidden"
    >
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black"></div>
      )}

      {/* Paused indicator - subtle overlay when tab is inactive */}
      {isLoaded && !isVisible && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      <Video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        preload="auto"
        className={`transition-opacity duration-1000 filter grayscale ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          minWidth: '100vw',
          minHeight: '100vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'cover',
          backgroundColor: "black",
          zIndex: -1,
          ...style,
        }}
        onLoadedData={() => {
          setIsLoaded(true);
        }}
        onCanPlayThrough={() => {
          setIsLoaded(true);
        }}
      />
    </div>
  );
}