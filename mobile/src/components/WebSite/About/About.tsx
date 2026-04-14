import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';

interface AboutSection {
  title: string;
  content: string;
  image?: any;
}

const aboutContent: AboutSection[] = [
  {
    title: 'Our Journey of Handcrafted Story',
    content:
      'For centuries, the art of textile making has been woven into the very fabric of our culture. What began in humble homes with simple looms has evolved into a rich tradition that connects us to our ancestors. Every thread tells a story of dedication, skill, and the timeless beauty of handcrafted goods.',
    image: require('../../../../assets/images/about/a6.jpg'),
  },
  {
    title: 'The Traditional Craft',
    content:
      'In the early morning hours, when the world is still quiet, our artisans begin their work. Using techniques passed down through generations, they transform simple cotton and linen into beautiful, functional pieces. The rhythmic sound of the loom, the careful selection of threads, and the patient process of weaving create textiles that are not just products, but pieces of living history.',
    image: require('../../../../assets/images/about/a2.jpg'),
  },
  {
    title: 'Home-Made Excellence',
    content:
      "Our marketplace celebrates the beauty of home-made products. Each towel, apron, and textile piece is crafted in small workshops and family homes where quality takes precedence over quantity. These aren't mass-produced items – they're lovingly made pieces that carry the warmth and care of human hands.",
    image: require('../../../../assets/images/about/a3.png'),
  },
  {
    title: 'Preserving Tradition',
    content:
      'In a world of fast fashion and machine production, we stand as guardians of traditional textile arts. Our vendors are not just suppliers – they are keepers of ancient knowledge, master craftspeople who ensure that the skills of their ancestors continue to flourish in the modern world.',
    image: require('../../../../assets/images/about/a4.jpg'),
  },
  {
    title: 'The Future of Handcraft',
    content:
      'While we honor our past, we also embrace the future. Our artisans are incorporating sustainable materials and eco-friendly practices into their traditional methods. This fusion of old wisdom and new consciousness creates textiles that are not only beautiful and functional but also kind to our planet.',
    image: require('../../../../assets/images/about/a5.jpg'),
  },
];

const missionStatement = {
  title: 'Our Mission',
  content:
    'To connect conscious consumers with authentic, handcrafted textiles while supporting traditional artisans and preserving cultural heritage. We believe that every purchase should tell a story, support a family, and contribute to keeping ancient crafts alive for future generations.',
  image: require('../../../../assets/images/about/a8.webp'),
};

const values = [
  {
    title: 'Authenticity',
    description: 'Every product is genuinely handcrafted using traditional methods',
  },
  {
    title: 'Quality',
    description: 'We maintain the highest standards in materials and craftsmanship',
  },
  {
    title: 'Sustainability',
    description: 'Supporting eco-friendly practices and sustainable livelihoods',
  },
  {
    title: 'Heritage',
    description: 'Preserving and celebrating traditional textile arts',
  },
  {
    title: 'Community',
    description: 'Building connections between artisans and conscious consumers',
  },
];

const styles = StyleSheet.create({
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  missionImageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  missionImage: {
    width: '100%',
    height: '100%',
  },
  missionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
});

export default function About() {
  const videoRef = useRef<Video>(null);
  const { width } = useWindowDimensions();
  const videoWidth = width - 48;
  const videoHeight = videoWidth * 0.5625;

  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.playAsync();
        } catch (error) {
          console.log('Auto-play error:', error);
        }
      }
    };
    playVideo();
  }, []);

  return (
    <View className="bg-white">
      {/* Mission Statement */}
      <View className="relative bg-gray-900 px-6 py-12">
        {missionStatement.image ? (
          <View style={styles.missionImageWrapper}>
            <Image
              source={missionStatement.image}
              style={styles.missionImage}
              contentFit="cover"
            />
            <View style={styles.missionOverlay} pointerEvents="none" />
          </View>
        ) : null}
        <View className="relative" style={{ zIndex: 2 }}>
          <Text className="text-3xl font-bold text-white mb-4 text-center">
            {missionStatement.title}
          </Text>
          <Text className="text-base text-white/90 leading-7 text-center">
            {missionStatement.content}
          </Text>
        </View>
      </View>

      {/* Video Section */}
      <View className="bg-gray-50 px-6 py-10">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
            Our Story in Motion
          </Text>
          <Text className="text-sm text-gray-600 text-center leading-6">
            Discover the passion, craftsmanship, and dedication that drives our mission to bring
            authentic handcrafted textiles from traditional artisans to your home.
          </Text>
        </View>

        <View className="items-center">
          <View
            style={{
              width: videoWidth,
              height: videoHeight,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: '#000',
            }}
          >
            <Video
              ref={videoRef}
              source={require('../../../../assets/videos/About1.mp4')}
              style={{ width: videoWidth, height: videoHeight }}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted
              shouldPlay
              useNativeControls={false}
            />
          </View>
        </View>
      </View>

      {/* Story Sections */}
      <View className="px-6 py-8">
        {aboutContent.map((section, index) => (
          <View key={index} className="mb-10">
            <Text className="text-xl font-bold text-gray-900 mb-3">{section.title}</Text>
            <Text className="text-gray-700 leading-7 text-base mb-5">{section.content}</Text>
            {section.image ? (
              <View
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 220,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={section.image}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.imageOverlay} pointerEvents="none" />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Values Section */}
      <View className="bg-gray-100 px-6 py-10">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">Our Values</Text>
          <Text className="text-sm text-gray-600 text-center leading-6">
            These core principles guide everything we do, from selecting artisan partners to
            delivering exceptional products to your doorstep.
          </Text>
        </View>

        <View>
          {values.map((value, index) => (
            <View
              key={index}
              className="bg-white rounded-2xl p-5 mb-3 border border-gray-200"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <View className="flex-row items-start">
                <View className="w-11 h-11 bg-gray-800 rounded-full items-center justify-center mr-3">
                  <CheckCircle size={22} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 mb-1">{value.title}</Text>
                  <Text className="text-sm text-gray-600 leading-5">{value.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
