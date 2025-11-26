const notFoundHandler = require('./notFoundHandler');

describe('Not Found Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/nonexistent',
      method: 'GET',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should return 404 status for unmatched routes', () => {
    notFoundHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return standardized error response format', () => {
    notFoundHandler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Route not found',
    });
  });

  it('should not call next middleware', () => {
    notFoundHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
