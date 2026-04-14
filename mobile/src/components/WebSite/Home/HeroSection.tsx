import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { bannerService, BannerImage } from '@/services/bannerService';

const IMAGE_ASPECT_RATIO = 2872 / 1152;

type Slide = {
  id: string | number;
  uri?: string;
  source?: number;
  altText?: string;
};

const fallbackSlides: Slide[] = [
  { id: 1, source: require('../../../../assets/images/hero/hs1.webp'), altText: 'Hero slide 1' },
  { id: 2, source: require('../../../../assets/images/hero/hs2.webp'), altText: 'Hero slide 2' },
  { id: 3, source: require('../../../../assets/images/hero/hs3.webp'), altText: 'Hero slide 3' },
  { id: 4, source: require('../../../../assets/images/hero/hs4.webp'), altText: 'Hero slide 4' },
];

const pressableOpacity = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.8 : 1,
});

export default function HeroSection() {
  const { width } = useWindowDimensions();
  const imageHeight = width / IMAGE_ASPECT_RATIO;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch dynamic banners on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      try {
        const response = await bannerService.getActiveBanners();
        if (isMounted && response.success && Array.isArray(response.data) && response.data.length > 0) {
          const dynamicSlides: Slide[] = response.data.map((banner: BannerImage) => ({
            id: banner.id,
            uri: banner.imageUrl,
            altText: banner.altText,
          }));
          setSlides(dynamicSlides);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };
    fetchBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextIndex = (prev + 1) % slides.length;
        scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length, width]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide(index);
      scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
      setIsAutoPlaying(false);
    },
    [width],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: any) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      if (index !== currentSlide) {
        setCurrentSlide(index);
      }
    },
    [currentSlide, width],
  );

  if (slides.length === 0) return null;

  const hasMultipleSlides = slides.length > 1;

  return (
    <View className="relative bg-white">
      <View style={{ height: imageHeight }} className="overflow-hidden">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          {slides.map((slide) => (
            <View key={slide.id} style={{ width }}>
              <Image
                source={slide.uri ? { uri: slide.uri } : slide.source}
                style={{ width, height: imageHeight }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={slide.altText}
              />
            </View>
          ))}
        </ScrollView>

        {hasMultipleSlides ? (
          <View className="absolute bottom-3 left-0 right-0 flex-row justify-center">
            {slides.map((slide, index) => (
              <Pressable
                key={slide.id}
                onPress={() => goToSlide(index)}
                accessibilityLabel={`Go to slide ${index + 1}`}
                accessibilityRole="button"
                hitSlop={10}
                style={pressableOpacity}
              >
                <View
                  className={`h-2 rounded-full mx-1 ${
                    index === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/60'
                  }`}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
