import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		commonjsOptions: {
			transformMixedEsModules: true
		}
	},
	define: {
		'process.env': process.env
	},
	plugins: [
		vue(),
		vuetify({ autoImport: true }),
	]
})
