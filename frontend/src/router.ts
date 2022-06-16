import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes = [
    
    {
        path: '/',
        component: () => import('./components/HelloWorld.vue')
    } as RouteRecordRaw

] as Array<RouteRecordRaw>

export default createRouter({
    history: createWebHistory(),
    routes
})