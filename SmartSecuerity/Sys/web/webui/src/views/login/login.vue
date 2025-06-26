<template>
  <div class="login-wrapper">
    <div class="snowflakes">
      <div v-for="n in 50" :key="n" class="snowflake" :style="{
        '--delay': `${Math.random() * 5}s`,
        '--duration': `${Math.random() * 3 + 2}s`,
        'left': `${Math.random() * 100}vw`,
        'opacity': Math.random(),
        '--size': `${Math.random() * 6 + 4}px`
      }">
        {{ ['❄', '❅', '❆', '•'][Math.floor(Math.random() * 4)] }}
      </div>
    </div>

    <div class="background-gradient"></div>

    <div class="container">
      <div class="row justify-content-center align-items-center vh-100">
        <div class="col-md-5">
          <div class="card login-card" :class="{ 'card-hover': isHovering }">
            <div class="card-decoration top-left"></div>
            <div class="card-decoration top-right"></div>
            <div class="card-decoration bottom-left"></div>
            <div class="card-decoration bottom-right"></div>

            <div class="card-body text-center">
              <div class="logo-container" @mouseenter="isHovering = true" @mouseleave="isHovering = false">
                <img src="../../assets/img/LOGO_RUXCHAI_COLD_STORAGE.png" alt="Login Image"
                  class="img-fluid mb-4 logo-image">
                <div class="logo-reflection"></div>
              </div>

              <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }" class="login-form">
                <div class="form-group">
                  <label class="input-label">
                    <span class="label-text">ชื่อผู้ใช้</span>
                  </label>
                  <div class="input-wrapper">
                    <i class="fas fa-user input-icon"></i>
                    <Field name="username" type="text" class="form-control custom-input"
                      :class="{ 'is-invalid': errors.username }" @keyup.enter="focusPassword" />
                    <div class="input-line"></div>
                  </div>
                  <div class="invalid-feedback">{{ errors.username }}</div>
                </div>

                <div class="form-group">
                  <label class="input-label">
                    <span class="label-text">รหัสผ่าน</span>
                  </label>
                  <div class="input-wrapper">
                    <i class="fas fa-lock input-icon"></i>
                    <Field name="password" :type="showPassword ? 'text' : 'password'" class="form-control custom-input"
                      :class="{ 'is-invalid': errors.password }" />
                    <!-- <i class="fas password-toggle" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"
                      @click="showPassword = !showPassword"></i> -->
                    <div class="input-line"></div>
                  </div>
                  <div class="invalid-feedback">{{ errors.password }}</div>
                </div>

                <div class="form-group">
                  <button class="login-button" :disabled="isSubmitting">
                    <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-2"></span>
                    <i class="fas fa-sign-in-alt mr-2"></i>
                    <span>เข้าสู่ระบบ</span>
                    <div class="button-background"></div>
                  </button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as Yup from 'yup';
import { Form, Field } from 'vee-validate';
import Swal from 'sweetalert2';
import { useAuthStore } from '@/stores';
import { onMounted, ref } from 'vue';
import gsap from 'gsap';

// import { createToast } from 'mosha-vue-toastify';

const isHovering = ref(false);
const showPassword = ref(false);

const schema = Yup.object().shape({
  username: Yup.string(),
  password: Yup.string()
});

function errorAlert() {
  Swal.fire({
    position: "center",
    icon: "error",
    title: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!",
    showConfirmButton: false,
    timer: 1500,
    background: 'rgba(255, 255, 255, 0.98)',
    customClass: {
      popup: 'animated-alert',
      title: 'alert-title'
    }
  });
}

function onSubmit(values, { setErrors }) {
  const authStore = useAuthStore();
  const { username, password } = values;

  return authStore
    .login(username, password)
    .catch(error => {
      setErrors({ apiError: error });
      errorAlert();
    });
}

function focusPassword(e) {
  e.preventDefault();
  document.querySelector('[name="password"]').focus();
}

</script>

<style scoped src="./../styles/login.css"></style>