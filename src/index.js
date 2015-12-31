'use strict';

const stringify = require('json-stringify-safe');
const isProd = process.env.NODE_ENV === 'production';

const titleToReadable = function(inputString) {
  const regEx = /.*\.([^.]*)/;
  if (!inputString) {
    return undefined;
  }
  return inputString.substring(inputString.indexOf(':') + 2).split(', ').map((eTitle) => {
    return regEx.exec(eTitle)[1];
  }).join(', ');
};

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
      res.statusCode = body.statusCode || body.code || body.status_code || 500;
      response.errors = [];

      let err;
      if (typeof body.toJSON === 'function') {
        err = body.toJSON();
        const title = typeof body.generateMessage === 'function' ? body.generateMessage() : (err.message || err.text);
        response.errors.push({
          status: body.name,
          code: res.statusCode,
          title: titleToReadable(title),
          detail: err.errors,
        });
      } else {
        const title = isProd ? undefined : (typeof body.stack === 'string' ? body.stack.split('\n') : body.stack);
        response.errors.push({
          status: body.name || 'InternalServerError',
          code: res.statusCode,
          title: body.toString(),
          detail: body.reason || body.errors || {},
          stack: titleToReadable(title),
        });
      }

      ///////////////////// readable format of title


      ///////////
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
