<template>
  <div>

      <Navbar></Navbar>
      <Sidebar v-if="sidebarVisible"></Sidebar>

      <div class="content-wrapper">
        
        <ContentHeader></ContentHeader>
        
        <section class="content">
          <div class="container-fluid">
                 <RouterView />
          </div>
        </section>
        
      </div>
      
      <Footer></Footer>

  </div>
</template>

<script setup>
import { onMounted,ref } from 'vue';
import { RouterView } from 'vue-router';

import "../../node_modules/admin-lte/plugins/select2-bootstrap4-theme/select2-bootstrap4.min.css"
import "../../node_modules/admin-lte/plugins/select2/css/select2.min.css"

import ContentHeader from "../dashboard/ContentHeader.vue"
import Navbar from "../dashboard/Navbar.vue";
import Sidebar from "../dashboard/Sidebar.vue";
import Footer from "../dashboard/Footer.vue";

const sidebarVisible = ref(false);


onMounted(() => {
  sidebarVisible.value = true;

});
</script>

<style lang="scss">

</style>