const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.CllWqZk3.js",app:"_app/immutable/entry/app.Da8PkTdV.js",imports:["_app/immutable/entry/start.CllWqZk3.js","_app/immutable/chunks/DrovLG3v.js","_app/immutable/chunks/CtOauXrc.js","_app/immutable/entry/app.Da8PkTdV.js","_app/immutable/chunks/CtOauXrc.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-7jDpd7Ud.js')),
			__memo(() => import('./nodes/1.js-hk0jwj2c.js')),
			__memo(() => import('./nodes/2.js-ijO7D_Un.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/catalogs",
				pattern: /^\/api\/catalogs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/catalogs/_server.ts.js-CNp0cOCz.js'))
			},
			{
				id: "/api/sheets",
				pattern: /^\/api\/sheets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sheets/_server.ts.js-Wh0d4bxd.js'))
			},
			{
				id: "/api/sheets/update-row",
				pattern: /^\/api\/sheets\/update-row\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sheets/update-row/_server.ts.js-CpHyZOU6.js'))
			},
			{
				id: "/api/sync",
				pattern: /^\/api\/sync\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sync/_server.ts.js-Cn9Y-NGn.js'))
			},
			{
				id: "/api/token",
				pattern: /^\/api\/token\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/token/_server.ts.js-MwgOZYnO.js'))
			},
			{
				id: "/api/transform",
				pattern: /^\/api\/transform\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/transform/_server.ts.js-Br--iGQo.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-ByLyW0En.js.map
