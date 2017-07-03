const stringify = require('json-stringify-safe');
const is = require('is');

const regEx = /.*\.([^.]*)/;
const isProd = process.env.NODE_ENV === 'production';

const mapTitle = (eTitle) => {
  const match = regEx.exec(eTitle);
  return match ? match[1] : eTitle;
};

function titleToReadable(name, inputString) {
  if (!inputString) {
    return undefined;
  }

  if (name === 'ValidationError') {
    const colonPosition = inputString.indexOf(':');
    const cutBeginning = colonPosition === -1 ? 0 : colonPosition + 2;
    return inputString.substring(cutBeginning).split(', ')
      .map(mapTitle)
      .join(', ');
  }

  if (name === 'HttpStatusError') {
    return inputString.slice(17);
  }

  return inputString;
}

function validateField(field) {
  const it = this[field];
  return is.integer(it) && is.within(it, 100, 599);
}

// returns code based on possible fields
const codeFields = ['statusCode', 'status_code', 'code', 'status'];
function getCode(body) {
  const prop = codeFields.find(validateField, body);
  return prop !== undefined ? body[prop] : 500;
}

module.exports = {
  'application/vnd.api+json': function jsonapiFormatter(req, res, body, next) {
    const response = {
      meta: {
        id: req.id(),
        ...res.meta || {},
      },
    };

    if (res.links !== undefined) {
      response.links = { ...res.links };
    }

    if (res.included !== undefined) {
      response.included = { ...res.included };
    }

    if (!isProd) {
      response.meta.timers = req.timers;
      response.meta.path = req.path();
    }

    if (body instanceof Error) {
      // check for error message
      res.statusCode = getCode(body);
      response.errors = [];

      let err;
      if (is.fn(body.toJSON)) {
        err = body.toJSON();
        const title = is.fn(body.generateMessage) ? body.generateMessage() : (err.message || err.text);
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
          stack: (isProd !== true && (is.string(body.stack) ? body.stack.split('\n') : body.stack)) || undefined,
        });
      }
    } else if (Buffer.isBuffer(body)) {
      response.data = body.toString('base64');
    } else if (body !== undefined) {
      response.data = body;
    }

    const data = stringify(response);
    res.setHeader('Content-Type', 'application/vnd.api+json');
    res.setHeader('Content-Length', Buffer.byteLength(data));

    return setImmediate(next, null, data);
  },
};
