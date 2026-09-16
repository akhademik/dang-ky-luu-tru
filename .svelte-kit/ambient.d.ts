
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const AUTH_BASIC_AUTH: string;
	export const AUTH_GRANT_TYPE: string;
	export const AUTH_PASSWORD: string;
	export const AUTH_USERNAME: string;
	export const GOOGLE_APPS_SCRIPT_URL: string;
	export const GOOGLE_SHEET_ID: string;
	export const KBTT_BASE_URL: string;
	export const PORT: string;
	export const SVELTEKIT_FORK: string;
	export const INIT_CWD: string;
	export const HOSTTYPE: string;
	export const PNPM_HOME: string;
	export const WSL2_GUI_APPS_ENABLED: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const NVM_CD_FLAGS: string;
	export const NAME: string;
	export const COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
	export const NVM_DIR: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const npm_package_json: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const OLDPWD: string;
	export const ANTIGRAVITY_CONVERSATION_ID: string;
	export const WSL_DISTRO_NAME: string;
	export const PAGER: string;
	export const COREPACK_ROOT: string;
	export const npm_execpath: string;
	export const NVM_INC: string;
	export const PATH: string;
	export const npm_command: string;
	export const LOGNAME: string;
	export const ANTIGRAVITY_AGENT: string;
	export const HOME: string;
	export const VISUAL: string;
	export const WSL_INTEROP: string;
	export const ANTIGRAVITY_SOURCE_METADATA: string;
	export const BUN_INSTALL: string;
	export const NVM_BIN: string;
	export const npm_node_execpath: string;
	export const WT_SESSION: string;
	export const ANTIGRAVITY_PROJECT_ID: string;
	export const P9K_TTY: string;
	export const npm_package_name: string;
	export const SHLVL: string;
	export const WT_PROFILE_ID: string;
	export const WAYLAND_DISPLAY: string;
	export const ZSH: string;
	export const LSCOLORS: string;
	export const USER: string;
	export const npm_config_user_agent: string;
	export const ANTIGRAVITY_CSRF_TOKEN: string;
	export const _: string;
	export const _P9K_SSH_TTY: string;
	export const PULSE_SERVER: string;
	export const TERM: string;
	export const LESS: string;
	export const ANTIGRAVITY_LS_VERSION: string;
	export const SHELL: string;
	export const ANTIGRAVITY_AGENTAPI_EXE: string;
	export const npm_config_node_gyp: string;
	export const NODE: string;
	export const XDG_RUNTIME_DIR: string;
	export const P9K_SSH: string;
	export const DISPLAY: string;
	export const LANG: string;
	export const NODE_ENV: string;
	export const LAUNCH_EDITOR: string;
	export const LS_COLORS: string;
	export const npm_lifecycle_script: string;
	export const npm_package_version: string;
	export const WSLENV: string;
	export const ANTIGRAVITY_LS_ADDRESS: string;
	export const ANTIGRAVITY_TRAJECTORY_ID: string;
	export const npm_lifecycle_event: string;
	export const NODE_PATH: string;
	export const EDITOR: string;
	export const GIT_PAGER: string;
	export const PWD: string;
	export const _P9K_TTY: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		AUTH_BASIC_AUTH: string;
		AUTH_GRANT_TYPE: string;
		AUTH_PASSWORD: string;
		AUTH_USERNAME: string;
		GOOGLE_APPS_SCRIPT_URL: string;
		GOOGLE_SHEET_ID: string;
		KBTT_BASE_URL: string;
		PORT: string;
		SVELTEKIT_FORK: string;
		INIT_CWD: string;
		HOSTTYPE: string;
		PNPM_HOME: string;
		WSL2_GUI_APPS_ENABLED: string;
		PNPM_SCRIPT_SRC_DIR: string;
		NVM_CD_FLAGS: string;
		NAME: string;
		COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
		NVM_DIR: string;
		pnpm_config_verify_deps_before_run: string;
		npm_package_json: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		OLDPWD: string;
		ANTIGRAVITY_CONVERSATION_ID: string;
		WSL_DISTRO_NAME: string;
		PAGER: string;
		COREPACK_ROOT: string;
		npm_execpath: string;
		NVM_INC: string;
		PATH: string;
		npm_command: string;
		LOGNAME: string;
		ANTIGRAVITY_AGENT: string;
		HOME: string;
		VISUAL: string;
		WSL_INTEROP: string;
		ANTIGRAVITY_SOURCE_METADATA: string;
		BUN_INSTALL: string;
		NVM_BIN: string;
		npm_node_execpath: string;
		WT_SESSION: string;
		ANTIGRAVITY_PROJECT_ID: string;
		P9K_TTY: string;
		npm_package_name: string;
		SHLVL: string;
		WT_PROFILE_ID: string;
		WAYLAND_DISPLAY: string;
		ZSH: string;
		LSCOLORS: string;
		USER: string;
		npm_config_user_agent: string;
		ANTIGRAVITY_CSRF_TOKEN: string;
		_: string;
		_P9K_SSH_TTY: string;
		PULSE_SERVER: string;
		TERM: string;
		LESS: string;
		ANTIGRAVITY_LS_VERSION: string;
		SHELL: string;
		ANTIGRAVITY_AGENTAPI_EXE: string;
		npm_config_node_gyp: string;
		NODE: string;
		XDG_RUNTIME_DIR: string;
		P9K_SSH: string;
		DISPLAY: string;
		LANG: string;
		NODE_ENV: string;
		LAUNCH_EDITOR: string;
		LS_COLORS: string;
		npm_lifecycle_script: string;
		npm_package_version: string;
		WSLENV: string;
		ANTIGRAVITY_LS_ADDRESS: string;
		ANTIGRAVITY_TRAJECTORY_ID: string;
		npm_lifecycle_event: string;
		NODE_PATH: string;
		EDITOR: string;
		GIT_PAGER: string;
		PWD: string;
		_P9K_TTY: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
