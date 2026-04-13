import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';

interface AboutSection {
  title: string;
  content: string;
  image?: any;
}

const aboutContent: AboutSection[] = [
  {
    title: "Our Journey of Handcrafted Story",
    content: "For centuries, the art of textile making has been woven into the very fabric of our culture. What began in humble homes with simple looms has evolved into a rich tradition that connects us to our ancestors. Every thread tells a story of dedication, skill, and the timeless beauty of handcrafted goods.",
    image: require('../../../../assets/images/about/a6.jpg'),
  },
  {
    title: "The Traditional Craft",
    content: "In the early morning hours, when the world is still quiet, our artisans begin their work. Using techniques passed down through generations, they transform simple cotton and linen into beautiful, functional pieces. The rhythmic sound of the loom, the careful selection of threads, and the patient process of weaving create textiles that are not just products, but pieces of living history.",
    image: require('../../../../assets/images/about/a2.jpg'),
  },
  {
    title: "Home-Made Excellence",
    content: "Our marketplace celebrates the beauty of home-made products. Each towel, apron, and textile piece is crafted in small workshops and family homes where quality takes precedence over quantity. These aren't mass-produced items – they're lovingly made pieces that carry the warmth and care of human hands.",
    image: require('../../../../assets/images/about/a3.png'),
  },
  {
    title: "Preserving Tradition",
    content: "In a world of fast fashion and machine production, we stand as guardians of traditional textile arts. Our vendors are not just suppliers – they are keepers of ancient knowledge, master craftspeople who ensure that the skills of their ancestors continue to flourish in the modern world.",
    image: require('../../../../assets/images/about/a4.jpg'),
  },
  {
    title: "The Future of Handcraft",
    content: "While we honor our past, we also embrace the future. Our artisans are incorporating sustainable materials and eco-friendly practices into their traditional methods. This fusion of old wisdom and new consciousness creates textiles that are not only beautiful and functional but also kind to our planet.",
    image: require('../../../../assets/images/about/a5.jpg'),
  },
];

  const router = useRouter();

const missionStatement = {
  title: "Our Mission",
  content: "To connect conscious consumers with authentic, handcrafted textiles while supporting traditional artisans and preserving cultural heritage. We believe that every purchase should tell a story, support a family, and contribute to keeping ancient crafts alive for future generations.",
  image: require('../../../../assets/images/about/a8.webp'),
};

const values = [
  {
    title: "Authenticity",
    description: "Every product is genuinely handcrafted using traditional methods",
  },
  {
    title: "Quality",
    description: "We maintain the highest standards in materials and craftsmanship",
  },
  {
    title: "Sustainability",
    description: "Supporting eco-friendly practices and sustainable livelihoods",
  },
  {
    title: "Heritage",
    description: "Preserving and celebrating traditional textile arts",
  },
  {
    title: "Community",
    description: "Building connections between artisans and conscious consumers",
  },
];

const { width } = Dimensions.get('window');
const videoWidth = width - 48;
const videoHeight = videoWidth * 0.5625;

const styles = StyleSheet.create({
  videoWrapper: {
    width: videoWidth,
    height: videoHeight,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: videoWidth,
    height: videoHeight,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 256,
    borderRadius: 16,
    overflow: 'hidden',
  },
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
  const videoSource = require('../../../../assets/videos/About1.mp4');
  
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <>
          {/* Header */}
      <View className="bg-black px-4 py-6 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">About Us</Text>
          </View>
        </View>
      </View>
      
    <ScrollView className="flex-1 bg-white">
      {/* Mission Statement */}
      <View className="relative bg-gray-900 px-6 py-12">
        {missionStatement.image && (
          <View style={styles.missionImageWrapper}>
            <Image
              source={missionStatement.image}
              style={styles.missionImage}
              resizeMode="cover"
            />
            <View style={styles.missionOverlay} pointerEvents="none" />
          </View>
        )}
        <View className="relative" style={{ zIndex: 2 }}>
          <Text className="text-3xl font-bold text-white mb-6 text-center">
            {missionStatement.title}
          </Text>
          <Text className="text-base text-white/90 leading-7 text-center">
            {missionStatement.content}
          </Text>
        </View>
      </View>

      {/* Video Section */}
      <View className="bg-gray-50 px-6 py-12">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Our Story in Motion
          </Text>
          <Text className="text-base text-gray-600 text-center leading-6">
            Discover the passion, craftsmanship, and dedication that drives our mission to bring
            authentic handcrafted textiles from traditional artisans to your home.
          </Text>
        </View>

        <View className="items-center">
          <View style={styles.videoWrapper}>
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              nativeControls={false}
              contentFit="cover"
            />
            <View style={styles.overlayContainer} pointerEvents="none">
              <View style={styles.overlay} />
            </View>
          </View>
        </View>
      </View>
      {/* Story Sections */}
      <View className="px-6 py-8">
        {aboutContent.map((section, index) => (
          <View key={index} className="mb-12">
            <Text className="text-2xl font-bold text-gray-900 mb-4">{section.title}</Text>
            <Text className="text-gray-700 leading-7 text-base mb-6">{section.content}</Text>
            {section.image && (
              <View style={styles.imageWrapper}>
                <Image
                  source={section.image}
                  style={styles.missionImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay} pointerEvents="none" />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Values Section */}
      <View className="bg-gray-100 px-6 py-12">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">Our Values</Text>
          <Text className="text-base text-gray-600 text-center leading-6">
            These core principles guide everything we do, from selecting artisan partners to
            delivering exceptional products to your doorstep.
          </Text>
        </View>

        <View className="space-y-6 gap-2">
          {values.map((value, index) => (
            <View
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
            >
              <View className="flex-row items-start">
                <View className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center mr-4">
                  <CheckCircle size={24} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 mb-2">{value.title}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

    
    </ScrollView>
    </>
  );
}
