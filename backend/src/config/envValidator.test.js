const {
  validateEnvironment,
  getConfig,
  getRateLimitConfig,
  getAdminAuthConfig,
  getAnalyticsConfig,
} = require('./envValidator');

// Mock logger to prevent console output during tests
jest.mock('./logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Environment Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getRateLimitConfig', () => {
    it('should return default values when no env vars are set', () => {
      delete process.env.RATE_LIMIT_ENABLED;
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.RATE_LIMIT_MAX_REQUESTS;

      const config = getRateLimitConfig();

      expect(config.enabled).toBe(true);
      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(10);
    });

    it('should parse RATE_LIMIT_ENABLED correctly', () => {
      process.env.RATE_LIMIT_ENABLED = 'false';
      expect(getRateLimitConfig().enabled).toBe(false);

      process.env.RATE_LIMIT_ENABLED = 'true';
      expect(getRateLimitConfig().enabled).toBe(true);
    });

    it('should parse RATE_LIMIT_WINDOW_MS correctly', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '120000';
      expect(getRateLimitConfig().windowMs).toBe(120000);
    });

    it('should use default for invalid RATE_LIMIT_WINDOW_MS', () => {
      process.env.RATE_LIMIT_WINDOW_MS = 'invalid';
      expect(getRateLimitConfig().windowMs).toBe(60000);

      process.env.RATE_LIMIT_WINDOW_MS = '-1000';
      expect(getRateLimitConfig().windowMs).toBe(60000);
    });

    it('should parse RATE_LIMIT_MAX_REQUESTS correctly', () => {
      process.env.RATE_LIMIT_MAX_REQUESTS = '20';
      expect(getRateLimitConfig().maxRequests).toBe(20);
    });

    it('should disable rate limiting when max requests is 0', () => {
      process.env.RATE_LIMIT_MAX_REQUESTS = '0';
      const config = getRateLimitConfig();
      expect(config.maxRequests).toBe(0);
      expect(config.enabled).toBe(false);
    });

    it('should use default for invalid RATE_LIMIT_MAX_REQUESTS', () => {
      process.env.RATE_LIMIT_MAX_REQUESTS = 'invalid';
      expect(getRateLimitConfig().maxRequests).toBe(10);
    });
  });

  describe('getAdminAuthConfig', () => {
    it('should return empty credentials when not configured', () => {
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;

      const config = getAdminAuthConfig();

      expect(config.username).toBe('');
      expect(config.password).toBe('');
      expect(config.isConfigured).toBe(false);
      expect(config.warnings.length).toBeGreaterThan(0);
    });

    it('should return configured credentials', () => {
      process.env.ADMIN_USERNAME = 'testuser';
      process.env.ADMIN_PASSWORD = 'testpassword';

      const config = getAdminAuthConfig();

      expect(config.username).toBe('testuser');
      expect(config.password).toBe('testpassword');
      expect(config.isConfigured).toBe(true);
    });

    it('should warn about weak password in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'short';

      const config = getAdminAuthConfig();

      expect(
        config.warnings.some((w) => w.includes('less than 8 characters'))
      ).toBe(true);
    });

    it('should warn about default password in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'your-secure-password-here';

      const config = getAdminAuthConfig();

      expect(config.warnings.some((w) => w.includes('default value'))).toBe(
        true
      );
    });
  });

  describe('getAnalyticsConfig', () => {
    it('should return default retention days when not configured', () => {
      delete process.env.ANALYTICS_RETENTION_DAYS;

      const config = getAnalyticsConfig();

      expect(config.retentionDays).toBe(90);
    });

    it('should parse ANALYTICS_RETENTION_DAYS correctly', () => {
      process.env.ANALYTICS_RETENTION_DAYS = '30';

      const config = getAnalyticsConfig();

      expect(config.retentionDays).toBe(30);
    });

    it('should use default for invalid ANALYTICS_RETENTION_DAYS', () => {
      process.env.ANALYTICS_RETENTION_DAYS = 'invalid';
      expect(getAnalyticsConfig().retentionDays).toBe(90);

      process.env.ANALYTICS_RETENTION_DAYS = '0';
      expect(getAnalyticsConfig().retentionDays).toBe(90);

      process.env.ANALYTICS_RETENTION_DAYS = '-10';
      expect(getAnalyticsConfig().retentionDays).toBe(90);
    });
  });

  describe('validateEnvironment', () => {
    it('should return valid result with warnings for missing optional vars', () => {
      delete process.env.MONGODB_URI;
      delete process.env.BASE_URL;

      const result = validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include all config sections', () => {
      const result = validateEnvironment();

      expect(result.config.rateLimit).toBeDefined();
      expect(result.config.adminAuth).toBeDefined();
      expect(result.config.analytics).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return complete configuration with defaults', () => {
      const config = getConfig();

      expect(config.nodeEnv).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.mongodbUri).toBeDefined();
      expect(config.baseUrl).toBeDefined();
      expect(config.logLevel).toBeDefined();
      expect(config.shortCodeLength).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.adminAuth).toBeDefined();
      expect(config.analytics).toBeDefined();
    });

    it('should use environment values when set', () => {
      process.env.PORT = '4000';
      process.env.LOG_LEVEL = 'debug';
      process.env.SHORT_CODE_LENGTH = '8';

      const config = getConfig();

      expect(config.port).toBe(4000);
      expect(config.logLevel).toBe('debug');
      expect(config.shortCodeLength).toBe(8);
    });
  });
});
