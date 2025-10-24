from flask import Flask, request, jsonify
from flask_cors import CORS
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = Flask(__name__)
CORS(app)  # Allow React Native to call this API

analyzer = SentimentIntensityAnalyzer()

def map_sentiment_to_mood(compound_score):
    """
    Maps VADER compound score (-1 to 1) to mood scale (1-10)
    and determines mood category for task matching
    """
    # Scale compound score to 1-10
    mood_value = round(((compound_score + 1) / 2) * 9 + 1)
    mood_value = max(1, min(10, mood_value))  # Clamp between 1-10
    
    # Determine category and label
    if compound_score <= -0.6:
        return mood_value, 'low', 'Terrible' if compound_score < -0.8 else 'Bad'
    elif compound_score <= -0.2:
        return mood_value, 'low', 'Poor'
    elif compound_score <= 0.2:
        return mood_value, 'medium', 'Okay'
    elif compound_score <= 0.6:
        return mood_value, 'high', 'Good'
    else:
        return mood_value, 'high', 'Great' if compound_score > 0.8 else 'Very Good'

@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment():
    try:
        data = request.json
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Analyze sentiment
        scores = analyzer.polarity_scores(text)
        compound = scores['compound']
        
        # Map to mood system
        mood_value, mood_category, mood_label = map_sentiment_to_mood(compound)
        
        return jsonify({
            'mood_value': mood_value,
            'mood_category': mood_category,
            'mood_label': mood_label,
            'sentiment_details': {
                'compound': compound,
                'positive': scores['pos'],
                'neutral': scores['neu'],
                'negative': scores['neg']
            },
            'raw_input': text
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)