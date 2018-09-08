# koa-cache-proxy

这个项目 fork 自[koa-proxy](https://github.com/popomore/koa-proxy)，在保留原有 api 的基础上拓展了其他功能，原始 api 参考原文档，下文只描述改动的部分

## 安装

```shell
npm install koa-cache-proxy -S
```

## 新特性

-  使用 async/await 代替 generate，不再支持低版本 koa2 和 node
- 增加 hook 功能对某些自定义 url 做响应
- 增加 cache 功能，可将反向代理的资源缓存在内存中，减少反向代理的次数

## 用例

- hook 功能

```js
const proxy = require('koa-cache-proxy')
...
app.use(
  proxy({
    host: 'https://alicdn.com',
    match: /^\/example(\/)?/,
    hooks: [
      {
        path: '/example/LfkFyA2UCcsn8NIr', //随便起的一个url
        handle(ctx) {
          // do something
        },
      },
    ],
 })
)
...
```

使用 hook 功能, hook 中定义的链接只会在 match 匹配的前提下生效

- cache 功能

```js
const proxy = require('koa-cache-proxy')
...
app.use(
  proxy({
    host: 'https://alicdn.com',
    match: /^\/example(\/)?/,
    cache: true //缓存所有，
    // cache: /\.html$/ 缓存所有html结尾文件
    // cache(path) { return false } 动态决定是否缓存
 })
)
...
```

cache 缓存时会连同 response header 也一并缓存

## 新增属性

使用此插件，在 koa 的 ctx 中将新增以下属性

- ctx.isCacheable

ctx.path 是否符合缓存规则

## LICENSE

Licensed under the MIT license.
