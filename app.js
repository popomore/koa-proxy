const koa = require('koa');
const app = new koa();
const proxy = require('./index2');
var Router = require('koa-router');
var serve = require('koa-static');
var parser = require('koa-bodyparser');
var router = new Router();
app.use(parser())
app.use(proxy({
	host: 'http://localhost:3008',
}));
app.use(async(ctx, next) => {
	// Set this in response header to allow for proxy request header testing
	ctx.set('host', ctx.request.header.host);
	if (ctx.path === '/error') {
		ctx.response.body = '';
		ctx.response.status = 500;
		return;
	}
	if (ctx.path === '/postme') {
		console.log("??")
		ctx.response.body = ctx.request.body;
		ctx.set('content-type', ctx.request.header['content-type']);
		ctx.response.status = 200;
		return;
	}
	if (ctx.path === '/cookie-me') {
		ctx.cookies.set('test_cookie', 'nom-nom', {
			httpOnly: false
		});
		ctx.response.status = 200;
		return;
	}
	if (ctx.path === '/check-cookie') {
		ctx.response.body = ctx.cookies.get('test_cookie');
		ctx.response.status = 200;
		return;
	}
	if (ctx.path === '/redirect') {
		ctx.redirect('http://google.com');
		return;
	}

	if (ctx.querystring) {
		ctx.response.body = ctx.querystring;
		return;
	}
	await next();
});
app.use(serve(__dirname + '/test/fixtures'));
// router.get('/index.js', proxy({
// 	url: 'http://localhost:3008/class.js'
// }));
// app.use(proxy({
// 	url: 'class.js',
// 	port: "3008"
// }));

app
	.use(router.routes())


app.listen(3008);