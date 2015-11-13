const stringify = require('json-stringify-safe');
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  'application/vnd.api+json': function jsonapiFormatter(req, res, body, next) {
    const response = {
      meta: {
        id: req.id(),
      },
    };

    if (!isProd) {
      response.meta.timers = req.timers;
    }

    if (body instanceof Error) {
      // check for error message
      res.statusCode = body.statusCode || body.code || 500;
      response.errors = [];

      let err;
      if (typeof body.toJSON === 'function') {
        err = body.toJSON();
        response.errors.push({
          status: body.name,
          code: res.statusCode,
          title: err.message,
          detail: err.errors,
        });
      } else {
        response.errors.push({
          status: body.name || 'InternalServerError',
          code: res.statusCode,
          title: body.toString(),
          stack: isProd ? undefined : body.stack,
        });
      }
    } else if (Buffer.isBuffer(body)) {
      response.data = body.toString('base64');
    } else {
      response.data = body;
    }

    const data = stringify(response);
    res.setHeader('Content-Type', 'application/vnd.api+json');
    res.setHeader('Content-Length', Buffer.byteLength(data));

    return next(null, data);
  },
};
