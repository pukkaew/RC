<template>
  <body class="hold-transition sidebar-mini layout-fixed">
    <div class="wrapper">
     <RouterView />
    </div>
  </body>
</template>

<script setup>
  import './assets/s6773code.css';
</script>

<style>
  .wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
</style>
