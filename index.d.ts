declare module 'koa-proxy' {
  import {Middleware} from 'koa'

	namespace KoaProxy {
		interface IOptions {
			host?: string;
			match?: RegExp;
			map?: (path: string)=> string | {[key: string]: string};
      jar?: boolean;
      url?: string;
      suppressRequestHeaders?: string[];
      suppressResponseHeaders?: string[];
		}
	}

	interface IKoaProxy {
		(opts: KoaProxy.IOptions): Middleware;
	}

	let proxy: IKoaProxy;
	export = proxy;
}
