<template>
    <div class="card">
        <div class="card-body">
            <h3>Update User Permission</h3><hr>

                <div class="container-fluid ">
                    <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="ไอดี">ID :</label>
                        <div class="col-sm form-inline">
                            <input type="text" class="form-control col-5" id="input" v-model="user_id" disabled>&emsp;
                        </div>
                </div>

                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="รหัสบัตรประชาชน">ID card code :</label>
                        <div class="col-sm form-inline">
                            <input type="text" class="form-control col-5" id="input" v-model="user_code">&emsp;
                        </div>
                </div>
    
    
                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="แก้ไขสิทธิ์การเข้าถึง">Access rights :</label>
                        <div class="col-sm form-inline">
                            <select class="form-control col-2" for="department" :disabled="exam_allMRG" v-model="user_role" >
                                <option value="ADM">Administrator</option>
                                <option value="SGS">Security Guards Suppervisor</option>
                                <option value="SGU">Security Guards User</option>
                                <option value="HRU">Human Resource User</option>
                                <option value="QA">Quality Assurance</option>
                                <option value="RCT">Reception</option>
                            </select>
                        </div>
                </div>

                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="รหัสพนักงาน">Firstname :</label>
                        <div class="col-sm form-inline">
                            <input type="text" class="form-control col-5" id="input" v-model="user_fname">&emsp;
                        </div>
                </div>

                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="รหัสพนักงาน">Lastname :</label>
                        <div class="col-sm form-inline">
                            <input type="text" class="form-control col-5" id="input" v-model="user_lname">&emsp;
                        </div>
                </div>


                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="รหัสพนักงาน">Remark :</label>
                        <div class="col-sm form-inline">
                            <input type="text" class="form-control col-5" id="input" v-model="user_remark">&emsp;
                        </div>
                </div>

          <!--      <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="รหัสพนักงาน">Active :</label>
                        <div class="col-sm form-inline">
                            <input type="checkbox" class="" id="input" v-model="user_active">&emsp;
                        </div>
                </div> -->

            <div class="col-3">
              <router-link :to="{ name: 'user_permission' }" class="btn btn-success ml-2 form-control" @click="updateUser">Save</router-link>
            </div>
            </div>
        </div>
    </div>
    </template>
    
    <script setup>
    import { onMounted,ref,reactive } from 'vue';
    import { useAuthStore } from '@/stores';
    import axios from 'axios';
    import { useRoute } from 'vue-router';
    import { createToast } from 'mosha-vue-toastify';
    import 'mosha-vue-toastify/dist/style.css';
    import gsap from 'gsap';
    
    const user_per = reactive([]);

    const user_id = ref();
    const user_code = ref();
    const user_pass = ref();
    const user_role = ref();
    const user_fname = ref();
    const user_lname = ref();
    const user_remark = ref();
    const user_active = ref();
    const isDataLoaded = ref(false);
    const route = useRoute();
    
    function authHeader() {
        const { user } = useAuthStore();
        const isLoggedIn = !!user?.token;
        if (isLoggedIn) {
            return { Authorization: `Bearer ${user.token}` };
        } else {
            return {};
        }
    }
    
    const updateUser = async () => {
        
    const url = process.env.VUE_APP_API_URL + '/systemuser/UpdateUser';
    
    let data = {
        SU_ID:user_id,
        SU_Code: user_code.value,
        SU_Username: user_code.value,
        SU_Password: user_pass.value,
        UR_Role: user_role.value,
        SU_Name1: user_fname.value,
        SU_Name2: user_lname.value,
        UR_remark: user_remark.value,
    }
    
    axios.post(url, data, {
        headers: authHeader()
    }).then((res) => {
        user_per.value = res.data;
    }).catch((err) => {
        console.log(err);
    });
    
    createToast('User update success.', {
        position: 'top-right',
        type: 'success',
      });
    };
    
    const LoadUserDetail = () => {
    
        const url = process.env.VUE_APP_API_URL + '/systemuser/Get_User';
    
        let data = {
            SU_ID: user_id.value
        }
    
        axios.post(url, data, {
            headers: authHeader(), 
        }).then((res) => {

            console.log(res);
    
            user_code.value = res.data[0].SU_Code;
            user_fname.value = res.data[0].SU_Name1;
            user_lname.value = res.data[0].SU_Name2;
            user_remark.value = res.data[0].SU_Remarks;
            user_role.value = res.data[0].SR_Code,


          
          isDataLoaded.value = true;
        }).catch((err) => {
            console.log(err);
        });
    };
    
    onMounted(() => {
        user_id.value =  route.params.id;
        LoadUserDetail();
        gsap.from(".card-body", {
        duration: 1,
        opacity: 0,
        y: 50,
        });
    });
    
    </script>
    
<style scoped src="./../styles/user_permission_update.css"></style>