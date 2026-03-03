import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Hero slides data
const heroSlides = [
  {
    id: 1,
    image: require('../../../../assets/images/hero/hs1.webp'),
  },
  {
    id: 2,
    image: require('../../../../assets/images/hero/hs2.webp'),
  },
  {
    id: 3,
    image: require('../../../../assets/images/hero/hs3.webp'),
  },
  {
    id: 4,
    image: require('../../../../assets/images/hero/hs4.webp'),
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % heroSlides.length;
        scrollViewRef.current?.scrollTo({
          x: nextSlide * width,
          animated: true,
        });
        return nextSlide;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    const nextIndex = (currentSlide + 1) % heroSlides.length;
    setCurrentSlide(nextIndex);
    scrollViewRef.current?.scrollTo({
      x: nextIndex * width,
      animated: true,
    });
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    const prevIndex = (currentSlide - 1 + heroSlides.length) % heroSlides.length;
    setCurrentSlide(prevIndex);
    scrollViewRef.current?.scrollTo({
      x: prevIndex * width,
      animated: true,
    });
    setIsAutoPlaying(false);
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== currentSlide) {
      setCurrentSlide(index);
    }
  };

  return (
    <View className="relative bg-white">
      <View className="h-64 overflow-hidden">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScroll}
        >
          {heroSlides.map((slide) => (
            <View key={slide.id} style={{ width }} className="relative">
              <Image
                source={slide.image}
                style={{ width, height: 256 }}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Navigation Arrows */}
        <TouchableOpacity
          onPress={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-2 shadow-lg"
          activeOpacity={0.8}
        >
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-2 shadow-lg"
          activeOpacity={0.8}
        >
          <ChevronRight size={20} color="#374151" />
        </TouchableOpacity>

        {/* Slide Indicators */}
        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
          {heroSlides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentSlide(index);
                scrollViewRef.current?.scrollTo({
                  x: index * width,
                  animated: true,
                });
                setIsAutoPlaying(false);
              }}
              activeOpacity={0.8}
            >
              <View
                className={`h-2 rounded-full mx-1 ${
                  index === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white bg-opacity-60'
                }`}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
