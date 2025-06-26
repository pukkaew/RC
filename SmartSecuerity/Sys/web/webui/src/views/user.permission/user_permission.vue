<template>
  <div class="card">
    <div class="card-body">
      <div class="container-fluid">
        <h3>User Permission List</h3><br>
        <div class="form-group d-flex align-items-center">
          <label for="searchQuestion">Search user :</label>&emsp;
          <input type="text" class="form-control col-3" id="searchQuestion" v-model="searchQuery"
            @input="GetList_UserByParameter">
        </div>
        <router-link :to="{ name: 'user_permission_create' }" class="create-button" title="Create User"
          style="float: right;">
          <i class="fas fa-plus"></i> Create User
        </router-link>
        <br><br>
        <div class="scrolling-container">
          <table class="table table-striped">
            <thead align="center">
              <tr>
                <th>ID</th>
                <th>SU_Code</th>
                <th>SU_Name1</th>
                <th>SU_Name2</th>
                <th>SU_Username</th>
                <th>SU_Password</th>
                <th>SU_Remarks</th>

                <th class="col-2 text-align">Edit Role</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in user_per.value" :key="index" align="center">
                <td>{{ item.SU_ID }}</td>
                <td>{{ item.SU_Code }}</td>
                <td>{{ item.SU_Name1 }}</td>
                <td>{{ item.SU_Name2 }}</td>

                <td>{{ item.SU_Username }}</td>
                <td>{{ item.SU_Password }}</td>
                <td>{{ item.SU_Remarks }}</td>

                <!--                   <td>{{ item.UR_Role === 1 ? 'Admin' : item.UR_Role === 2 ? 'Creater' : item.UR_Role === 3 ? 'User' : '' }}</td> -->
                <td>
                  <router-link :to="{ name: 'user_permission_update', params: { id: item.SU_ID } }"
                    class="btn edit-button" title="Edit User">
                    <i class="fas fa-edit"></i> แก้ไขข้อมูล
                  </router-link>
                  <!--                     <button class="btn btn-danger btn-dan btn-sm ml-2" @click="deleteUser(item.SU_ID)">
                      <i class="fas fa-eraser"></i> 
                      Delete
                    </button> -->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeMount, onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '@/stores';
import axios from 'axios';

const user_per = reactive([]);
const searchQuery = ref('');

const filteredUser = () => {
  // ตรวจสอบคำค้นหาและกรองข้อมูลของคำถามที่ตรงกับคำค้นหา
  if (searchQuery.value) {

    const filteredUser = user_per.value.filter((item) => {

      console.log(item.SU_ID);

      return item.SU_ID === searchQuery.value;
    });
    user_per.value = filteredUser;
  } else {
    GetlistUser();
  }
};


function authHeader() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user?.token;
  if (isLoggedIn) {
    return { Authorization: `Bearer ${user.token}` };
  } else {
    return {};
  }
}

const GetlistUser = () => {

  const url = process.env.VUE_APP_API_URL + '/systemuser/GetList_User';

  let data = {

  }

  axios.post(url, data, {
    headers: authHeader()
  }).then((res) => {
    user_per.value = res.data;
  }).catch((err) => {
    console.log(err);
  });

};


const GetList_UserByParameter = () => {

  const url = process.env.VUE_APP_API_URL + '/systemuser/GetList_UserByParameter';

  let data = {
    txt_key: searchQuery.value
  }

  console.log(data);

  axios.post(url, data, {
    headers: authHeader()
  }).then((res) => {
    user_per.value = res.data;
  }).catch((err) => {
    console.log(err);
  });

};

onMounted(() => {
  GetlistUser();
});

</script>

<style scoped src="./../styles/user_permission.css"></style>