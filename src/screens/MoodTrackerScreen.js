import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  StatusBar
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { MoodService } from '../services/MoodService';
import SentimentService from '../services/SentimentService';

const moodLabels = {
  1: 'Terrible',
  2: 'Very Bad',
  3: 'Bad',
  4: 'Poor',
  5: 'Okay',
  6: 'Good',
  7: 'Very Good',
  8: 'Great',
  9: 'Amazing',
  10: 'Perfect'
};

const moodBackgrounds = {
  1: '#8B2635',
  2: '#A73647',
  3: '#C44569',
  4: '#E55A4E',
  5: '#F79256',
  6: '#F7DC6F',
  7: '#82E6A8',
  8: '#52C4B0',
  9: '#4834D4',
  10: '#686DE0'
};

export default function MoodTrackerScreen({ navigation }) {
  const { state, dispatch } = useApp();
  const [mood, setMood] = useState(null); // Start as null
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingText, setAnalyzingText] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [inputMethod, setInputMethod] = useState(null); // 'slider' or 'text'
  const sliderRef = useRef(null);

  const handleMoodChange = (value) => {
    const roundedValue = Math.round(value);
    setMood(roundedValue);
    setInputMethod('slider');
  };

  const handleTextChange = (text) => {
    setDescription(text);
    // If user types and had used slider, suggest they analyze text instead
    if (text.length > 0 && inputMethod === 'slider') {
      setInputMethod('text');
      setMood(null); // Reset mood when switching to text input
    }
  };

  const handleAnalyzeText = async () => {
    if (!description.trim()) {
      Alert.alert('No Text', 'Please describe how you\'re feeling first');
      return;
    }

    setAnalyzingText(true);
    
    try {
      const result = await SentimentService.analyzeSentiment(description);
      
      setMood(result.mood_value);
      setInputMethod('text');
      
      Alert.alert(
        'Mood Analyzed',
        `Based on your text, you seem to be feeling: ${result.mood_label} (${result.mood_value}/10)\n\nYou can adjust the slider if needed.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        'Could not connect to sentiment analysis service. Please use the slider to rate your mood instead.',
        [{ text: 'OK' }]
      );
    } finally {
      setAnalyzingText(false);
    }
  };

  const getEyeStyle = () => {
    if (!mood) return { width: 22, height: 22, borderRadius: 11 };
    
    if (mood <= 3) {
      return { width: 20, height: 15, borderRadius: 10 };
    } else if (mood >= 8) {
      return { width: 25, height: 8, borderRadius: 15 };
    }
    return { width: 22, height: 22, borderRadius: 11 };
  };

  const getMouthStyle = () => {
    if (!mood) return {
      width: 40,
      height: 3,
      backgroundColor: 'white',
      marginTop: 10,
      borderRadius: 2
    };

    if (mood <= 3) {
      return {
        width: 60,
        height: 30,
        borderTopWidth: 4,
        borderTopColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundColor: 'transparent',
        marginTop: 10,
      };
    } else if (mood >= 8) {
      return {
        width: 70,
        height: 30,
        borderBottomWidth: 4,
        borderBottomColor: 'white',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        backgroundColor: 'transparent',
        marginTop: 10,
      };
    } else if (mood >= 6) {
      return {
        width: 50,
        height: 25,
        borderBottomWidth: 3,
        borderBottomColor: 'white',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        backgroundColor: 'transparent',
        marginTop: 10,
      };
    }
    return {
      width: 40,
      height: 3,
      backgroundColor: 'white',
      marginTop: 10,
      borderRadius: 2
    };
  };

  const handleSubmit = async () => {
    // Validate input
    if (mood === null) {
      Alert.alert(
        'Missing Input',
        'Please either:\n\n• Use the slider to rate your mood, OR\n• Describe your feelings and tap "Analyze Text"',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!state.user?.uid) {
      Alert.alert('Error', 'Please log in to save your mood');
      return;
    }

    setLoading(true);

    try {
      const moodCategory = mood <= 4 ? 'low' : mood <= 7 ? 'medium' : 'high';

      console.log('========== MOOD TRACKER DEBUG ==========');
      console.log('Mood value:', mood);
      console.log('Calculated moodCategory:', moodCategory);
      console.log('Mood label:', moodLabels[mood]);
      console.log('========================================');

      const moodData = {
        mood,
        moodLabel: moodLabels[mood],
        moodCategory: moodCategory,
        description: description.trim(),
        rawInput: inputMethod === 'text' ? description.trim() : null
      };

      const result = await MoodService.logMood(state.user.uid, moodData);

      dispatch({
        type: 'ADD_MOOD',
        payload: result
      });

      console.log('Navigating to TaskRecommendations with params:', {
        mood: moodData.moodLabel,
        moodCategory: moodCategory
      });

      Alert.alert('Success', 'Your mood has been logged!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('TaskRecommendations', {
            mood: moodData.moodLabel,
            moodCategory: moodCategory
          })
        }
      ]);
      
    } catch (error) {
      console.error('Error submitting mood:', error);
      Alert.alert('Error', 'Failed to log your mood. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const getGradientColor = () => {
    const currentMood = mood || 5; // Default to neutral if not set
    const lowerMood = Math.floor(currentMood);
    const upperMood = Math.ceil(currentMood);
    const startColor = moodBackgrounds[lowerMood];
    const endColor = moodBackgrounds[upperMood];
    
    if (startColor === endColor) return startColor;

    const ratio = currentMood - lowerMood;
    const startRGB = hexToRgb(startColor);
    const endRGB = hexToRgb(endColor);
    
    const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * ratio);
    const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * ratio);
    const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * ratio);
    
    return `rgb(${r},${g},${b})`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSliding(true);
        handleSliderTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleSliderTouch(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setIsSliding(false);
      },
      onPanResponderTerminate: () => {
        setIsSliding(false);
      },
    })
  ).current;

  const handleSliderTouch = (locationX) => {
    sliderRef.current?.measure((x, y, width) => {
      const percentage = Math.max(0, Math.min(1, locationX / width));
      const newMood = Math.round(1 + percentage * 9);
      handleMoodChange(newMood);
    });
  };

  const currentBackgroundColor = getGradientColor();
  const displayMoodLabel = mood !== null ? moodLabels[mood] : 'Not set';

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeAreaTop} />
      <View style={styles.mainContent}>
        <StatusBar backgroundColor="white" barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log</Text>
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.menuDot} />
            <View style={styles.menuDot} />
            <View style={styles.menuDot} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.keyboardView, { backgroundColor: currentBackgroundColor }]}
          keyboardVerticalOffset={0}
        >
          <ScrollView 
            style={[styles.container, { backgroundColor: currentBackgroundColor }]} 
            contentContainerStyle={[styles.contentContainer, { backgroundColor: currentBackgroundColor }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isSliding}
          >
            <Text style={styles.mainTitle}>
              Tell us what{'\n'}you're feeling.
            </Text>

            <Text style={styles.currentMoodLabel}>
              {displayMoodLabel}
            </Text>

            {mood !== null && (
              <View style={styles.faceContainer}>
                <View style={styles.face}>
                  <View style={styles.eyesContainer}>
                    <View style={[styles.eye, getEyeStyle()]}>
                      <View style={styles.eyeball} />
                    </View>
                    <View style={[styles.eye, getEyeStyle()]}>
                      <View style={styles.eyeball} />
                    </View>
                  </View>
                  <View style={getMouthStyle()} />
                </View>
              </View>
            )}

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Rate your mood (Optional)</Text>
              <View 
                ref={sliderRef}
                style={styles.sliderTrack}
                {...panResponder.panHandlers}
              >
                <View style={[
                  styles.sliderProgress, 
                  { width: mood !== null ? `${((mood - 1) / 9) * 100}%` : '44%' }
                ]} />
                <View style={[
                  styles.sliderThumb, 
                  { left: mood !== null ? `${((mood - 1) / 9) * 100}%` : '44%' }
                ]}>
                  <View style={styles.circleThumb} />
                </View>
              </View>
              
              <View style={styles.scaleContainer}>
                {[1,2,3,4,5,6,7,8,9,10].map(value => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => handleMoodChange(value)}
                    style={styles.scaleNumber}
                  >
                    <Text style={[
                      styles.scaleText,
                      mood === value && styles.scaleTextActive
                    ]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Or type it out!</Text>
              <Text style={styles.sectionSubtitle}>
                Describe your feelings and we'll analyze them
              </Text>
              
              <View style={styles.textInputContainer}>
                <TextInput
                  placeholder="I'm feeling..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={description}
                  onChangeText={handleTextChange}
                  multiline
                  numberOfLines={4}
                  style={styles.textInput}
                />
              </View>

              {description.trim().length > 10 && (
                <TouchableOpacity
                  style={[styles.analyzeButton, analyzingText && styles.analyzeButtonDisabled]}
                  onPress={handleAnalyzeText}
                  disabled={analyzingText}
                >
                  <Text style={styles.analyzeButtonText}>
                    {analyzingText ? 'Analyzing...' : '✨ Analyze My Text'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || mood === null}
              style={[styles.submitButton, mood === null && styles.submitButtonDisabled]}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <SafeAreaView style={[styles.safeAreaBottom, { backgroundColor: currentBackgroundColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#F8FAFC'
  },
  safeAreaBottom: {
    flex: 0
  },
  mainContent: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  menuButton: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  menuDot: {
    width: 5,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 2.5,
    marginVertical: 1.5,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 40,
    flexGrow: 1,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 44,
  },
  currentMoodLabel: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 50,
  },
  faceContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  face: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 70,
    marginBottom: 8,
  },
  eye: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeball: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  sliderContainer: {
    marginBottom: 50,
    width: '100%',
  },
  sliderLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  sliderTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 5,
    position: 'relative',
    marginBottom: 15,
  },
  sliderProgress: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 5,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    marginLeft: -12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  scaleNumber: {
    padding: 8,
  },
  scaleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  scaleTextActive: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  descriptionSection: {
    marginBottom: 40,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  textInput: {
    color: 'white',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  analyzeButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  analyzeButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  analyzeButtonText: {
    color: '#7B287D',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});