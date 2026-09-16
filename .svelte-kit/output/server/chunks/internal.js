//#region node_modules/.pnpm/@sveltejs+kit@2.70.3_@sveltejs+vite-plugin-svelte@7.3.0_svelte@5.57.0_vite@8.3.0_@types_72551ca091146849c4a30dccaf0739f9/node_modules/@sveltejs/kit/src/runtime/app/paths/internal/server.js
var base = "";
var assets = base;
var app_dir = "_app";
var initial = {
	base,
	assets
};
initial.base;
/**
* @param {{ base: string, assets: string }} paths
*/
function override(paths) {
	base = paths.base;
	assets = paths.assets;
}
function reset() {
	base = initial.base;
	assets = initial.assets;
}
/** @param {string} path */
function set_assets(path) {
	assets = initial.assets = path;
}
var prerendering = false;
function set_building() {}
function set_prerendering() {
	prerendering = true;
}
//#endregion
export { assets as a, reset as c, app_dir as i, set_assets as l, set_building as n, base as o, set_prerendering as r, override as s, prerendering as t };
