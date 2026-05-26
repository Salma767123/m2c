import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ScrollView, useWindowDimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { bannerService, BannerImage } from '@/services/bannerService';

const IMAGE_ASPECT_RATIO = 2872 / 1152;
const BANNER_MARGIN = 12;   // side gap so the banner is inset (Flipkart-style)
const BANNER_RADIUS = 16;

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

export default function HeroSection() {
  const { width } = useWindowDimensions();
  const bannerWidth = width - BANNER_MARGIN * 2;
  const bannerHeight = bannerWidth / IMAGE_ASPECT_RATIO;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides);
  const scrollViewRef = useRef<ScrollView>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const SLIDE_DURATION = 5000;

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

  // Auto-play — the progress bar fills over SLIDE_DURATION, then advances.
  // Restarts whenever the slide changes so the bar stays in sync.
  useEffect(() => {
    progress.setValue(0);

    if (!isAutoPlaying || slides.length <= 1) {
      // Paused → show the current segment as fully filled.
      progress.setValue(1);
      return;
    }

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: false, // animating width % — must be JS-driven
    });
    anim.start(({ finished }) => {
      if (finished) {
        setCurrentSlide((prev) => {
          const nextIndex = (prev + 1) % slides.length;
          scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
          return nextIndex;
        });
      }
    });

    return () => anim.stop();
  }, [currentSlide, isAutoPlaying, slides.length, width, progress]);

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
    <View style={{ paddingTop: 12, paddingBottom: 6 }}>
      {/* Banner carousel — each page is full-width, the image inside is inset & rounded */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={{ width, alignItems: 'center' }}>
            <View
              style={{
                width: bannerWidth,
                height: bannerHeight,
                borderRadius: BANNER_RADIUS,
                overflow: 'hidden',
                backgroundColor: '#e5e7eb',
              }}
            >
              <Image
                source={slide.uri ? { uri: slide.uri } : slide.source}
                style={{ width: bannerWidth, height: bannerHeight }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={slide.altText}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination — animated stories-style progress bar */}
      {hasMultipleSlides ? (
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              width: Math.min(bannerWidth * 0.2, 72),
              gap: 3,
            }}
          >
            {slides.map((slide, index) => {
              const isPast = index < currentSlide;
              const isCurrent = index === currentSlide;
              return (
                <Pressable
                  key={slide.id}
                  onPress={() => goToSlide(index)}
                  accessibilityLabel={`Go to slide ${index + 1}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  hitSlop={10}
                  style={{ flex: 1 }}
                >
                  {/* Track segment */}
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: '#d8dade',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fill — past = full, current = animated, future = none */}
                    {isPast ? (
                      <View style={{ flex: 1, backgroundColor: '#111827' }} />
                    ) : isCurrent ? (
                      <Animated.View
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          backgroundColor: '#111827',
                          width: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
