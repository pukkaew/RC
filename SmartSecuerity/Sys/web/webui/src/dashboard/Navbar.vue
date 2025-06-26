<template>
  <!-- Navbar -->
  <nav ref="navbar" class="main-header navbar navbar-expand navbar-white navbar-light">
    <!-- Left navbar links -->
    <ul class="navbar-nav">
      <li class="nav-item">
        <a class="nav-link" data-widget="pushmenu" href="#" role="button">
          <i class="fas fa-bars"></i>
        </a>
      </li>
    </ul>
    &nbsp;&nbsp;&nbsp;
    <img src="../assets/img/LOGO_RUXCHAI_COLD_STORAGE.png" alt="Logo RC" class="img-fluid logo-image" />

    <!-- Right navbar links -->
    <ul class="navbar-nav ml-auto">
      <!-- Navbar Search -->
      <li class="nav-item">
        <a class="nav-link" data-widget="navbar-search" href="#" role="button">
          <i class="fas fa-search"></i>
        </a>
        <div class="navbar-search-block">
          <form class="form-inline">
            <div class="input-group input-group-sm">
              <input
                class="form-control form-control-navbar"
                type="search"
                placeholder="Search"
                aria-label="Search"
              />
              <div class="input-group-append">
                <button class="btn btn-navbar" type="submit">
                  <i class="fas fa-search"></i>
                </button>
                <button class="btn btn-navbar" type="button" data-widget="navbar-search">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-widget="fullscreen" href="#" role="button">
          <i class="fas fa-expand-arrows-alt"></i>
        </a>
      </li>
      <li class="nav-item">
       <button class="btn btn-outline-danger"><a @click="authStore.logout()"><i class="fa-solid fa-right-from-bracket"></i></a></button>
      </li>
    </ul>
  </nav>
  <!-- /.navbar -->
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';
import { useAuthStore } from '@/stores';

// Auth store
const authStore = useAuthStore();

// Ref for Navbar
const navbar = ref(null);

// GSAP Animation
onMounted(() => {
  gsap.from(navbar.value, {
    y: -50, 
    opacity: 0, 
    duration: 1, 
    ease: 'power2.out',
  });
});
</script>

<style>
.logout:hover {
  background-color: red;
  border-radius: 12px;
  transition: 0.5s;
}

img {
  width: 140px;
}
</style>
