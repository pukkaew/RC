<template>
    <div class="card-body">
      <div class="container-fluid">
        <h3>Exam List</h3><br>
          <div class="form-group d-flex align-items-center">
            <label for="searchQuestion">Search exam :</label>&emsp;
            <input type="text" class="form-control col-6" id="searchQuestion" v-model="searchQuery">
          </div>
      <div class="scrolling-container">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>ExamID</th>
              <th>ExamName</th>
              <th>ExamCode</th>
              <th></th> 
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in paginatedData " :key="index">
              <td>{{ item.ExamID }}</td>
              <td>{{ item.ExamName }}</td>
              <td>{{ item.ExamCode }}</td>
              <td width="200">
                <router-link :to="{ name: 'examQuiz', params: { id: item.ExamID , code: item.ExamCode } }" class="btn btn-sm btn-primary" title="เริ่มทำข้อสอบ" style="width: 100x; height: 30px;"><i class="fas fa-pen"></i>&ensp;Click test</router-link>
              </td> 
            </tr>
          </tbody>
        </table>
      </div>
        <nav hidden>
          <ul type="button" class="pagination">
            <li class="page-item" :class="{ 'disabled': currentPage === 1 }">
              <a class="page-link" @click="goToPage(currentPage - 1)">Previous</a>
            </li>
            <li class="page-item" v-for="page in totalPage" :key="page" :class="{ 'active': currentPage === page }">
              <a class="page-link" @click="goToPage(page)">{{ page }}</a>
            </li>
            <li class="page-item" :class="{ 'disabled': currentPage === totalPage }">
              <a class="page-link" @click="goToPage(currentPage + 1)">Next</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
</template>

<script setup>
import { onMounted,ref,computed } from 'vue';
import { useAuthStore } from '@/stores';
import axios from 'axios';
import { watch } from 'vue';

const exam_profile = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10000000; // จำนวนรายการต่อหน้า
const UserCode = ref(null);
const band_level = ref(null);
const startband = ref(null);
const endband = ref(null);
const searchQuery = ref('');

const filterExam_Profile = (Employee_Code) => {
  const lowercasedSearchQuery = searchQuery.value.trim().toLowerCase();

  if (lowercasedSearchQuery !== '') {
    const filteredExam = exam_profile.value.filter((item) => {
      const examIdMatch = item.ExamID.toString().includes(lowercasedSearchQuery);
      const examCodeMatch = item.ExamCode.toString().toLowerCase().includes(lowercasedSearchQuery);
      const examNameMatch = item.ExamName.toString().toLowerCase().includes(lowercasedSearchQuery);

      return examIdMatch || examCodeMatch || examNameMatch ||
        lowercasedSearchQuery.toString().toLowerCase().split(" ").filter(function(row) {
          return row !== "";
        }).filter(function(row) {
          return item.ExamName.includes(row) || item.ExamCode.includes(row) || item.ExamID.toString().includes(row);
        }).length > 0;
    });

    exam_profile.value = filteredExam;
  } else {
    getlist_examWithWorkUnit(Employee_Code);
  }
};

const paginatedData = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return exam_profile.value.slice(startIndex, endIndex);
});

const totalPage = computed(() => {
  return Math.ceil(exam_profile.value.length / itemsPerPage);
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPage.value) {
    currentPage.value = page;
  }
};

// ใช้ watch เพื่อตรวจสอบการเปลี่ยนแปลงใน searchQuery
watch(searchQuery, () => {
  const { user } = useAuthStore();

  if(user[0].SU_Code){
    filterExam_Profile(user[0].SU_Code);
  }
});

const usersJson = localStorage.getItem('user');

if (usersJson) {
    const usersData = JSON.parse(usersJson);
    UserCode.value = usersData[0].SU_Code;
    band_level.value = usersData[0].E_Level;
}

if (exam_profile.value.length > 0) {
  startband.value = exam_profile.value[0].Exam_StartBand;
  endband.value = exam_profile.value[0].Exam_EndBand;
}

function authHeader() {
    const { user } = useAuthStore();
    const isLoggedIn = !!user?.token;
    if (isLoggedIn) {
        return { Authorization: `Bearer ${user.token}` };
    } else {
        return {};
    }
}

// ฟังก์ชั่นการ select ข้อมูลข้อสอบ
const getlist_examWithWorkUnit = (workUnit) => {

  const url = process.env.VUE_APP_API_URL + '/exam/getlist_examWithWorkUnit';

    let data = {
        workUnit: workUnit,
        Employee_Code: UserCode.value 
  }

axios.post(url, data, {
    headers: authHeader()
}).then((res) => {
    exam_profile.value = res.data;
}).catch((err) => {
    console.log(err);
});

};

onMounted(() => {
  const { user } = useAuthStore();

  if (user[0].WG_Code) {
    getlist_examWithWorkUnit(user[0].WG_Code);
  }
});

</script>

<style scoped>
.multiline-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.scrolling-container {
  max-height: 200px; /* ปรับความสูงตามที่คุณต้องการ */
  overflow-x: hidden; /* ปิดแถบเลื่อนแนวนอน */
  overflow-y: auto; /* เปิดแถบเลื่อนแนวตั้ง */
}
</style>