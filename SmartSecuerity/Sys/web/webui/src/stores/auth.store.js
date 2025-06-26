import { defineStore } from "pinia";

import { fetchWrapper, router } from "@/helpers";

const baseUrl = process.env.VUE_APP_API_URL + "/users";

import Swal from "sweetalert2";

function successLogin() {
  Swal.fire({
    position: "center",
    icon: "success",
    title: "Login Success!",
    showConfirmButton: false,
    timer: 1500,
  });
}

export const useAuthStore = defineStore({
  id: "auth",
  state: () => ({
    // initialize state from local storage to enable user to stay logged in
    user: JSON.parse(localStorage.getItem("user")),
    returnUrl: null,
  }),
  actions: {
    async login(username, password) {
        const user = await fetchWrapper.post(`${baseUrl}/authenticate`, {
          username,
          password,
        });
        // console.log("User:", user);

        // update pinia state
        this.user = user;

        const isAdmin = user.userRoleValue === "ADM";
        const isReception = user.userRoleValue === "RCT";
        const isQA = user.userRoleValue === "QA";

        if(isAdmin){
          console.log('User is Admin');
        }

        if(isQA){
          console.log('User is QA');
        }

        if(isReception){
            console.log("User is Reception");
        }

        try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch (err) {
        // successAlert();
        router.push(this.returnUrl || "/access");
      }

      // redirect to previous url or default to home page
      // successAlert();
      router.push(this.returnUrl || "/access");
    },
    logout() {
      this.user = null;
      localStorage.removeItem("user");
      router.push("/login");
    },
  },
});
