"use client"

import { aboutContent, missionStatement, values } from '@/components/mockData/aboutContent';
import Image from 'next/image';
import { CheckCircle, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef } from 'react';

const About = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayPause = async () => {
    if (videoRef.current && !isLoading) {
      setIsLoading(true);
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          await videoRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.log("Video play/pause error:", error);
        // Reset state if there's an error
        setIsPlaying(videoRef.current ? !videoRef.current.paused : false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoLoad = async () => {
    // Auto-play when video is loaded
    if (videoRef.current && !isLoading) {
      setIsLoading(true);
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.log("Auto-play prevented by browser:", error);
        // Auto-play was prevented, user interaction required
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setIsLoading(false);
  };
  return (
    <div className="bg-white font-sans">
      {/* Hero Section */}
      {/* <section className="relative bg-gray-50 py-16 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-[#3a75c4] mb-6">
              Our B Too C Story
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Preserving centuries-old traditions while supporting artisan communities 
              and bringing authentic handcrafted textiles to your home.
            </p>
          </div>
        </div>
      </section> */}

      {/* Mission Statement */}
      <section className="relative min-h-64 py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0">
          {missionStatement.image && (
            <>
              <Image
                src={missionStatement.image}
                alt={missionStatement.title}
                fill
                sizes="100vw"
                className="object-cover grayscale"
                priority
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </>
          )}
        </div>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-3 sm:mb-6 ${missionStatement.image ? 'text-white' : 'text-gray-900'}`}>{missionStatement.title}</h2>
          <p className={`text-sm sm:text-base lg:text-lg font-medium leading-relaxed ${missionStatement.image ? 'text-white/90' : 'text-gray-700'}`}>
            {missionStatement.content}
          </p>
        </div>
      </section>

      {/* Video Content Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-slate-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Our Story in Motion</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">
              Discover the passion, craftsmanship, and dedication that drives our mission to bring
              authentic handcrafted textiles from traditional artisans to your home.
            </p>
          </div>
          
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black group transform hover:scale-[1.02] transition-transform duration-500">
            <video
              ref={videoRef}
              className="w-full h-auto max-h-120 object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out"
              muted
              loop
              playsInline
              preload="metadata"
              onLoadedData={handleVideoLoad}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onError={(e) => {
                // Fallback if poster image doesn't exist
                const video = e.target as HTMLVideoElement;
                video.poster = "";
                setIsLoading(false);
              }}
            >
              <source src="/assets/videos/About1.mp4" type="video/mp4" />
              <p className="text-white p-8 text-center">
                Your browser does not support the video tag. 
                <a href="/assets/videos/About1.mp4" className="text-gray-400 underline ml-2">
                  Download the video instead
                </a>
              </p>
            </video>
            
            {/* Video Overlay for Enhanced Visual Effect */}
            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-black/10 pointer-events-none group-hover:opacity-50 transition-opacity duration-700"></div>
            
            {/* Custom Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                disabled={isLoading}
                className={`w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300 hover:scale-110 group/btn ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isLoading ? (
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <Pause className="w-8 h-8 text-white group-hover/btn:scale-110 transition-transform" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1 group-hover/btn:scale-110 transition-transform" />
                )}
              </button>
            </div>
            
            {/* Video Quality Badge */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
              HD Quality
            </div>
            
            {/* Video Status Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-gray-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-white text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
            
            {/* Volume Control */}
            <div className="absolute bottom-4 right-4">
              <button
                onClick={toggleMute}
                className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-all duration-300"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
          
        </div>
      </section>

      {/* Story Sections */}
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {aboutContent.map((section, index) => (
            <div key={index} className={`mb-10 sm:mb-12 lg:mb-16 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''} lg:flex lg:items-center lg:gap-12`}>
              <div className="lg:w-1/2 mb-6 lg:mb-0">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">{section.title}</h3>
                <p className="text-gray-700 font-medium leading-relaxed text-sm sm:text-base lg:text-lg">
                  {section.content}
                </p>
              </div>
              {section.image && (
                <div className="lg:w-1/2">
                  <div className="relative h-52 sm:h-64 lg:h-105 rounded-lg overflow-hidden shadow-lg">
                    <Image
                      src={section.image}
                      alt={section.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover grayscale hover:grayscale-0 transition-all duration-700 ease-in-out"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Values Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Our Values</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do, from selecting artisan partners
              to delivering exceptional products to your doorstep.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center p-4 sm:p-5 lg:p-6 rounded-lg bg-gray-50 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">{value.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {/* <section className="py-8 bg-white">
        <div className="max-w-7xl bg-gray-800 p-5 mx-auto px-4 sm:px-6 lg:px-8 text-center rounded-full">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Our B Too C Journey
          </h2>
          <p className="text-xl text-gray-100 mb-8">
            Every purchase supports traditional artisans and helps preserve cultural heritage for future generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="bg-white text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              Shop Our Collection
            </a>
            <a
              href="/products"
              className="border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-gray-800 transition-colors font-semibold"
            >
              Meet Our Artisans
            </a>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default About;
