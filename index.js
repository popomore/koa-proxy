const join = require('url').resolve
const iconv = require('iconv-lite')
const LRU = require('lru-cache')
const requestPromise = require('request-promise-native')

module.exports = function(options = {}) {
  if (!(options.host || options.map || options.url)) {
    throw new Error('miss options')
  }
  const lruCache = LRU(options.lruOptions)

  return async function proxy(ctx, next) {
    const url = resolve(ctx.path, options)

    if (typeof options.suppressRequestHeaders === 'object') {
      options.suppressRequestHeaders.forEach(function(h, i) {
        options.suppressRequestHeaders[i] = h.toLowerCase()
      })
    }

    const suppressResponseHeaders = [] // We should not be overwriting the options object!
    if (typeof options.suppressResponseHeaders === 'object') {
      options.suppressResponseHeaders.forEach(function(h, i) {
        suppressResponseHeaders.push(h.toLowerCase())
      })
    }

    // don't match
    if (!url) {
      return next()
    }

    // if match option supplied, restrict proxy to that match
    if (options.match) {
      if (!ctx.path.match(options.match)) {
        return next()
      }
    }

    ctx.proxyLruCache = lruCache

    // if match hook path
    if (options.hooks) {
      for (const { path, handle } of options.hooks) {
        if (ctx.path === path) {
          if (typeof handle === 'function') {
            return handle(ctx)
          }
        }
      }
    }
    if (options.cache) {
      let isCacheable = options.cache
      if (isCacheable instanceof RegExp) {
        isCacheable = isCacheable.test(ctx.path)
      } else if (isCacheable instanceof Function) {
        isCacheable = !!isCacheable(ctx.path)
      }
      if (isCacheable) {
        const content = lruCache.get(ctx.path)
        if (content) {
          ctx.body = content
          if (options.yieldNext) {
            await next()
          }
          return
        } else {
          ctx.proxyIsCacheable = true
        }
      }
    }

    const parsedBody = getParsedBody(ctx)

    let opt = {
      uri: url + (ctx.querystring ? '?' + ctx.querystring : ''),
      headers: ctx.header,
      method: ctx.method,
      encoding: null,
      followRedirect: options.followRedirect !== false,
      body: parsedBody,
      resolveWithFullResponse: true
    }

    // set 'Host' header to options.host (without protocol prefix), strip trailing slash
    if (options.host) {
      opt.headers.host = options.host
        .slice(options.host.indexOf('://') + 3)
        .replace(/\/$/, '')
    }

    if (options.requestOptions) {
      if (typeof options.requestOptions === 'function') {
        opt = options.requestOptions(ctx.request, opt)
      } else {
        Object.keys(options.requestOptions).forEach(function(option) {
          opt[option] = options.requestOptions[option]
        })
      }
    }

    for (const name in opt.headers) {
      if (
        options.suppressRequestHeaders &&
        options.suppressRequestHeaders.indexOf(name.toLowerCase()) >= 0
      ) {
        delete opt.headers[name]
      }
    }

    const res = await requestPromise(opt).catch(error => {
      if (error.statusCode === 304) return { statusCode: 304, headers: {} }
      return Promise.reject(error)
    })
    ctx.status = res.statusCode
    for (const name in res.headers) {
      // http://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
      if (suppressResponseHeaders.indexOf(name.toLowerCase()) >= 0) {
        continue
      }
      if (name === 'transfer-encoding') {
        continue
      }
      ctx.set(name, res.headers[name])
    }

    if (options.encoding === 'gbk') {
      ctx.body = iconv.decode(res.body, 'gbk')
      return
    }
    if (Buffer.isBuffer(res.body)) {
      ctx.body = res.body.toString()
    } else {
      ctx.body = res.body
    }
    if (ctx.proxyIsCacheable) {
      if (ctx.body && ctx.status === 200) {
        lruCache.set(ctx.path, ctx.body)
      }
    }
    if (options.yieldNext) {
      return next()
    }
  }
}

function resolve(path, options) {
  let url = options.url
  if (url) {
    if (!/^http/.test(url)) {
      url = options.host ? join(options.host, url) : null
    }
    return ignoreQuery(url)
  }

  if (typeof options.map === 'object') {
    if (options.map && options.map[path]) {
      path = ignoreQuery(options.map[path])
    }
  } else if (typeof options.map === 'function') {
    path = options.map(path)
  }

  return options.host ? join(options.host, path) : null
}

function ignoreQuery(url) {
  return url ? url.split('?')[0] : null
}

function getParsedBody(ctx) {
  let body = ctx.request.body
  if (body === undefined || body === null) {
    return undefined
  }
  const contentType = ctx.request.header['content-type']
  if (!Buffer.isBuffer(body) && typeof body !== 'string') {
    if (contentType && contentType.indexOf('json') !== -1) {
      body = JSON.stringify(body)
    } else {
      body = body + ''
    }
  }
  return body
}
