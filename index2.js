'use strict';

const join = require('url').resolve;
const iconv = require('iconv-lite');
const asyncRequest = require('./libs/async-request');

module.exports = function(options) {
	options || (options = {})
	var request = asyncRequest.defaults({
		cookieJar: options.jar === true,
	});
	if (!(options.host || options.map || options.url)) {
		throw new Error('miss options');
	}
	return async function(ctx, next) {
		let url = resolve(ctx.path, options);
		if (!url) {
			return await next();
		}
		// if match option supplied, restrict proxy to that match
		if (options.match) {
			if (!url.match(options.match)) {
				return await next();
			}
		}
		let parsedBody = getParsedBody(ctx);
		url = url + (ctx.request.querystring ? '?' + ctx.request.querystring : '');
		var opt = {
			uri: url,
			headers: ctx.request.headers,
			encoding: null,
			followRedirect: options.followRedirect === false ? false : true,
			method: ctx.request.method,
			body: parsedBody,
		};

		// set 'Host' header to options.host (without protocol prefix), strip trailing slash
		if (options.host) opt.headers.host = options.host.slice(options.host.indexOf('://') + 3).replace(/\/$/, '');
		if (options.requestOptions) {
			if (typeof options.requestOptions === 'function') {
				opt = options.requestOptions(ctx.request, opt);
			} else {
				Object.keys(options.requestOptions).forEach(function(option) {
					opt[option] = options.requestOptions[option];
				});
			}
		}
		/*async request*/
		try {
			var res = await request(url, opt);
		} catch (e) {
			//some handle
			// throw new Error("request error" + e);
			console.log("catch error" + e);
		}
		ctx.response.status = res ? res.statusCode : 500;
		//set the response fields
		let responseHeaders = res ? res.headers : null;
		let responseBody = res ? res.body : null;
		ctx.response.set(responseHeaders);
		if (options.encoding === 'gbk') {
			ctx.response.body = iconv.decode(res.body, 'gbk');
			return;
		}
		ctx.response.body = responseBody;
		/*maybe should change this opts*/
		if (options.yieldNext) {
			await next();
		}
	}
}

/*util method*/
function getParsedBody(ctx) {
	var body = ctx.request.body;
	if (body === undefined || body === null) {
		return undefined;
	}
	var contentType = ctx.request.header['content-type'];
	if (!Buffer.isBuffer(body) && typeof body !== 'string') {
		if (contentType && contentType.indexOf('json') !== -1) {
			body = JSON.stringify(body);
		} else {
			body = body + '';
		}
	}
	return body;
}

function resolve(path, options, local) {
	var url = options.url;
	if (url) {
		if (!/^http/.test(url)) {
			url = options.host ? join(options.host, url) : null;
			if (options.port) {
				//check agagin(硬编码强行支持指向本机文件,暂不知道v1版本为什么不会有这个问题)
				url = "http://localhost:" + options.port + "/" + options.url;
			}
		}
		return ignoreQuery(url);
	}

	if (typeof options.map === 'object') {
		if (options.map && options.map[path]) {
			path = ignoreQuery(options.map[path]);
		}
	} else if (typeof options.map === 'function') {
		path = options.map(path);
	}
	return options.host ? join(options.host, path) : null;
}

function ignoreQuery(url) {
	return url ? url.split('?')[0] : null;
}