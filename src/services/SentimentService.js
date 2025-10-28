// src/services/SentimentService.js
const API_URL = 'http://10.5.8.52:5000'; // !! IMPORTANT: Replace with your CORRECT server IP address !!

export const SentimentService = {
  analyzeSentiment: async (text) => {
    if (!text || text.trim().length === 0) {
      console.error('SentimentService Error: Text is required.');
      throw new Error('Text is required for sentiment analysis');
    }

    const trimmedText = text.trim();
    const endpoint = `${API_URL}/analyze-sentiment`;
    console.log(`🚀 Sending text to ${endpoint}: "${trimmedText}"`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', // Added Accept header
        },
        body: JSON.stringify({ text: trimmedText }),
        signal: controller.signal // Add signal for timeout
      });

      clearTimeout(timeoutId); // Clear timeout if fetch completes

      console.log(`🚦 Server responded with status: ${response.status}`);

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorData = { error: `HTTP error! status: ${response.status}` };
        if (contentType && contentType.indexOf("application/json") !== -1) {
          errorData = await response.json();
          console.error('Server error response (JSON):', errorData);
        } else {
          const textError = await response.text();
          errorData.details = textError; // Add non-JSON error details
          console.error('Server error response (Non-JSON):', textError);
        }
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      // Ensure response is JSON before parsing success response
      if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          console.log('✅ Sentiment analysis result:', data);
          return data;
      } else {
          const textResponse = await response.text();
          console.error('Received non-JSON success response:', textResponse);
          throw new Error('Received an unexpected response format from the server.');
      }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('SentimentService Error: Request timed out after 10 seconds.');
            throw new Error('The sentiment analysis request timed out. Please try again.');
        } else if (error instanceof TypeError && error.message.includes('Network request failed')) {
            console.error(`SentimentService Error: Network request failed. Cannot connect to ${API_URL}. Is the server running and the IP correct?`);
            throw new Error(`Cannot connect to the analysis service at ${API_URL}. Please check the server and network connection.`);
        } else {
            console.error('SentimentService Error:', error.message);
            // Don't expose potentially sensitive internal errors directly
            throw new Error('An unexpected error occurred during sentiment analysis.');
        }
    }
  },

  checkHealth: async () => {
    const healthEndpoint = `${API_URL}/health`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      console.log(`🩺 Checking health at ${healthEndpoint}`);
      const response = await fetch(healthEndpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const isOk = response.ok;
      console.log(`🩺 Health check status: ${isOk ? 'OK' : 'Failed'} (${response.status})`);
      return isOk;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('🩺 Health check timed out.');
      } else {
        console.error('🩺 Health check failed:', error.message);
      }
      return false;
    }
  }
};

export default SentimentService;