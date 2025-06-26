<template>
<div class="row">
  <div class="card w-100">
    <div class="card-body">
      <div class="col-13">
        <Examlistbyprofile></Examlistbyprofile>
      </div>
    </div>
  </div>
  
  <!-- <pre>
    {{ paginatedData }}
  </pre> -->
  <div class="card w-100">
    <div class="card-body">
        <h3>My record</h3><br>
        <div class="container-fluid">

            <ul class="nav nav-tabs" id="myTabs" role="tablist">
                <li class="nav-item" v-for="(year, index) in years" :key="index">
                    <a class="nav-link" :class="{ active: index === 0 }" :id="'tab' + (index + 1)" data-toggle="tab" :href="'#content' + (index + 1)" role="tab" :aria-controls="'content' + (index + 1)" aria-selected="true">{{ year }}</a>
                </li>
            </ul>
        
            <div class="tab-content">
                <div v-for="(year, index) in years" :key="index" :id="'content' + (index + 1)" class="tab-pane fade" :class="{ 'show active': index === 0 }" role="tabpanel" :aria-labelledby="'tab' + (index + 1)">
                  <div class="scrolling-container">
                    <table class="table table-striped">
                        <thead>
                            <tr class="sticky-top bg-light">
                                <th>ID</th>
                                <th>Exam name</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th class="text-center">Full Score</th>
                                <th class="text-center">Score</th>
                                <th>Result</th>
                                <th width="200">Download certificate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in paginatedData" :key="index">
                                <template v-if="new Date(item.Create_Date).getFullYear() === year">
                                  <td>{{ item.ExamID }}</td>
                                  <td>{{ item.Exam_Name }}</td>
                                  <td>
                                    {{ 
                                      item.Exam_Type === 'null' ? 'Central' :
                                      item.Exam_Type === 'CT' ? 'Central' : item.Exam_Type 
                                    }}
                                    <!-- {{ item }} -->
                                  </td>
                                  <td>
                                    <span>{{ formatDate(item.Create_Date) }}</span>
                                  </td>
                                  <td class="text-center">{{ item.Q_ID_Count }}</td>
                                  <td class="text-center">{{ item.Total_Score }}</td>
                                  <td>{{ (item.Total_Score >= item.Exam_GradeA) ? "Pass" : "Fail" }}</td>
                                  <td class="text-center">
                                      <!-- ส่งค่า ID ไปยังฟังก์ชั่น downloadFile -->
                                      <button type="button" class="btn btn-primary btn-sm" @click="downloadFile(item.ID)" v-if="item.Total_Score >= item.Exam_GradeA && !item.Exam_No_Certificate"><i class="fas fa-download"></i></button>
                                  </td>
                                </template>
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
        </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { onMounted,ref,computed } from 'vue';
import { useAuthStore } from '@/stores';
import axios from 'axios';
import { format } from 'date-fns';
import Examlistbyprofile from './exam_list_byProfile.vue';

const UserCode = ref();

const formatDate = createDate => {
  const formattedDate = new Date(createDate);
  return format(formattedDate, 'yyyy-MM-dd');
};

const exam_profile = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10000000000; // จำนวนรายการต่อหน้า
const years = ref([]);

const calculatePastYears = () => {
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    years.value.push(currentYear - i);
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

function authHeader() {
    const { user } = useAuthStore();
    const isLoggedIn = !!user?.token;
    if (isLoggedIn) {
        return { Authorization: `Bearer ${user.token}` };
    } else {
        return {};
    }
}

// ฟังก์ชั่น select ข้อมูลข้อสอบที่สอบไปแล้ว และแสดงสรุปการสอบ
const getlist_exam_profile_by_employee = () => {

  const usersJson = localStorage.getItem('user');

  if (usersJson) {
    const usersData = JSON.parse(usersJson);
    UserCode.value = usersData[0].SU_Code;
  }

  const url = process.env.VUE_APP_API_URL + '/exam_profile/getlist_exam_profile_by_employee';

  let data = {
    Employee_Code: UserCode.value,
  }

  axios.post(url, data, {
      headers: authHeader()
  }).then((res) => {
      exam_profile.value = res.data;
  }).catch((err) => {
      console.log(err);
  });

};

// ฟังก์ชั่นการดาวน์โหลดใบประกาศ
const downloadFile = async (examID) => {
  try {
    const url = `${process.env.VUE_APP_API_URL}/certificate/generatePdf/?examID=${examID}`;
    console.log(url);
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: {
        ...authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const blob = new Blob([response.data]);
    const filename = 'Certificate.pdf'; 
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
};


onMounted(() => {
    getlist_exam_profile_by_employee();
    calculatePastYears();
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