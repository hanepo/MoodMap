import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const onboardingData = [
  {
    id: 1,
    title: 'Track Your Mood',
    description: 'Easily log your emotions and keep a record of how you feel each day.',
    //image: require('../../assets/onboarding1.png'),
  },
  {
    id: 2,
    title: 'Personalized Tasks',
    description: 'Get activity suggestions tailored to your current mood.',
    //image: require('../../assets/onboarding2.png'),
  },
  {
    id: 3,
    title: 'Improve Your Day',
    description: 'Use insights and self-care tips to boost your well-being.',
    //image: require('../../assets/onboarding3.png'),
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
      {/* Image */}
      <Image source={onboardingData[currentIndex].image} style={styles.image} resizeMode="contain" />

      {/* Title & Description */}
      <Text style={styles.title}>{onboardingData[currentIndex].title}</Text>
      <Text style={styles.description}>{onboardingData[currentIndex].description}</Text>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentIndex < onboardingData.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '80%',
    height: 250,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    paddingHorizontal: 20,
    marginBottom: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  skipText: {
    fontSize: 16,
    color: '#888',
    paddingVertical: 10,
  },
  nextButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
