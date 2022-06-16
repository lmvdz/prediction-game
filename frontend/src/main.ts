import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import router from './router'
import { createPinia } from 'pinia'
import { dragscrollNext } from "vue-dragscroll";
loadFonts()

createApp(App)
  .use(vuetify)
  .use(router)
  .use(createPinia())
  .directive('dragscroll', dragscrollNext)
  .mount('#app')
