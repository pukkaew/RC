import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores';

export const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes: [
         {
            path: '/',
            component: () => import('../layouts/DefaultLayout.vue'),
            children: [

              {
                path: '/wayinout',
                name: 'wayinout',
                component: () => import('../views/wayinout/wayinout.vue')
              },
              {
                path: '/access',
                name: 'access',
                component: () => import('../views/access/access.vue')
              },

              {
                path: '/user_permission_update/:id',
                name: 'user_permission_update',
                component: () => import('../views/user.permission/user_permission_update.vue')
              },
              {
                path: '/user_permission_create',
                name: 'user_permission_create',
                component: () => import('../views/user.permission/user_permission_create.vue')
              },

              {
                path: '/user_permission',
                name: 'user_permission',
                component: () => import('../views/user.permission/user_permission.vue')
              },
              


              /*{
                path: '/user_permission_update/:id',
                name: 'user_permission_update',
                component: () => import('../views/user.permission/user_permission_update.vue')
              }, */       
            ]
          }, 
          {
            path: '/login',
            component: () => import('../layouts/BlankLayout.vue'),
            children: [
              {
                path: '',
                name: 'LoginPage',
                component: () => import('../views/login/login.vue')
              }
            ]
          }
    ]
});

router.beforeEach(async (to, from, next) => {
  const publicPages = ['/login'];
  const authRequired = !publicPages.includes(to.path);
  const auth = useAuthStore();
  const role = "admin";

  // Check if the route has requiredRoles specified
  if (to.meta.requiredRoles) {
    // Check if the user's role matches any of the required roles
    if (!auth.user || !to.meta.requiredRoles.includes(role)) {
      // User's role is not authorized to access this route
      next('/forbidden'); // Redirect to a forbidden page or another appropriate route
    } else {
      // User has the required role, allow navigation
      next();
    }
  } else if (authRequired && !auth.user) {
    auth.returnUrl = to.fullPath;
    next('/login');
  } else {
    // No role requirements for this route, allow navigation
    next();
  }

  // After a successful login, redirect to the /examlist page
  if (to.path === '/login' && auth.user) {
    next('/wayinout');
  }

  if (window.location.href === 'http://localhost:8080/') {
  window.location.href = 'http://localhost:8080/login';
  }
  
});
