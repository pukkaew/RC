<template>
  <div>
    <div class="card">
      <div class="card-body">
        <div class="container-fluid">
          <h3>Access Company List</h3><br>
          <div class="form-group d-flex align-items-center">
            <label for="searchQuestion">Search Task :</label>&emsp;
            <input type="text" class="form-control col-3" id="searchQuestion" v-model="searchQuery"
              @input="filteredUser">
          </div>
          <div class="scrolling-container">
            <table class="table table-striped">
              <thead>
                <tr align="center">
                  <th>ID</th>
                  <th>Barcode</th>
                  <th>ชื่อผู้มาติดต่อ</th>
                  <th>ที่อยู่</th>
                  <th>เลขทะเบียน</th>
                  <th>ทะเบียนจังหวัด</th>
                  <th>ประเภทยานพาหนะ</th>
                  <th>ชื่อ รปภ ขาเข้า</th>
                  <th>ประเภทติดต่อ &nbsp;</th>
                  <th>เปลี่ยนประเภทติดต่อ</th>
                  <th>วันเวลาที่เข้า</th>
                  <th>ชื่อผู้รับการติดต่อ</th>
                  <th>เวลาที่เข้ามาติดต่อ</th>
                  <th>ชื่อ รปภ ขาออก</th>
                  <th>วันเวลาที่ออก</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in paginatedData" :key="index" align="center">
                  <td>{{ item.WI_ID }}</td>
                  <td>{{ item.WI_Barcode }}</td>
                  <td>{{ item.WI_FullName }}</td>
                  <td>{{ item.WI_Address }}</td>
                  <td>{{ item.WI_LicensePlate }}</td>
                  <td>{{ item.WI_LicenseProvince }}</td>
                  <td>{{ item.WI_VehicleType }}</td>
                  <td>{{ item.UserWayIn }}</td>
                  <td>{{ item.VT_ID }}</td>
                  <td>
                    <button class="btn btn-primary change-category" @click="show(item.WI_ID)">
                      <i class="fa-solid fa-list"></i>
                    </button>
                  </td>
                  <td>{{ formatDate(item.WI_RecordedOn) }}</td>
                  <td>{{ item.UserInternal }}</td>
                  <td>{{ formatDate(item.SU_IDInternalRecordedOn) }}</td>
                  <td>{{ item.UserWayOut }}</td>
                  <td>{{ formatDate(item.WO_RecordedOn) }}</td>
                </tr>
              </tbody>
            </table>

            <center>
              <div>
                <div v-if="showNoteSelection" class="modal fade show d-block" tabindex="-1" role="dialog"
                  aria-hidden="true">
                  <div class="card col-5 body shadow">
                    <div class="card-body">
                      <h3>เลือกหมายเหตุ</h3>
                      <select class="form-control" v-model="selectedNote">
                        <option value="">เลือกหมายเหตุ</option>
                        <option value="เปลี่ยนประเภท ขอดูสินค้า เป็น ฝาก/เบิกสินค้า">
                          ฝาก / เบิกสินค้า
                        </option>
                        <option value="ลงใบผิด">ลงใบผิด</option>
                      </select>
                      <br>
                      <button @click="selectNote" class="btn btn-primary form-control">ตกลง</button>
                      <button @click="cancelNote" class="btn btn-danger form-control mt-2">ปิด</button>
                    </div>
                  </div>
                </div>
              </div>
            </center>

            <center>
              <div class="m-2">
                <br>
                <div class="modal fade" :class="{ show: showPopup, 'd-block': showPopup }" tabindex="-1" role="dialog"
                  ref="modal">
                  <div class="card col-5 body shadow">
                    <div class="card-body">
                      <div class="container-fluid">
                        <h3>เลือกประเภท</h3>
                        <table class="table">
                          <thead align="center">
                            <th><b>ประเภท</b></th>
                            <th><b>เลือก</b></th>
                          </thead>
                          <tbody align="center">
                            <tr v-for="(vision, index) in GetVision" :key="index">
                              <td
                                v-show="selectedNote !== 'เปลี่ยนประเภท ขอดูสินค้า เป็น ฝาก/เบิกสินค้า' || vision.VT_Localname === 'ฝาก/เบิกสินค้า'">
                                <b>{{ vision.VT_Localname }}</b>
                              </td>
                              <td
                                v-show="selectedNote !== 'เปลี่ยนประเภท ขอดูสินค้า เป็น ฝาก/เบิกสินค้า' || vision.VT_Localname === 'ฝาก/เบิกสินค้า'">
                                <button class="btn btn-outline-success" @click="selectedVision(vision)">
                                  <i class="fa-solid fa-circle-check"></i>&nbsp;&nbsp;เลือก
                                </button>
                              </td>
                            </tr>
                          </tbody>

                        </table>
                        <hr>
                        <br>
                        <div class="col-2">
                          <button @click="cancel" class="btn btn-danger form-control "><i
                              class="fa-solid fa-xmark"></i>&nbsp;&nbsp;ปิด</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </center>

            <nav>
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
</template>

<script setup>
import { onMounted, ref, computed, watch, onBeforeMount } from 'vue';
import axios from 'axios';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import gsap from 'gsap';
import { useAuthStore } from '@/stores';
import QRCode from 'qrcode';
import { nextTick } from 'vue';

const wayinwayoutper = ref([]);
const GetVision = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;
const showPopup = ref(false);
const selectedOption = ref({});
const modal = ref(null);
const WI_ID = ref();
const canvasRef = ref(null);
const save = ref();

const showNoteSelection = ref(false);
const selectedNote = ref('');

import * as BwipJs from 'bwip-js';

async function generateBarcode(data) {
  try {
    const canvas = document.createElement('canvas');
    BwipJs.toCanvas(canvas, {
      bcid: 'code128',
      text: data,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode:', error);
    return null;
  }
}


async function printRow(row) {
  try {

    const qrCodeData = await QRCode.toDataURL(`https://smartsecurity.ruxchai.co.th/index.php?param=${row.WI_Barcode || '-'}`);
    const barcodeData = row.VT_ID === 'ฝาก/เบิกสินค้า' ? await generateBarcode(row.WI_Barcode || '1234567890') : null;

    const printContent = `
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รายละเอียดผู้มาติดต่อ</title>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sarabun:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Thai+Looped:wght@100;200;300;400;500;600;700;800;900&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap");
html,
body {
  height: auto;
  margin: 0;
  font-family: "Sarabun";
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }
  @page {
    margin: 0;
  }
}

.container {
  max-width: 600px;
  margin: 20px auto;
  background: white;
  overflow: hidden;
}

.header {
  background-color: #333;
  background-image: linear-gradient(to right, #333, #333);
  color: white;
  text-align: center;
  padding: 14px;
  font-weight: 600;
}

.details {
  padding: 20px;
}

.row {
  display: flex;
  padding: 1px 0;
}

.label {
  font-weight: 400;
  color: #333;
  padding-right: 10px;
  font-size: 12px;
  flex: 10;
}

.value {
  flex: 8;
  font-weight: 400;
  color: #333333;
  font-size: 150px;
}

.qrcode {
  text-align: center;
  margin: 0px 0;
  padding: 5px;
}

.qrcode img {
  max-width: 100px;
}

.image-logo {
  max-width: 150px;
  text-align: center;
}

h5 {
  font-size: 11px;
}

.head {
  font-weight: 550;
  font-size: 14px;
  padding: 1px;
}

.label-head {
  font-weight: 600;
  color: #333;
  font-size: 15px;
  flex: 10;
}

.barcode {
  max-width: 150px;
  text-align: center;
}

        </style>
      </head>
      <body>
        <div class="container">
          <div class="text-center" style="display: flex; justify-content: center; align-items: center;">
            <img src="https://www.ruxchai.co.th/front-end/images/logo-ruxchai.png" class="img-fluid image-logo" alt="Logo">
            </div>
          <div class="details">
            <div class="row">
              <div class="label-head">บริษัท รักชัยห้องเย็น จำกัด</div>
            </div>
            <div class="row">
              <div class="label-head">Ruxchai Cold Storage</div>
            </div>
            <div class="row">
              <div class="label">ประเภทการติดต่อ : &nbsp;&nbsp; ${row.VT_ID || '-'}</div>
            </div>
            <div class="row">
              <div class="label">ชื่อ - สกุล : &nbsp;&nbsp; ${row.WI_FullName || '-'}</div>
            </div>
            <div class="row">
              <div class="label">เลขทะเบียนรถ : &nbsp;&nbsp; ${row.WI_LicensePlate || '-'}</div>
            </div>
            <div class="row">
              <div class="label">ทะเบียนจังหวัด : &nbsp;&nbsp; ${row.WI_LicenseProvince || '-'}</div>
            </div>
            <div class="row">
              <div class="label">ประเภทยานพาหนะ : &nbsp;&nbsp; ${row.WI_VehicleType || '-'}</div>
            </div>
            <div class="row">
              <div class="label">รปภ. ขาเข้า : &nbsp;&nbsp; ${row.UserWayIn || '-'}</div>
            </div>
            <div class="row">
              <div class="label">วันเวลาเข้าติดต่อ : &nbsp;&nbsp; ${row.WI_RecordedOn || '-'} </div>
            </div>
            <div class="row">
              <div class="label">ผู้รับการติดต่อ : &nbsp;&nbsp; ${row.UserInternal || '-'}</div>
            </div>
            <div class="row">
              <div class="label">เวลาบันทึกการติดต่อ : &nbsp;&nbsp; ${row.SU_IDInternalRecordedOn || '-'}</div>
            </div>
            <div class="row">
              <div class="label">รปภ. ขาออก : &nbsp;&nbsp; ${row.UserWayOut || '-'}</div>
            </div>
            <div class="row">
              <div class="label">วันเวลาออก : &nbsp;&nbsp; ${formatDate(row.WO_RecordedOn) || '-'}</div>
            </div>
          </div>
          <div class="qrcode">
            <img src="${qrCodeData}" alt="QR Code">
          </div>
          ${barcodeData
        ? `<div class="text-center" style="display: flex; justify-content: center; align-items: center;">
            <img src="${barcodeData}" class="img-fluid barcode" >
          </div>`
        : ''
      }
          <div class="mb-4">
            <h5 align="center">กรุณา Check in กับเจ้าหน้าที่ที่มาติดต่อก่อนออกจากบริษัท</h6>
            <h5 align="center"><b>***ห้ามทำสลิปหาย***</b></h5>  
          </div>
          <br>
          <br>
        </div>
      </body>
    </html>
  `;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(printContent);
    newWindow.document.close();
    setTimeout(() => {
      newWindow.print();
      ReloadWindowLocation();
    }, 500);
  } catch (error) {
    console.error('Error printing row:', error);
  }
}
 
function ReloadWindowLocation() {
  window.location.reload();
}

const { user } = useAuthStore();
// const isReception = user?.userRoleValue === "RCT";
// const isNotReception = user?.userRoleValue === "";

function authHeader() {
  const { user } = useAuthStore();

  // console.log("User:", user);
  const isLoggedIn = !!user?.token;
  if (isLoggedIn) {
    // console.log("User Name", user?.name);
    return { Authorization: `Bearer ${user.token}` };
  } else {
    return {};
  }
}

const show = (item) => {
  WI_ID.value = item;
  selectedNote.value = '';
  showNoteSelection.value = true;
}


const selectNote = () => {
  if (selectedNote.value === 'ลงใบผิด') {
    GetVision.value = GetVision.value.filter(option => option.VT_Localname !== 'ประเภทเก่า');
  } else {
    GetVisionType();
  }

  if (selectedNote.value) {
    showNoteSelection.value = false;
    showPopup.value = true;
  } else {
    Swal.fire({
      title: "กรุณาเลือกหมายเหตุ",
      icon: "warning",
      confirmButtonText: "ตกลง",
    });
  }
};

const selectedVision = (vision) => {
  const vtId = vision.VT_ID;
  selectedOption.value = vision;

  Swal.fire({
    title: "เลือกเสร็จสิ้น",
    text: vision.VT_Localname,
    icon: "success",
    confirmButtonColor: '#6cb836',
    confirmButtonText: "ตกลง",
  }).then(() => {
    updateVisionType(WI_ID.value, vtId).then();
    cancel();
  });
};

const cancelNote = () => {
  hideModalNote();
}

const cancel = () => {
  hideModal();
  selectedOption.value = {};
};
const showModal = () => {
  showPopup.value = true;
  gsap.fromTo(modal.value, { y: "-100%", opacity: 0 }, { y: "0%", opacity: 1, duration: 0.5 });
};

const hideModalNote = () => {
  gsap.to(modal.value, {
    y: "-100%",
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      showNoteSelection.value = false;
    },
  });
};

const hideModal = () => {
  gsap.to(modal.value, {
    y: "-100%",
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      showPopup.value = false;
    },
  });
};

const formatDate = (date) => {

  if (!date) {
    return '-'; // Return '-' if the date is invalid
  }


  const utcDate = new Date(date);

  // Manually format the date as 'yyyy-MM-dd HH:mm:ss.SSS'
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0'); // Get month (1-12)
  const day = String(utcDate.getUTCDate()).padStart(2, '0'); // Get day of the month
  const hours = String(utcDate.getUTCHours()).padStart(2, '0'); // Get hours (24-hour format)
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0'); // Get minutes
  const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0'); // Get seconds
  const milliseconds = String(utcDate.getUTCMilliseconds()).padStart(3, '0'); // Get milliseconds

  // Return formatted date string as 'yyyy-MM-dd HH:mm:ss.SSS'
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const filteredUser = () => {
  if (searchQuery.value) {
    const filteredData = wayinwayoutper.value.filter(item =>
      item.WI_Barcode && item.WI_Barcode.toString().includes(searchQuery.value)
    );
    wayinwayoutper.value = filteredData;
  } else {
    GetlistWayinwayout();
  }
};

watch(searchQuery, filteredUser);

const paginatedData = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return wayinwayoutper.value.slice(startIndex, startIndex + itemsPerPage);
});

const totalPage = computed(() => {
  return Math.ceil(wayinwayoutper.value.length / itemsPerPage);
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPage.value) {
    currentPage.value = page;
  }
};

const GetVisionType = () => {
  const url = `${process.env.VUE_APP_API_URL}/wayinout/GetVisionType`;

  axios.post(url, {}, { headers: authHeader() })
    .then((res) => {
      if (res.data && Array.isArray(res.data)) {
        GetVision.value = res.data;
      } else {
        Swal.fire({
          title: "ข้อมูลผิดพลาด",
          text: "ไม่สามารถดึงข้อมูลประเภทวิชั่นได้",
          icon: "error",
          confirmButtonText: "ตกลง"
        });
      }
    })
    .catch((err) => {
      console.error("Error fetching vision type:", err);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อกับ API ได้",
        icon: "error",
        confirmButtonText: "ตกลง"
      });
    });
};

const GetlistWayinwayout = () => {
  const url = `${process.env.VUE_APP_API_URL}/wayinout/GetList_WayInOut`;

  axios.post(url, {}, { headers: authHeader() })
    .then((res) => {
      wayinwayoutper.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    });
};

const updateVisionType = async (WI_ID, VT_ID) => {
  const url = process.env.VUE_APP_API_URL + '/wayinout/UpdateVisionType';

  let data = {
    WI_ID: WI_ID,
    VT_ID: VT_ID,
  };

  axios.post(url, data, { headers: authHeader() })
    .then((res) => {
      // console.log(res.data.data[0]);


      if (res.data.message == "Cannot change Status") {
        Swal.fire({
          icon: 'info',
          title: 'โปรดติดต่อ QC',
          showConfirmButton: true,
          confirmButtonColor: '#6cb836',
          confirmButtonText: "ตกลง",
        })
      } else {
        printRow(res.data.data[0]);
      }

      
    })
    .catch((err) => {
      console.log(err);
    });
}


watch(showPopup, (newValue) => {
  // alert(newValue);
  if (newValue) {
    showModal();
    GetVisionType();
  }
});

onMounted(() => {
  nextTick(() => {
    if (canvasRef.value) {
      QRCode.toCanvas(canvasRef.value, url, function (error) {
        if (error) console.error(error);
        else console.log('QR code created!');
      });
    }
  });
  GetlistWayinwayout();
  gsap.from(".card-body", {
    duration: 1,
    opacity: 0,
    y: 50,
    ease: "power3.out",
  });
});


</script>

<style scooped src="./../styles/wayinout.css"></style>