import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Track Your Mood',
    description: 'Easily log your emotions and keep a record of how you feel each day.',
    image: require('../assets/Artboard 1.png'),
  },
  {
    id: 2,
    title: 'Personalized Tasks',
    description: 'Get activity suggestions tailored to your current mood.',
    image: require('../assets/Artboard 2.png'),
  },
  {
    id: 3,
    title: 'Improve Your Day',
    description: 'Use insights and self-care tips to boost your well-being.',
    image: require('../assets/Artboard 3.png'),
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Home'); // ✅ Go to Home after last page
    }
  };

  const handleSkip = () => {
    navigation.replace('Home'); // ✅ Skip onboarding
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Image */}
      <Image 
        source={onboardingData[currentIndex].image} 
        style={styles.backgroundImage} 
        resizeMode="cover" 
      />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        {/* Text Content at Bottom */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{onboardingData[currentIndex].title}</Text>
          <Text style={styles.description}>{onboardingData[currentIndex].description}</Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentIndex < onboardingData.length - 1 ? (
            <>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
    top: 0,
    left: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay for better text readability
  },
  contentContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#fff',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  getStartedButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});