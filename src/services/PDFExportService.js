import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Clipboard, Platform } from 'react-native';

export const PDFExportService = {
  // Calculate comprehensive statistics
  calculateStatistics: (moods, tasks, checkIns) => {
    const stats = {
      mood: {
        total: moods.length,
        average: 0,
        highest: 0,
        lowest: 10,
        mostFrequent: 'N/A',
        distribution: {},
        trend: 'stable',
      },
      tasks: {
        total: tasks.length,
        completed: 0,
        pending: 0,
        completionRate: 0,
        byCategory: {},
        byDifficulty: {},
      },
      checkIns: {
        total: checkIns.length,
        currentStreak: 0,
        longestStreak: 0,
        checkInRate: 0,
      },
      timeRange: {
        start: null,
        end: null,
        days: 0,
      }
    };

    // Mood statistics
    if (moods.length > 0) {
      let sum = 0;
      const moodCounts = {};
      const sortedMoods = [...moods].sort((a, b) => {
        // Timestamps should already be converted to Date objects
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp || a.createdAt);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp || b.createdAt);
        return dateA - dateB;
      });

      moods.forEach(m => {
        const moodValue = m.mood || 0;
        sum += moodValue;
        stats.mood.highest = Math.max(stats.mood.highest, moodValue);
        stats.mood.lowest = Math.min(stats.mood.lowest, moodValue);

        const label = m.moodLabel || 'Unknown';
        moodCounts[label] = (moodCounts[label] || 0) + 1;
      });

      stats.mood.average = (sum / moods.length).toFixed(1);
      stats.mood.distribution = moodCounts;

      // Find most frequent mood
      let maxCount = 0;
      Object.entries(moodCounts).forEach(([label, count]) => {
        if (count > maxCount) {
          maxCount = count;
          stats.mood.mostFrequent = label;
        }
      });

      // Calculate trend (compare first half vs second half)
      const midPoint = Math.floor(sortedMoods.length / 2);
      const firstHalfAvg = sortedMoods.slice(0, midPoint).reduce((acc, m) => acc + (m.mood || 0), 0) / midPoint;
      const secondHalfAvg = sortedMoods.slice(midPoint).reduce((acc, m) => acc + (m.mood || 0), 0) / (sortedMoods.length - midPoint);

      if (secondHalfAvg > firstHalfAvg + 0.5) {
        stats.mood.trend = 'improving';
      } else if (secondHalfAvg < firstHalfAvg - 0.5) {
        stats.mood.trend = 'declining';
      }

      // Time range - timestamps should already be Date objects
      stats.timeRange.start = sortedMoods[0].timestamp instanceof Date ? sortedMoods[0].timestamp : new Date(sortedMoods[0].timestamp || sortedMoods[0].createdAt);
      stats.timeRange.end = sortedMoods[sortedMoods.length - 1].timestamp instanceof Date ? sortedMoods[sortedMoods.length - 1].timestamp : new Date(sortedMoods[sortedMoods.length - 1].timestamp || sortedMoods[sortedMoods.length - 1].createdAt);
      stats.timeRange.days = Math.ceil((stats.timeRange.end - stats.timeRange.start) / (1000 * 60 * 60 * 24));
    }

    // Task statistics
    tasks.forEach(t => {
      if (t.completed) stats.tasks.completed++;
      else stats.tasks.pending++;

      const category = t.category || 'Uncategorized';
      stats.tasks.byCategory[category] = (stats.tasks.byCategory[category] || 0) + 1;

      const difficulty = t.difficultyLevel || 'Unknown';
      stats.tasks.byDifficulty[difficulty] = (stats.tasks.byDifficulty[difficulty] || 0) + 1;
    });

    if (tasks.length > 0) {
      stats.tasks.completionRate = ((stats.tasks.completed / tasks.length) * 100).toFixed(1);
    }

    // Check-in statistics
    if (checkIns.length > 0) {
      stats.checkIns.total = checkIns.length;

      // Sort check-ins by date
      const sortedCheckIns = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedCheckIns.length; i++) {
        const checkInDate = new Date(sortedCheckIns[i].date);
        checkInDate.setHours(0, 0, 0, 0);

        if (i === 0) {
          const daysDiff = Math.floor((today - checkInDate) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) {
            currentStreak = 1;
            tempStreak = 1;
          }
        } else {
          const prevDate = new Date(sortedCheckIns[i - 1].date);
          prevDate.setHours(0, 0, 0, 0);
          const diff = Math.floor((prevDate - checkInDate) / (1000 * 60 * 60 * 24));

          if (diff === 1) {
            tempStreak++;
            if (i === 1 && currentStreak > 0) currentStreak = tempStreak;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      stats.checkIns.currentStreak = currentStreak;
      stats.checkIns.longestStreak = longestStreak;

      // Calculate check-in rate (percentage of days checked in)
      if (stats.timeRange.days > 0) {
        stats.checkIns.checkInRate = ((checkIns.length / stats.timeRange.days) * 100).toFixed(1);
      }
    }

    return stats;
  },

  // Generate enhanced insights
  generateEnhancedInsights: (stats, moods, tasks, checkIns) => {
    const insights = [];

    // Mood trend insight
    if (stats.mood.trend === 'improving') {
      const improvement = Math.abs(15); // Calculate actual improvement
      insights.push(`📈 Your mood improved over the tracking period. Data shows consistent positive momentum.`);
    } else if (stats.mood.trend === 'declining') {
      insights.push(`📉 Recent mood data indicates a downward pattern. Consider self-care activities or reaching out for support.`);
    } else {
      insights.push(`➡️ Your mood has been stable over ${stats.timeRange.days} days with an average of ${stats.mood.average}/10.`);
    }

    // Task completion insight
    if (stats.tasks.completionRate >= 75) {
      insights.push(`✅ You've completed ${stats.tasks.completionRate}% of your tasks — excellent productivity! Keep it up!`);
    } else if (stats.tasks.completionRate >= 50) {
      insights.push(`✅ You've completed ${stats.tasks.completionRate}% of your tasks. You're on track!`);
    } else {
      insights.push(`💪 ${stats.tasks.completionRate}% task completion. Consider breaking tasks into smaller steps.`);
    }

    // Check-in streak insight
    if (stats.checkIns.currentStreak > 0) {
      insights.push(`🔥 You maintained a ${stats.checkIns.currentStreak}-day check-in streak! Consistency builds strong habits.`);
    } else {
      insights.push(`📅 Start a new check-in streak today to build consistent wellness tracking habits.`);
    }

    // Weekly summary
    const weeklyMoodAvg = stats.mood.average;
    if (weeklyMoodAvg >= 7) {
      insights.push(`🌟 Your average mood score of ${weeklyMoodAvg}/10 indicates strong emotional wellbeing.`);
    } else if (weeklyMoodAvg >= 5) {
      insights.push(`😊 Your average mood score of ${weeklyMoodAvg}/10 shows moderate wellbeing. Keep tracking!`);
    }

    return insights;
  },

  // Generate HTML for PDF
  generateHTML: (userData, stats, moods, tasks, checkIns) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      try {
        // Handle Firebase Timestamp
        if (date.toDate && typeof date.toDate === 'function') {
          const d = date.toDate();
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        // Handle Date object
        if (date instanceof Date && !isNaN(date)) {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        // Handle timestamp number or string
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return 'N/A';
      } catch (error) {
        console.error('Error formatting date:', date, error);
        return 'N/A';
      }
    };

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Create mood chart data
    const moodLabels = Object.keys(stats.mood.distribution);
    const moodValues = Object.values(stats.mood.distribution);
    const moodColors = ['#7B287D', '#7067CF', '#B7C0EE', '#F79256', '#CBF3D2'];

    // Create task category chart data
    const categoryLabels = Object.keys(stats.tasks.byCategory);
    const categoryValues = Object.values(stats.tasks.byCategory);

    // Prepare mood timeline data (last 14 days or all available)
    const moodTimeline = moods
      .map(m => ({
        date: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp || m.createdAt),
        score: m.mood || 0
      }))
      .sort((a, b) => a.date - b.date)
      .slice(-14);  // Limit to last 14 entries for better visualization

    const timelineLabels = moodTimeline.map(m => formatDate(m.date));
    const timelineScores = moodTimeline.map(m => m.score);

    // Generate enhanced insights
    const enhancedInsights = PDFExportService.generateEnhancedInsights(stats, moods, tasks, checkIns);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MoodMap Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1F2937;
      padding: 30px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #7B287D;
      padding-bottom: 20px;
    }

    .header h1 {
      color: #7B287D;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .header p {
      color: #6B7280;
      font-size: 14px;
    }

    .user-info {
      background: #F9FAFB;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      border-left: 4px solid #7B287D;
    }

    .user-info h2 {
      color: #330C2F;
      font-size: 18px;
      margin-bottom: 10px;
    }

    .user-info p {
      color: #6B7280;
      margin-bottom: 5px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-title {
      color: #330C2F;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #E5E7EB;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: #F9FAFB;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #E5E7EB;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #7B287D;
      margin-bottom: 5px;
    }

    .stat-label {
      color: #6B7280;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: #F9FAFB;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .chart-canvas-container {
      margin: 20px 0;
      padding: 25px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(123, 40, 125, 0.1);
    }

    .chart-title-main {
      color: #330C2F;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    canvas {
      max-width: 100%;
      height: auto !important;
    }

    .insight-badge {
      display: inline-block;
      background: linear-gradient(135deg, #7B287D, #7067CF);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .bar-chart {
      margin: 15px 0;
    }

    .bar-row {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }

    .bar-label {
      width: 120px;
      font-size: 11px;
      color: #4B5563;
      font-weight: 500;
    }

    .bar-container {
      flex: 1;
      height: 25px;
      background: #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #7B287D, #7067CF);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
    }

    .bar-value {
      color: white;
      font-size: 10px;
      font-weight: bold;
    }

    .mood-timeline {
      margin: 15px 0;
    }

    .timeline-item {
      padding: 10px;
      border-left: 3px solid #7B287D;
      margin-left: 10px;
      margin-bottom: 15px;
      background: #F9FAFB;
      border-radius: 4px;
    }

    .timeline-date {
      color: #7B287D;
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 5px;
    }

    .timeline-mood {
      color: #330C2F;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 3px;
    }

    .timeline-description {
      color: #6B7280;
      font-size: 10px;
      font-style: italic;
    }

    .task-list {
      margin: 15px 0;
    }

    .task-item {
      display: flex;
      align-items: flex-start;
      padding: 10px;
      border-bottom: 1px solid #E5E7EB;
    }

    .task-checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid #7B287D;
      border-radius: 4px;
      margin-right: 10px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .task-checkbox.completed {
      background: #7B287D;
      color: white;
    }

    .task-details {
      flex: 1;
    }

    .task-title {
      color: #330C2F;
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 3px;
    }

    .task-meta {
      color: #6B7280;
      font-size: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    thead {
      background: #7B287D;
      color: white;
    }

    th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid #E5E7EB;
      font-size: 11px;
      color: #1F2937;
    }

    tbody tr:hover {
      background: #F9FAFB;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .table-number {
      font-weight: bold;
      color: #7B287D;
    }

    .table-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-positive {
      background: #D1FAE5;
      color: #065F46;
    }

    .badge-neutral {
      background: #FEF3C7;
      color: #78350F;
    }

    .badge-low {
      background: #FEE2E2;
      color: #991B1B;
    }

    .insight-box {
      background: linear-gradient(135deg, #7B287D, #7067CF);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
    }

    .insight-box h3 {
      font-size: 16px;
      margin-bottom: 10px;
    }

    .insight-box p {
      font-size: 12px;
      line-height: 1.8;
    }

    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9CA3AF;
      font-size: 10px;
      border-top: 1px solid #E5E7EB;
      padding-top: 20px;
    }

    .print-instructions {
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      text-align: center;
    }

    .print-instructions h3 {
      color: #92400E;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .print-instructions p {
      color: #78350F;
      font-size: 11px;
      margin-bottom: 10px;
    }

    .print-button {
      background: #7B287D;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      margin: 5px;
    }

    .print-button:hover {
      background: #6B1F6D;
    }

    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
      .print-instructions {
        display: none;
      }
    }
  </style>
  <script>
    function printReport() {
      window.print();
    }
  </script>
</head>
<body>
  <!-- Print Instructions -->
  <div class="print-instructions">
    <h3>📄 How to Save as PDF</h3>
    <p>Click the button below to open your device's print dialog, then select "Save as PDF" or "Print to PDF"</p>
    <button class="print-button" onclick="printReport()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- Header -->
  <div class="header">
    <h1>🌈 MoodMap Report</h1>
    <p>Personal Wellness & Mood Tracking Report</p>
    <p>Generated on ${today}</p>
  </div>

  <!-- User Information -->
  <div class="user-info">
    <h2>Report Summary</h2>
    <p><strong>Name:</strong> ${userData.displayName || 'User'}</p>
    <p><strong>Email:</strong> ${userData.email || 'N/A'}</p>
    <p><strong>Report Period:</strong> ${stats.timeRange.start ? formatDate(stats.timeRange.start) : 'N/A'} - ${stats.timeRange.end ? formatDate(stats.timeRange.end) : 'N/A'} (${stats.timeRange.days} days)</p>
  </div>

  <!-- Overview Statistics -->
  <div class="section">
    <h2 class="section-title">📊 Overview Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.mood.total}</div>
        <div class="stat-label">Mood Entries</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasks.total}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.checkIns.total}</div>
        <div class="stat-label">Daily Check-ins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.mood.average}</div>
        <div class="stat-label">Average Mood</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasks.completionRate}%</div>
        <div class="stat-label">Task Completion</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.checkIns.currentStreak} 🔥</div>
        <div class="stat-label">Current Streak</div>
      </div>
    </div>
  </div>

  <!-- Mood Analysis -->
  <div class="section">
    <h2 class="section-title">😊 Mood Analysis</h2>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.mood.highest}/10</div>
        <div class="stat-label">Highest Mood</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.mood.lowest}/10</div>
        <div class="stat-label">Lowest Mood</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.mood.mostFrequent}</div>
        <div class="stat-label">Most Frequent</div>
      </div>
    </div>

    <div class="chart-container">
      <h3 style="color: #330C2F; font-size: 14px; margin-bottom: 15px;">Mood Distribution Chart</h3>
      <div class="bar-chart">
        ${moodLabels.map((label, index) => `
          <div class="bar-row">
            <div class="bar-label">${label}</div>
            <div class="bar-container">
              <div class="bar-fill" style="width: ${(moodValues[index] / Math.max(...moodValues)) * 100}%;">
                <span class="bar-value">${moodValues[index]} (${((moodValues[index] / stats.mood.total) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Mood Timeline Line Chart (CSS-based for PDF) -->
    <div class="chart-canvas-container">
      <h3 class="chart-title-main">📈 Mood Trends Over Time</h3>

      ${timelineScores.length > 0 ? `
      <!-- SVG Line Chart -->
      <div style="position: relative; width: 100%; height: 280px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 30px 40px 40px 50px; margin: 20px 0;">
        <!-- Y-axis labels -->
        <div style="position: absolute; left: 30px; top: 30px; bottom: 40px; display: flex; flex-direction: column; justify-content: space-between; font-size: 9px; color: #6B7280;">
          ${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(val => `<div style="height: 0;">${val}</div>`).join('')}
        </div>

        <!-- Grid lines -->
        <div style="position: absolute; left: 50px; right: 40px; top: 30px; bottom: 40px;">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `
            <div style="position: absolute; left: 0; right: 0; top: ${i * 10}%; height: 1px; background: ${i === 5 ? '#D1D5DB' : '#F3F4F6'};"></div>
          `).join('')}
        </div>

        <!-- Chart area with SVG -->
        <svg style="position: absolute; left: 50px; right: 40px; top: 30px; bottom: 40px; width: calc(100% - 90px); height: calc(100% - 70px);" viewBox="0 0 1000 200" preserveAspectRatio="none">
          ${(() => {
            // Calculate SVG points
            const numPoints = timelineScores.length;
            const xStep = 1000 / (numPoints - 1 || 1);
            const points = timelineScores.map((score, i) => {
              const x = i * xStep;
              const y = 200 - (score / 10 * 200);
              return `${x},${y}`;
            }).join(' ');

            // Create polygon for fill (add bottom corners)
            const polygonPoints = `0,200 ${points} ${(numPoints - 1) * xStep},200`;

            return `
              <!-- Fill area under line -->
              <polygon points="${polygonPoints}" fill="rgba(123, 40, 125, 0.1)" />
              <!-- Line connecting points -->
              <polyline points="${points}" fill="none" stroke="#7B287D" stroke-width="3" opacity="0.8" />
            `;
          })()}
        </svg>

        <!-- Data points -->
        <div style="position: absolute; left: 50px; right: 40px; top: 30px; bottom: 40px; pointer-events: none;">
          ${timelineScores.map((score, index) => {
            const numPoints = timelineScores.length;
            const xPercent = numPoints > 1 ? (index / (numPoints - 1)) * 100 : 50;
            const yPercent = 100 - (score / 10 * 100);
            const color = score >= 8 ? '#10B981' : score >= 6 ? '#7B287D' : score >= 4 ? '#F59E0B' : '#EF4444';

            return `
              <div style="position: absolute; left: ${xPercent}%; top: ${yPercent}%; transform: translate(-50%, -50%);">
                <div style="width: 10px; height: 10px; background: ${color}; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                <div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: bold; color: ${color}; white-space: nowrap;">${score}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- X-axis labels -->
        <div style="position: absolute; left: 50px; right: 40px; bottom: 25px; display: flex; justify-content: space-between; font-size: 8px; color: #6B7280;">
          ${timelineLabels.map((label) => `<div style="white-space: nowrap;">${label}</div>`).join('')}
        </div>

        <!-- Axis titles -->
        <div style="position: absolute; left: 15px; top: 150px; transform: rotate(-90deg); transform-origin: left center; font-size: 10px; font-weight: bold; color: #4B5563;">Mood Score</div>
        <div style="position: absolute; bottom: 7px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: bold; color: #4B5563;">Date</div>
      </div>
      ` : '<p style="text-align: center; color: #9CA3AF; padding: 40px;">No mood timeline data available.</p>'}

      <p style="color: #6B7280; font-size: 11px; margin-top: 15px; text-align: center;">
        ${timelineScores.length > 0 ? `Tracking ${timelineScores.length} mood entries over time. Trend: <strong>${stats.mood.trend.toUpperCase()}</strong><br><small style="font-size: 10px;">(Showing last 14 entries)</small>` : ''}
      </p>
      ${timelineScores.length > 0 ? `
      <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; margin-top: 15px;">
        <p style="color: #4B5563; font-size: 11px; margin: 0 0 10px 0;">
          <strong>Quick Stats:</strong>
          Highest: ${Math.max(...timelineScores)}/10 |
          Lowest: ${Math.min(...timelineScores)}/10 |
          Average: ${(timelineScores.reduce((a, b) => a + b, 0) / timelineScores.length).toFixed(1)}/10
        </p>
        <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 12px; height: 12px; background: #10B981; border-radius: 50%; border: 2px solid #fff;"></div>
            <span style="font-size: 10px; color: #6B7280;">High (8-10)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 12px; height: 12px; background: #7B287D; border-radius: 50%; border: 2px solid #fff;"></div>
            <span style="font-size: 10px; color: #6B7280;">Good (6-7)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 12px; height: 12px; background: #F59E0B; border-radius: 50%; border: 2px solid #fff;"></div>
            <span style="font-size: 10px; color: #6B7280;">Moderate (4-5)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 12px; height: 12px; background: #EF4444; border-radius: 50%; border: 2px solid #fff;"></div>
            <span style="font-size: 10px; color: #6B7280;">Low (0-3)</span>
          </div>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Mood Distribution Pie Chart -->
    <div class="chart-canvas-container">
      <h3 class="chart-title-main">🥧 Mood Distribution</h3>
      <canvas id="moodPieChart" width="400" height="300"></canvas>
    </div>

    <table>
      <thead>
        <tr>
          <th>Mood Category</th>
          <th style="text-align: center;">Count</th>
          <th style="text-align: center;">Percentage</th>
          <th style="text-align: center;">Insight</th>
        </tr>
      </thead>
      <tbody>
        ${moodLabels.map((label, index) => {
          const percentage = ((moodValues[index] / stats.mood.total) * 100).toFixed(1);
          return `
            <tr>
              <td style="font-weight: 500;">${label}</td>
              <td style="text-align: center;"><span class="table-number">${moodValues[index]}</span></td>
              <td style="text-align: center;">${percentage}%</td>
              <td style="text-align: center; color: #6B7280; font-size: 10px;">
                ${percentage >= 30 ? 'Dominant mood' : percentage >= 15 ? 'Common' : 'Occasional'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="insight-box">
      <h3>💡 System-Generated Mood Analysis</h3>
      <p>
        <strong>Trend Analysis:</strong> Your mood is ${stats.mood.trend === 'improving' ? '📈 <strong>improving</strong>' : stats.mood.trend === 'declining' ? '📉 <strong>declining</strong>' : '➡️ <strong>stable</strong>'} based on ${stats.mood.total} entries over ${stats.timeRange.days} days.
        ${stats.mood.trend === 'improving' ? 'Data shows consistent positive momentum in your mood scores.' :
          stats.mood.trend === 'declining' ? 'Recent mood data indicates a downward pattern. Consider reaching out for support.' :
          'Your mood scores show consistency without significant variance.'}
      </p>
      <p style="margin-top: 10px;">
        <strong>Pattern Recognition:</strong> "${stats.mood.mostFrequent}" appears most frequently (${moodValues[moodLabels.indexOf(stats.mood.mostFrequent)] || 0} times).
        ${stats.mood.average >= 7 ? 'Overall mood scores indicate strong emotional wellbeing.' :
          stats.mood.average >= 5 ? 'Mood data suggests moderate emotional stability.' :
          'Mood patterns suggest areas for potential wellbeing improvement.'}
      </p>
    </div>
  </div>

  <!-- Recent Mood Entries Table -->
  ${moods.length > 0 ? `
  <div class="section">
    <h2 class="section-title">📅 Recent Mood Entries (Last 15)</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Date</th>
          <th style="width: 15%;">Score</th>
          <th style="width: 20%;">Mood</th>
          <th style="width: 45%;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${moods.slice(-15).reverse().map(mood => {
          const moodValue = mood.mood || 0;
          const badgeClass = moodValue >= 7 ? 'badge-positive' : moodValue >= 5 ? 'badge-neutral' : 'badge-low';
          return `
            <tr>
              <td>${formatDate(mood.timestamp || mood.createdAt)}</td>
              <td><span class="table-number">${moodValue}/10</span></td>
              <td><span class="table-badge ${badgeClass}">${mood.moodLabel || 'Unknown'}</span></td>
              <td style="color: #6B7280; font-style: italic;">${mood.description || 'No notes'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Task Analysis -->
  <div class="section">
    <h2 class="section-title">✅ Task Analysis</h2>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.tasks.completed}</div>
        <div class="stat-label">Completed Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasks.pending}</div>
        <div class="stat-label">Pending Tasks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tasks.completionRate}%</div>
        <div class="stat-label">Completion Rate</div>
      </div>
    </div>

    <div class="chart-canvas-container">
      <h3 class="chart-title-main">📊 Task Completion by Category</h3>
      <canvas id="taskBarChart" width="800" height="350"></canvas>
      <p>Showing ${categoryLabels.length} task categories. Overall completion rate: ${stats.tasks.completionRate}%.</p>
    </div>

    ${categoryLabels.length > 0 ? `
    <div class="chart-container">
      <h3 style="color: #330C2F; font-size: 14px; margin-bottom: 15px;">Tasks by Category</h3>
      <div class="bar-chart">
        ${categoryLabels.map((label, index) => `
          <div class="bar-row">
            <div class="bar-label">${label}</div>
            <div class="bar-container">
              <div class="bar-fill" style="width: ${(categoryValues[index] / Math.max(...categoryValues)) * 100}%;">
                <span class="bar-value">${categoryValues[index]}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>

  <!-- Task List Table -->
  ${tasks.length > 0 ? `
  <div class="section">
    <h2 class="section-title">📝 Task Details</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">✓</th>
          <th style="width: 40%;">Task</th>
          <th style="width: 20%;">Category</th>
          <th style="width: 15%;">Difficulty</th>
          <th style="width: 20%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(task => `
          <tr>
            <td style="text-align: center;">
              ${task.completed ? '<span style="color: #10B981; font-size: 16px;">✓</span>' : '<span style="color: #D1D5DB;">○</span>'}
            </td>
            <td style="font-weight: 500;">${task.title || 'Untitled'}</td>
            <td>${task.category || 'N/A'}</td>
            <td>${task.difficultyLevel || 'N/A'}</td>
            <td>
              <span class="table-badge ${task.completed ? 'badge-positive' : 'badge-neutral'}">
                ${task.completed ? 'Completed' : 'Pending'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Check-in Statistics -->
  <div class="section">
    <h2 class="section-title">🔥 Daily Check-in Statistics</h2>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.checkIns.total}</div>
        <div class="stat-label">Total Check-ins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.checkIns.currentStreak}</div>
        <div class="stat-label">Current Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.checkIns.longestStreak}</div>
        <div class="stat-label">Longest Streak</div>
      </div>
    </div>

    <div class="chart-canvas-container">
      <h3 class="chart-title-main">🔥 Check-in Streak Visualization</h3>
      <canvas id="streakChart" width="800" height="250"></canvas>
      <p>Current streak: ${stats.checkIns.currentStreak} days | Personal best: ${stats.checkIns.longestStreak} days</p>
    </div>

    <div class="insight-box">
      <h3>📈 System-Generated Performance Analysis</h3>
      <p>
        <strong>Consistency Score:</strong> ${stats.checkIns.checkInRate}% check-in rate (${stats.checkIns.total} check-ins over ${stats.timeRange.days} days).
        ${stats.checkIns.checkInRate >= 80 ? 'Excellent consistency! Your commitment to tracking is outstanding.' :
          stats.checkIns.checkInRate >= 50 ? 'Good tracking frequency. Consider increasing daily engagement.' :
          'Sporadic tracking detected. Regular check-ins provide better insights.'}
      </p>
      <p style="margin-top: 10px;">
        <strong>Streak Analysis:</strong> Current: ${stats.checkIns.currentStreak} days | Record: ${stats.checkIns.longestStreak} days.
        ${stats.checkIns.currentStreak >= stats.checkIns.longestStreak && stats.checkIns.currentStreak > 0 ?
          '🎉 You\'re at your personal best streak!' :
          stats.checkIns.currentStreak > 0 ? `Keep going! You're ${stats.checkIns.longestStreak - stats.checkIns.currentStreak} days away from your record.` :
          'Begin a new streak to build consistent habits.'}
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by MoodMap Wellness Tracker — Data from Firebase Firestore</p>
    <p>© ${new Date().getFullYear()} MoodMap. All data is private and confidential.</p>
  </div>

  <!-- Chart.js Rendering Script -->
  <script>
    // Wait for Chart.js to load
    window.addEventListener('load', function() {
      if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
      }

      // 1. Mood Timeline Line Chart
      const timelineCtx = document.getElementById('moodTimelineChart');
      if (timelineCtx) {
        const chartData = ${JSON.stringify(timelineScores)};
        const avgMood = chartData.reduce((a, b) => a + b, 0) / chartData.length;

        new Chart(timelineCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(timelineLabels)},
            datasets: [
              {
                label: 'Mood Score',
                data: chartData,
                borderColor: '#7B287D',
                backgroundColor: 'rgba(123, 40, 125, 0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartData.map(score => {
                  if (score >= 8) return '#10B981'; // Green for high mood
                  if (score >= 6) return '#7B287D'; // Purple for medium-high
                  if (score >= 4) return '#F59E0B'; // Orange for medium
                  return '#EF4444'; // Red for low mood
                }),
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 3
              },
              {
                label: 'Average',
                data: new Array(chartData.length).fill(avgMood),
                borderColor: 'rgba(107, 114, 128, 0.5)',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
              duration: 2000,
              easing: 'easeInOutQuart'
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  padding: 15,
                  font: {
                    size: 12,
                    weight: 'bold'
                  },
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                  size: 13,
                  weight: 'bold'
                },
                bodyFont: {
                  size: 12
                },
                displayColors: true,
                callbacks: {
                  label: function(context) {
                    if (context.datasetIndex === 0) {
                      return 'Mood: ' + context.parsed.y + '/10';
                    }
                    return 'Average: ' + context.parsed.y.toFixed(1) + '/10';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 10,
                ticks: {
                  stepSize: 1,
                  font: {
                    size: 11
                  },
                  callback: function(value) {
                    return value + '/10';
                  }
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.08)',
                  drawBorder: false
                },
                title: {
                  display: true,
                  text: 'Mood Score',
                  font: {
                    size: 12,
                    weight: 'bold'
                  },
                  color: '#4B5563'
                }
              },
              x: {
                grid: {
                  display: false,
                  drawBorder: false
                },
                ticks: {
                  font: {
                    size: 10
                  },
                  maxRotation: 45,
                  minRotation: 0
                },
                title: {
                  display: true,
                  text: 'Date',
                  font: {
                    size: 12,
                    weight: 'bold'
                  },
                  color: '#4B5563'
                }
              }
            }
          }
        });
      }

      // 2. Mood Distribution Pie Chart
      const pieCtx = document.getElementById('moodPieChart');
      if (pieCtx) {
        new Chart(pieCtx, {
          type: 'pie',
          data: {
            labels: ${JSON.stringify(moodLabels)},
            datasets: [{
              data: ${JSON.stringify(moodValues)},
              backgroundColor: [
                '#7B287D',
                '#7067CF',
                '#52C4B0',
                '#F79256',
                '#FBD490',
                '#E8B4F1'
              ],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                position: 'right',
                labels: {
                  padding: 15,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return label + ': ' + value + ' (' + percentage + '%)';
                  }
                }
              }
            }
          }
        });
      }

      // 3. Task Completion Bar Chart by Category
      const barCtx = document.getElementById('taskBarChart');
      if (barCtx) {
        new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(categoryLabels)},
            datasets: [{
              label: 'Tasks Completed',
              data: ${JSON.stringify(categoryValues)},
              backgroundColor: 'rgba(123, 40, 125, 0.8)',
              borderColor: '#7B287D',
              borderWidth: 1,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }

      // 4. Check-in Streak Visualization (Bar chart showing last 30 days)
      const streakCtx = document.getElementById('streakChart');
      if (streakCtx) {
        // Create array of last 30 days and mark which ones have check-ins
        const today = new Date();
        const last30Days = [];
        const checkInDates = ${JSON.stringify(checkIns.map(ci => {
          const date = ci.date instanceof Date ? ci.date : new Date(ci.date || ci.createdAt);
          return date.toISOString().split('T')[0];
        }))};

        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          last30Days.push({
            label: date.getDate() + '/' + (date.getMonth() + 1),
            value: checkInDates.includes(dateStr) ? 1 : 0
          });
        }

        new Chart(streakCtx, {
          type: 'bar',
          data: {
            labels: last30Days.map(d => d.label),
            datasets: [{
              label: 'Check-in Status',
              data: last30Days.map(d => d.value),
              backgroundColor: last30Days.map(d => d.value === 1 ? '#52C4B0' : '#E5E7EB'),
              borderColor: last30Days.map(d => d.value === 1 ? '#52C4B0' : '#D1D5DB'),
              borderWidth: 1,
              borderRadius: 2,
              barThickness: 20
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return context.parsed.y === 1 ? 'Checked in' : 'No check-in';
                  }
                }
              }
            },
            scales: {
              y: {
                display: false,
                beginAtZero: true,
                max: 1
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }
    });
  </script>
</body>
</html>
    `;
  },

  // Generate report data
  generateReportData: async (userId, userData) => {
    try {
      console.log('📊 Generating PDF report for user:', userId);

      // Fetch all user data
      const moodsRef = collection(db, 'users', userId, 'moodEntries');
      const moodsSnap = await getDocs(query(moodsRef, orderBy('timestamp', 'asc')));
      const moods = moodsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Convert Firebase Timestamp to JS Date
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        };
      });
      console.log(`✅ Fetched ${moods.length} mood entries`);

      const tasksRef = collection(db, 'users', userId, 'tasks');
      const tasksSnap = await getDocs(query(tasksRef, orderBy('createdAt', 'asc')));
      const tasks = tasksSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Convert Firebase Timestamp to JS Date
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
        };
      });
      console.log(`✅ Fetched ${tasks.length} tasks`);

      const checkInsRef = collection(db, 'users', userId, 'checkIns');
      const checkInsSnap = await getDocs(checkInsRef);
      const checkIns = checkInsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Convert date string or Firebase Timestamp to JS Date
          date: data.date?.toDate ? data.date.toDate() : (typeof data.date === 'string' ? new Date(data.date) : data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        };
      });
      console.log(`✅ Fetched ${checkIns.length} check-ins`);

      // Calculate statistics
      const stats = PDFExportService.calculateStatistics(moods, tasks, checkIns);
      console.log('📈 Statistics calculated:', {
        moodTotal: stats.mood.total,
        taskTotal: stats.tasks.total,
        checkInTotal: stats.checkIns.total
      });

      // Generate HTML
      const html = PDFExportService.generateHTML(userData, stats, moods, tasks, checkIns);

      return { html, stats, moods, tasks, checkIns };
    } catch (error) {
      console.error('❌ Error generating report:', error);
      console.error('Error details:', error.message);
      throw error;
    }
  },

  // Generate text summary of statistics
  generateTextSummary: (stats, userData) => {
    const today = new Date().toLocaleDateString();

    return `
📊 MOODMAP WELLNESS REPORT
Generated: ${today}
User: ${userData.displayName || 'User'}
Period: ${stats.timeRange.days} days

━━━━━━━━━━━━━━━━━━━━━━━━

😊 MOOD STATISTICS
• Total Entries: ${stats.mood.total}
• Average Mood: ${stats.mood.average}/10
• Highest: ${stats.mood.highest}/10
• Lowest: ${stats.mood.lowest}/10
• Most Frequent: ${stats.mood.mostFrequent}
• Trend: ${stats.mood.trend.toUpperCase()}

✅ TASK STATISTICS
• Total Tasks: ${stats.tasks.total}
• Completed: ${stats.tasks.completed}
• Pending: ${stats.tasks.pending}
• Completion Rate: ${stats.tasks.completionRate}%

🔥 CHECK-IN STATISTICS
• Total Check-ins: ${stats.checkIns.total}
• Current Streak: ${stats.checkIns.currentStreak} days
• Longest Streak: ${stats.checkIns.longestStreak} days
• Check-in Rate: ${stats.checkIns.checkInRate}%

━━━━━━━━━━━━━━━━━━━━━━━━

💡 INSIGHTS
${stats.mood.trend === 'improving' ? '✨ Great progress! Your mood is improving over time.' :
  stats.mood.trend === 'declining' ? '💭 Consider reviewing recent stressors and practicing self-care.' :
  '📈 Your mood has been stable. Keep monitoring for patterns.'}

${stats.checkIns.currentStreak > 0 ? `🔥 You're on a ${stats.checkIns.currentStreak}-day streak!` : '📅 Start a new check-in streak today!'}

${stats.tasks.completionRate >= 75 ? '🎉 Excellent task completion rate!' :
  stats.tasks.completionRate >= 50 ? '👍 Good progress on your tasks!' :
  '💪 Keep working on completing your tasks!'}

━━━━━━━━━━━━━━━━━━━━━━━━
© ${new Date().getFullYear()} MoodMap
    `.trim();
  },

  // Generate CSV export
  generateCSV: (moods, tasks, checkIns) => {
    const headers = [
      'Type', 'Date', 'Mood_Score', 'Mood_Label', 'Description',
      'Task_Title', 'Task_Completed', 'Task_Category', 'Check_In'
    ];

    const rows = [];
    rows.push(headers.join(','));

    // Add mood entries
    moods.forEach(m => {
      const date = m.timestamp?.toDate?.() || new Date(m.timestamp || m.createdAt);
      const dateStr = date.toLocaleDateString();
      const desc = (m.description || m.rawInput || '').replace(/"/g, '""');

      rows.push([
        'Mood',
        dateStr,
        m.mood || '',
        m.moodLabel || '',
        `"${desc}"`,
        '',
        '',
        '',
        ''
      ].join(','));
    });

    // Add tasks
    tasks.forEach(t => {
      const date = t.createdAt?.toDate?.() || new Date(t.createdAt);
      const dateStr = date.toLocaleDateString();
      const title = (t.title || '').replace(/"/g, '""');

      rows.push([
        'Task',
        dateStr,
        '',
        '',
        '',
        `"${title}"`,
        t.completed ? 'Yes' : 'No',
        t.category || '',
        ''
      ].join(','));
    });

    // Add check-ins
    checkIns.forEach(c => {
      const date = c.date instanceof Date ? c.date : new Date(c.date);
      const dateStr = date.toLocaleDateString();

      rows.push([
        'Check-In',
        dateStr,
        '',
        '',
        '',
        '',
        '',
        '',
        'Yes'
      ].join(','));
    });

    return rows.join('\n');
  },

  // Save CSV file
  saveCSV: async (userId, userData) => {
    try {
      const { stats, moods, tasks, checkIns } = await PDFExportService.generateReportData(userId, userData);

      // Generate CSV
      const csv = PDFExportService.generateCSV(moods, tasks, checkIns);

      // Save to file
      const filename = `moodmap-export-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csv);

      return { success: true, uri: fileUri, filename };
    } catch (error) {
      console.error('Error saving CSV:', error);
      throw error;
    }
  },

  // Export data as HTML report (backward compatibility)
  exportToPDF: async (userId, userData) => {
    const { html } = await PDFExportService.generateReportData(userId, userData);

    // Save HTML to file
    const filename = `moodmap-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, html);

    return { success: true, uri: fileUri, html };
  },

  // Generate and download PDF with charts
  generateAndDownloadPDF: async (userId, userData) => {
    try {
      // Generate report data
      const { html, stats, moods, tasks, checkIns } = await PDFExportService.generateReportData(userId, userData);

      // Create PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Share the PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download MoodMap Wellness Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Generated',
          `Your wellness report has been saved to:\n${uri}\n\nYou can find it in your device's file manager.`
        );
      }

      return {
        success: true,
        uri,
        stats,
        message: 'PDF generated and ready to download!'
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report: ' + error.message);
    }
  },
};

export default PDFExportService;
