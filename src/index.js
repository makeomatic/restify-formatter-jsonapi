const stringify = require('json-stringify-safe');
const isProd = process.env.NODE_ENV === 'production';

function titleToReadable(name, inputString) {
  if (name === 'ValidationError') {
    const colonPosition = inputString.indexOf(':');
    const cutBeginning = colonPosition === -1 ? 0 : colonPosition + 2;
    const regEx = /.*\.([^.]*)/;
    if (!inputString) {
      return undefined;
    }
    return inputString.substring(cutBeginning).split(', ').map(eTitle => {
      const match = regEx.exec(eTitle);
      return match ? match[1] : eTitle;
    }).join(', ');
  }
}

module.exports = {
  'application/vnd.api+json': function jsonapiFormatter(req, res, body, next) {
    const response = {
      meta: {
        id: req.id(),
      },
    };

    if (res.meta) {
      Object.assign(response.meta, res.meta);
    }

    if (res.links) {
      response.links = Object.assign({}, res.links);
    }

    if (!isProd) {
      response.meta.timers = req.timers;
    }

    if (body instanceof Error) {
      // check for error message
      res.statusCode = body.statusCode || body.status_code || typeof body.code !== 'string' && body.code || 500;
      response.errors = [];

      let err;
      if (typeof body.toJSON === 'function') {
        err = body.toJSON();
        const title = typeof body.generateMessage === 'function' ? body.generateMessage() : (err.message || err.text);
        response.errors.push({
          status: body.name,
          code: res.statusCode,
          title: titleToReadable(body.name, title),
          detail: err.errors,
        });
      } else {
        response.errors.push({
          status: body.name || 'InternalServerError',
          code: res.statusCode,
          title: titleToReadable(body.name, body.toString()),
          detail: body.reason || body.errors || {},
          stack: !isProd && (typeof body.stack === 'string' && body.stack.split('\n') || body.stack) || undefined,
        });
      }
    } else if (Buffer.isBuffer(body)) {
      response.data = body.toString('base64');
    } else if (body) {
      response.data = body;
    }

    const data = stringify(response);
    res.setHeader('Content-Type', 'application/vnd.api+json');
    res.setHeader('Content-Length', Buffer.byteLength(data));

    return next(null, data);
  },
};
