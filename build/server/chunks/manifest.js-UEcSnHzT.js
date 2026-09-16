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
		client: {start:"_app/immutable/entry/start.Doi4g7Az.js",app:"_app/immutable/entry/app.DbW4nkvJ.js",imports:["_app/immutable/entry/start.Doi4g7Az.js","_app/immutable/chunks/BTlNhAGL.js","_app/immutable/chunks/CtOauXrc.js","_app/immutable/entry/app.DbW4nkvJ.js","_app/immutable/chunks/CtOauXrc.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-DCqj4JH8.js')),
			__memo(() => import('./nodes/1.js-ChgpktrI.js')),
			__memo(() => import('./nodes/2.js-6mVnuq_-.js'))
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
				endpoint: __memo(() => import('./entries/endpoints/api/catalogs/_server.ts.js-CxXuY_s4.js'))
			},
			{
				id: "/api/events",
				pattern: /^\/api\/events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/events/_server.ts.js-bLktEUQK.js'))
			},
			{
				id: "/api/sheets/pull",
				pattern: /^\/api\/sheets\/pull\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sheets/pull/_server.ts.js-DG3m1t5k.js'))
			},
			{
				id: "/api/sheets/tabs",
				pattern: /^\/api\/sheets\/tabs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sheets/tabs/_server.ts.js-DznlJj1V.js'))
			},
			{
				id: "/api/sheets/update-row",
				pattern: /^\/api\/sheets\/update-row\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sheets/update-row/_server.ts.js-Di_lH4LH.js'))
			},
			{
				id: "/api/sync",
				pattern: /^\/api\/sync\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/sync/_server.ts.js-DUfRh3G-.js'))
			},
			{
				id: "/api/token",
				pattern: /^\/api\/token\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/token/_server.ts.js-Dxm13ft3.js'))
			},
			{
				id: "/api/transform",
				pattern: /^\/api\/transform\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/transform/_server.ts.js-BYxAwXZ5.js'))
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
//# sourceMappingURL=manifest.js-UEcSnHzT.js.map
