const mongoose = require('mongoose');
const ClickEvent = require('./ClickEvent');

describe('ClickEvent Model', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.MONGODB_URI_TEST ||
      'mongodb://localhost:27017/urlshortener_test';

    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    await mongoose.connect(mongoUri);

    // Drop the collection to ensure clean state
    try {
      await mongoose.connection.db.dropCollection('clickevents');
    } catch (error) {
      // Collection might not exist, ignore error
    }

    // Ensure indexes are created
    await ClickEvent.createIndexes();
  });

  afterAll(async () => {
    // Clean up and close connection
    await ClickEvent.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await ClickEvent.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid click event with all required fields', async () => {
      const clickEventData = {
        shortCode: 'abc123',
        anonymizedIp: '192.168.1.xxx',
        browser: 'Chrome',
        os: 'Windows',
        referrer: 'google.com',
      };

      const clickEvent = new ClickEvent(clickEventData);
      const savedClickEvent = await clickEvent.save();

      expect(savedClickEvent._id).toBeDefined();
      expect(savedClickEvent.shortCode).toBe('abc123');
      expect(savedClickEvent.anonymizedIp).toBe('192.168.1.xxx');
      expect(savedClickEvent.browser).toBe('Chrome');
      expect(savedClickEvent.os).toBe('Windows');
      expect(savedClickEvent.referrer).toBe('google.com');
      expect(savedClickEvent.timestamp).toBeInstanceOf(Date);
    });

    it('should create a click event with only required fields', async () => {
      const clickEventData = {
        shortCode: 'xyz789',
        anonymizedIp: '10.0.0.xxx',
      };

      const clickEvent = new ClickEvent(clickEventData);
      const savedClickEvent = await clickEvent.save();

      expect(savedClickEvent._id).toBeDefined();
      expect(savedClickEvent.shortCode).toBe('xyz789');
      expect(savedClickEvent.anonymizedIp).toBe('10.0.0.xxx');
      expect(savedClickEvent.timestamp).toBeInstanceOf(Date);
      expect(savedClickEvent.browser).toBeUndefined();
      expect(savedClickEvent.os).toBeUndefined();
      expect(savedClickEvent.referrer).toBeUndefined();
    });

    it('should fail validation when shortCode is missing', async () => {
      const clickEventData = {
        anonymizedIp: '192.168.1.xxx',
      };

      const clickEvent = new ClickEvent(clickEventData);

      await expect(clickEvent.save()).rejects.toThrow();
    });

    it('should fail validation when anonymizedIp is missing', async () => {
      const clickEventData = {
        shortCode: 'abc123',
      };

      const clickEvent = new ClickEvent(clickEventData);

      await expect(clickEvent.save()).rejects.toThrow();
    });

    it('should automatically set timestamp if not provided', async () => {
      const beforeCreate = new Date();

      const clickEvent = new ClickEvent({
        shortCode: 'test123',
        anonymizedIp: '192.168.1.xxx',
      });

      const savedClickEvent = await clickEvent.save();
      const afterCreate = new Date();

      expect(savedClickEvent.timestamp).toBeInstanceOf(Date);
      expect(savedClickEvent.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(savedClickEvent.timestamp.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
    });

    it('should accept custom timestamp', async () => {
      const customTimestamp = new Date('2025-01-01T00:00:00.000Z');

      const clickEvent = new ClickEvent({
        shortCode: 'test123',
        anonymizedIp: '192.168.1.xxx',
        timestamp: customTimestamp,
      });

      const savedClickEvent = await clickEvent.save();

      expect(savedClickEvent.timestamp.toISOString()).toBe(
        customTimestamp.toISOString()
      );
    });
  });

  describe('Index Creation', () => {
    it('should have index on shortCode field', async () => {
      const indexes = await ClickEvent.collection.getIndexes();

      expect(indexes).toHaveProperty('shortCode_1');
    });

    it('should have index on timestamp field', async () => {
      const indexes = await ClickEvent.collection.getIndexes();

      expect(indexes).toHaveProperty('timestamp_1');
    });

    it('should have compound index on shortCode and timestamp', async () => {
      const indexes = await ClickEvent.collection.getIndexes();

      expect(indexes).toHaveProperty('shortCode_1_timestamp_-1');
    });

    it('should have TTL index on timestamp field with 90-day expiration', async () => {
      const indexInfo = await ClickEvent.collection.indexInformation({
        full: true,
      });

      const ttlIndex = indexInfo.find((index) => {
        return (
          index.name === 'timestamp_1' && index.expireAfterSeconds !== undefined
        );
      });

      expect(ttlIndex).toBeDefined();
      expect(ttlIndex.expireAfterSeconds).toBe(7776000); // 90 days in seconds
    });
  });
});
