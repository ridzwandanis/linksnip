const Url = require('../models/Url');
const ClickEvent = require('../models/ClickEvent');

/**
 * Analytics Service - Business logic for analytics data collection and retrieval
 * Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 8.1, 8.2
 */
class AnalyticsService {
  /**
   * Record a click event asynchronously
   * @param {string} shortCode - Short code that was accessed
   * @param {Object} data - Click data (ip, userAgent, referrer)
   * @returns {Promise<void>}
   */
  async recordClick(shortCode, data) {
    try {
      // Check if URL exists first (Requirement 5.5)
      const urlDoc = await Url.findOne({ shortCode });
      if (!urlDoc) {
        // Don't record analytics for non-existent short codes
        return;
      }

      // Anonymize IP address (Requirement 5.4)
      const anonymizedIp = this._anonymizeIp(data.ip);

      // Parse user agent (Requirement 8.2)
      const { browser, os } = this._parseUserAgent(data.userAgent || '');

      // Extract referrer (Requirement 5.1)
      const referrer = this._extractReferrer(data.referrer || '');

      // Create click event document (Requirement 5.1, 5.3)
      const clickEvent = new ClickEvent({
        shortCode,
        timestamp: new Date(),
        anonymizedIp,
        browser,
        os,
        referrer,
      });

      // Save click event asynchronously (Requirement 5.2)
      await clickEvent.save();

      // Update aggregated stats (Requirement 7.1, 7.2)
      await this._updateAggregatedStats(shortCode, {
        anonymizedIp,
        referrer,
        timestamp: clickEvent.timestamp,
      });
    } catch (error) {
      // Log error but don't throw - analytics should not break redirects
      console.error('Error recording click event:', error);
    }
  }

  /**
   * Anonymize IP address by masking last octet
   * @param {string} ip - IP address to anonymize
   * @returns {string} Anonymized IP
   * @private
   */
  _anonymizeIp(ip) {
    if (!ip) return 'unknown';

    // Handle IPv4
    const ipv4Parts = ip.split('.');
    if (ipv4Parts.length === 4) {
      return `${ipv4Parts[0]}.${ipv4Parts[1]}.${ipv4Parts[2]}.xxx`;
    }

    // Handle IPv6 - mask last 64 bits
    if (ip.includes(':')) {
      const ipv6Parts = ip.split(':');
      if (ipv6Parts.length >= 4) {
        return `${ipv6Parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
      }
    }

    return 'unknown';
  }

  /**
   * Parse user agent string to extract browser and OS
   * @param {string} userAgent - User agent string
   * @returns {Object} { browser: string, os: string }
   * @private
   */
  _parseUserAgent(userAgent) {
    if (!userAgent) {
      return { browser: 'Unknown', os: 'Unknown' };
    }

    // Browser detection
    let browser = 'Unknown';
    if (userAgent.includes('Edg/')) {
      browser = 'Edge';
    } else if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) {
      browser = 'Opera';
    }

    // OS detection
    let os = 'Unknown';
    if (userAgent.includes('Windows NT')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return { browser, os };
  }

  /**
   * Extract domain from referrer URL
   * @param {string} referrer - Referrer URL
   * @returns {string} Domain or "direct"
   * @private
   */
  _extractReferrer(referrer) {
    if (!referrer || referrer === '') {
      return 'direct';
    }

    try {
      const url = new URL(referrer);
      return url.hostname;
    } catch (error) {
      return 'direct';
    }
  }

  /**
   * Update aggregated analytics in Url document
   * @param {string} shortCode - Short code to update
   * @param {Object} clickData - Click event data
   * @returns {Promise<void>}
   * @private
   */
  async _updateAggregatedStats(shortCode, clickData) {
    const { anonymizedIp, referrer, timestamp } = clickData;

    try {
      // Get current URL document
      const urlDoc = await Url.findOne({ shortCode });
      if (!urlDoc) return;

      // Increment total clicks (Requirement 7.1)
      urlDoc.analytics.totalClicks = (urlDoc.analytics.totalClicks || 0) + 1;

      // Update last click timestamp
      urlDoc.analytics.lastClickAt = timestamp;

      // Update unique visitors count (Requirement 7.2)
      // Get all unique IPs for this short code
      const uniqueIps = await ClickEvent.distinct('anonymizedIp', {
        shortCode,
      });
      urlDoc.analytics.uniqueVisitors = uniqueIps.length;

      // Update top referrers
      await this._updateTopReferrers(urlDoc, referrer);

      // Update clicks by day
      await this._updateClicksByDay(urlDoc, timestamp);

      // Save updated document
      await urlDoc.save();
    } catch (error) {
      // Handle version conflicts gracefully - retry once
      if (error.name === 'VersionError') {
        const urlDoc = await Url.findOne({ shortCode });
        if (!urlDoc) return;

        urlDoc.analytics.totalClicks = (urlDoc.analytics.totalClicks || 0) + 1;
        urlDoc.analytics.lastClickAt = timestamp;

        const uniqueIps = await ClickEvent.distinct('anonymizedIp', {
          shortCode,
        });
        urlDoc.analytics.uniqueVisitors = uniqueIps.length;

        await this._updateTopReferrers(urlDoc, referrer);
        await this._updateClicksByDay(urlDoc, timestamp);

        await urlDoc.save();
      } else {
        throw error;
      }
    }
  }

  /**
   * Update top referrers list
   * @param {Object} urlDoc - URL document
   * @param {string} referrer - Referrer to add
   * @private
   */
  async _updateTopReferrers(urlDoc, referrer) {
    if (!urlDoc.analytics.topReferrers) {
      urlDoc.analytics.topReferrers = [];
    }

    // Find existing referrer
    const existingReferrer = urlDoc.analytics.topReferrers.find(
      (r) => r.source === referrer
    );

    if (existingReferrer) {
      existingReferrer.count += 1;
    } else {
      urlDoc.analytics.topReferrers.push({ source: referrer, count: 1 });
    }

    // Sort by count and keep top 10 (Requirement 7.3)
    urlDoc.analytics.topReferrers.sort((a, b) => b.count - a.count);
    urlDoc.analytics.topReferrers = urlDoc.analytics.topReferrers.slice(0, 10);
  }

  /**
   * Update clicks by day
   * @param {Object} urlDoc - URL document
   * @param {Date} timestamp - Click timestamp
   * @private
   */
  async _updateClicksByDay(urlDoc, timestamp) {
    if (!urlDoc.analytics.clicksByDay) {
      urlDoc.analytics.clicksByDay = [];
    }

    // Get date at midnight
    const clickDate = new Date(timestamp);
    clickDate.setHours(0, 0, 0, 0);

    // Find existing day entry
    const existingDay = urlDoc.analytics.clicksByDay.find(
      (day) => day.date.getTime() === clickDate.getTime()
    );

    if (existingDay) {
      existingDay.count += 1;
    } else {
      urlDoc.analytics.clicksByDay.push({ date: clickDate, count: 1 });
    }

    // Sort by date descending and keep last 30 days (Requirement 7.4)
    urlDoc.analytics.clicksByDay.sort((a, b) => b.date - a.date);
    urlDoc.analytics.clicksByDay = urlDoc.analytics.clicksByDay.slice(0, 30);
  }

  /**
   * Get analytics for a specific short code
   * @param {string} shortCode - Short code to get analytics for
   * @param {Object} options - Query options (startDate, endDate)
   * @returns {Promise<Object>} Analytics data
   */
  async getUrlAnalytics(shortCode, options = {}) {
    // Find the URL document (Requirement 6.4)
    const urlDoc = await Url.findOne({ shortCode });
    if (!urlDoc) {
      return null;
    }

    // Build query for click events with time range filtering (Requirement 6.3)
    const query = { shortCode };
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.timestamp.$lte = new Date(options.endDate);
      }
    }

    // Get click events within time range
    const clickEvents = await ClickEvent.find(query).sort({ timestamp: -1 });

    // Calculate analytics from click events (Requirement 6.1, 6.2)
    const totalClicks = clickEvents.length;
    const uniqueVisitors = new Set(clickEvents.map((e) => e.anonymizedIp)).size;

    // Aggregate top referrers (Requirement 7.3)
    const referrerCounts = {};
    clickEvents.forEach((event) => {
      const ref = event.referrer || 'direct';
      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    });
    const topReferrers = Object.entries(referrerCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Aggregate top user agents (browsers and OS)
    const browserCounts = {};
    const osCounts = {};
    clickEvents.forEach((event) => {
      const browser = event.browser || 'Unknown';
      const os = event.os || 'Unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      osCounts[os] = (osCounts[os] || 0) + 1;
    });
    const topBrowsers = Object.entries(browserCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topOS = Object.entries(osCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group clicks by day for last 30 days (Requirement 7.4)
    const clicksByDay = {};
    clickEvents.forEach((event) => {
      const date = new Date(event.timestamp);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      clicksByDay[dateKey] = (clicksByDay[dateKey] || 0) + 1;
    });
    const clickHistory = Object.entries(clicksByDay)
      .map(([date, count]) => ({ date: new Date(date), count }))
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);

    // Return analytics data (Requirement 6.1, 6.2, 7.5)
    return {
      shortCode,
      originalUrl: urlDoc.originalUrl || '',
      totalClicks: totalClicks || 0,
      uniqueVisitors: uniqueVisitors || 0,
      clickHistory: clickHistory || [],
      topReferrers: topReferrers || [],
      topBrowsers: topBrowsers || [],
      topOS: topOS || [],
      lastClickAt: clickEvents.length > 0 ? clickEvents[0].timestamp : null,
    };
  }

  /**
   * Get system-wide analytics
   * @param {Object} options - Query options (startDate, endDate)
   * @returns {Promise<Object>} System analytics
   */
  async getSystemAnalytics(options = {}) {
    // Build query for time range filtering
    const query = {};
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.timestamp.$lte = new Date(options.endDate);
      }
    }

    // Get total URLs created (Requirement 6.5)
    const totalUrls = await Url.countDocuments();

    // Get total clicks across all URLs
    const totalClicks = await ClickEvent.countDocuments(query);

    // Get most popular URLs
    const popularUrls = await this.getPopularUrls(10);

    // Get unique visitors across system
    const uniqueVisitors = (await ClickEvent.distinct('anonymizedIp', query))
      .length;

    // Return system analytics (Requirement 6.5, 7.5)
    return {
      totalUrls: totalUrls || 0,
      totalClicks: totalClicks || 0,
      uniqueVisitors: uniqueVisitors || 0,
      popularUrls: popularUrls || [],
    };
  }

  /**
   * Get most popular URLs
   * @param {number} limit - Number of URLs to return
   * @returns {Promise<Array>} Array of URLs sorted by clicks
   */
  async getPopularUrls(limit = 10) {
    // Get URLs sorted by total clicks (Requirement 6.5)
    const urls = await Url.find({ isActive: true })
      .sort({ 'analytics.totalClicks': -1 })
      .limit(limit)
      .select(
        'shortCode originalUrl clicks createdAt analytics.totalClicks analytics.uniqueVisitors'
      );

    // Return formatted results (Requirement 7.5)
    return urls.map((url) => ({
      shortCode: url.shortCode || '',
      originalUrl: url.originalUrl || '',
      clicks: url.clicks || 0,
      totalClicks: url.analytics?.totalClicks || 0,
      uniqueVisitors: url.analytics?.uniqueVisitors || 0,
      createdAt: url.createdAt,
    }));
  }
}

module.exports = new AnalyticsService();
