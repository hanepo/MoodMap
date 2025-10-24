const AnalyticsService = {
  // Placeholder for getting check-in history (to be replaced with DB call)
  getCheckInHistory: (userId) => {
    // Mock data: Returns check-ins for the week
    const mockCheckIns = {
      S: true, // Sunday
      M: false, // Monday
      T: true, // Tuesday
      W: true, // Wednesday (today, Aug 13, 2025, 12:55 AM +08)
      T: false, // Thursday
      F: false, // Friday
      S: false, // Saturday
    };
    return Promise.resolve(mockCheckIns);
  },

  // Placeholder for recording a check-in (to be replaced with DB update)
  recordCheckIn: (userId, day) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, day }), 500); // Simulate async
    });
  },
};

export default AnalyticsService;