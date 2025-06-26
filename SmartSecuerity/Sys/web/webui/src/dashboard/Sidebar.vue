<template>
   <aside ref="sidebar" class="main-sidebar sidebar-dark-primary elevation-4" id="sidebar">
      <a class="brand-link">
         <div class="centered-content">
            <span class="brand-text font-weight-light"><b>Smart Security 2</b></span>
         </div>
      </a>

      <div class="sidebar">
         <div>
            <center>
               <div class="image">
                  <i class="fas fa-user-circle icon-color icon-top"></i>
               </div>
            </center>
            <div class="info mt-2">
               <a class="d-block">{{ UserName }}</a>
            </div>
         </div>
         <br>
         <nav class="mt-2">
            <ul class="nav nav-pills nav-sidebar flex-column" role="menu">
              <!-- <li class="nav-item mb-2" :class="{ 'nav-link-active': selectedMenuItem === 'access' }">
                  <router-link to="/access" class="nav-link" @click="handleMenuItemClick('access')">
                     <i class="fa-solid fa-server"></i>&nbsp;
                     <p>Access</p>
                  </router-link>
               </li>  -->
               <li class="nav-item mb-2" :class="{ 'nav-link-active': selectedMenuItem === 'wayinout' }" >
                  <router-link to="/wayinout" class="nav-link" @click="handleMenuItemClick('wayinout')">
                     <i class="fa-solid fa-server"></i>&nbsp;
                     <p>Access Company List</p>
                  </router-link>
               </li>

               <li class="nav-item" v-if="isAdmin"
                  :class="{ 'nav-link-active': selectedMenuItem === 'user_permission' }">
                  <router-link to="/user_permission" class="nav-link" @click="handleMenuItemClick('user_permission')">
                     <i class="fa-solid fa-user-gear"></i>&nbsp;
                     <p>Admin</p>
                  </router-link>
               </li>
            </ul>
         </nav>
      </div>
   </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';

const UserName = ref(null);
const isAdmin = ref(false);
const selectedMenuItem = ref(null);
const sidebar = ref(null);

onMounted(() => {
   gsap.from(sidebar.value, {
      x: '-100%',
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
   });

   const usersJson = localStorage.getItem('user');
   if (usersJson) {
      const usersData = JSON.parse(usersJson);
      UserName.value = usersData[0]?.SU_Name1 || 'Unknown User';

      const role = usersData.userRoleValue || '';
      isAdmin.value = role === 'ADM';
   }
});

const handleMenuItemClick = (menuItem) => {
   selectedMenuItem.value = menuItem;
};

</script>

<style scoped>
b {
   font-size: 25px;
}

.brand-text {
   margin: 10px;
   display: flex;
   flex-direction: column;
   align-items: center;
   text-align: center;
}

.image {
   text-align: center;
}

.icon-color {
   font-size: 33px;
   color: rgb(221, 221, 221);
   margin: 0 auto;
}

.icon-top {
   margin-top: 15px;
}

.info a {
   max-width: 120px;
   overflow-wrap: break-word;
   white-space: pre-wrap;
   align-items: center;
   text-align: center;
   font-size: 18px;
   margin: 0 auto;
}

.nav-link-active {
   background-color: #408ab4;
   color: #ffffff;
}

#sidebar {
   background-color: #194F91;
}
</style>