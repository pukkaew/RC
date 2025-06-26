<template>
    <div class="card">
        <div class="card-body">
            <h3>Create User Permission</h3>
            <hr>
            <div class="container-fluid ">

                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="รหัสบัตรประชาชน">ID card code :</label>
                    <div class="col-sm form-inline">
                        <input type="text" class="form-control col-5" id="input" v-model="user_code">&emsp;
                    </div>
                </div>
                
                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="">Password :</label>
                    <div class="col-sm form-inline">
                        <input type="text" class="form-control col-5" id="input" v-model="user_pass">&emsp;
                    </div>
                </div>

                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="แก้ไขสิทธิ์การเข้าถึง">Access rights
                        :</label>
                    <div class="col-sm form-inline">
                        <select class="form-control col-2" for="department" :disabled="exam_allMRG" v-model="user_role">
                            <option value="ADM">Administrator</option>
                            <option value="SGS">Security Guards Suppervisor</option>
                            <option value="SGU">Security Guards User</option>
                            <option value="HRU">Human Resource User</option>
                            <option value="EMP">Employee User</option>
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
                    <label for="input" class="col-sm-1 col-form-label" title="Pin Code">Pincode :</label>
                    <div class="col-sm form-inline">
                        <input type="text" class="form-control col-5" id="input" v-model="user_pincode">&emsp;
                    </div>
                </div>

                <div class="form-group form-row align-items-center">
                    <label for="input" class="col-sm-1 col-form-label" title="Remark">Remark :</label>
                    <div class="col-sm form-inline">
                        <input type="text" class="form-control col-5" id="input" v-model="user_remark">&emsp;
                    </div>
                </div>

                <div class="col-3">
                    <router-link :to="{ name: 'user_permission' }" class="btn btn-success form-control"
                        @click="triggerSaveAnimation">
                        <p>Save</p>
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import gsap from 'gsap';
import { useAuthStore } from '@/stores';
import axios from 'axios';
import { createToast } from 'mosha-vue-toastify';
import 'mosha-vue-toastify/dist/style.css';

const user_code = ref('');
const user_pass = ref('');
const user_role = ref('');
const user_fname = ref('');
const user_lname = ref('');
const user_remark = ref('');
const user_pincode = ref('');

function authHeader() {
    const { user } = useAuthStore();
    const isLoggedIn = !!user?.token;
    if (isLoggedIn) {
        return { Authorization: `Bearer ${user.token}` };
    } else {
        return {};
    }
}   

const triggerSaveAnimation = () => {
    gsap.to(".btn-success", {
        scale: 1.1,
        backgroundColor: "#28a745",
        duration: 0.2,
        yoyo: true,
        repeat: 1,
    });
    createUser();
};  

const createUser = async () => {
    const url = process.env.VUE_APP_API_URL + '/systemuser/NewUser';
    let data = {
        UR_ID: 123,
        SU_Code: user_code.value,
        SU_Username: user_code.value,
        SU_Password: user_pass.value,
        UR_Role: user_role.value,
        SU_Name1: user_fname.value,
        SU_Name2: user_lname.value,
        UR_remark: user_remark.value,
        user_pincode: user_pincode.value,
    };

    axios.post(url, data, { headers: authHeader() })
        .then((res) => {
            createToast('Create user permission success.', {
                position: 'top-right',
                type: 'success',
    
            });
        })
        .catch((err) => {
            console.error(err);
        });
};  

onMounted(() => {
    gsap.from(".card-body", {
        duration: 1,
        opacity: 0,
        y: 50,
        ease: "power3.out",
    });
}); 
</script>

    
<style scoped src="./../styles/user_permission_create.css" ></style>