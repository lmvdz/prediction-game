import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

export const routes = [
    {
        path: '/v2',
        component: () => import('./components/HelloWorld.vue'),
        props: {
            v2: true
        }
    } as RouteRecordRaw,
    {
        path: '/v2/:game',
        component: () => import('./components/HelloWorld.vue'),
        props: (route) => ({
            v2: true,
            gstring: route.params.game
        })
    } as RouteRecordRaw,
    {
        path: '/',
        component: () => import('./components/HelloWorld.vue')
    } as RouteRecordRaw,
    {
        path: '/:game',
        component: () => import('./components/HelloWorld.vue'),
        props: (route) => ({
            gstring: route.params.game
        })
    } as RouteRecordRaw,
    

] as Array<RouteRecordRaw>

export default createRouter({
    history: createWebHistory(),
    routes
})