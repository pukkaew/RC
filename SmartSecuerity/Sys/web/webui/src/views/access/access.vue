<template>
    <div class="barcode-search-container">
        <div class="barcode-search-wrapper">
            <h1 class="page-title">Barcode ID</h1>

            <div class="search-input-group">
                <div class="input-container">
                    <input v-model.number="query" placeholder="กรอก ID..." class="search-input" />
                </div>

                <div class="search-button-container">
                    <button @click="handleSearch" class="search-button">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </button>
                </div>
            </div>
            <div v-if="showModal" class="modal" ref="modalContainer">
                <div class="modal-content">
                    <button @click="closeModal" class="close-button" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 class="modal-title">Visitor Details</h2>

                    <div class="detail-item">
                        <span class="detail-label">ประเภทการติดต่อ</span>
                        <span class="detail-value">{{ remarkLabels[modalData.VT_ID] || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">หมายเหตุ</span>
                        <span class="detail-value">{{ selectedRemark || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">ชื่อ - สกุล</span>
                        <span class="detail-value">{{ modalData.WI_FullName || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">เลขทะเบียนรถ</span>
                        <span class="detail-value">{{ modalData.WI_LicensePlate || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">ทะเบียนจังหวัด</span>
                        <span class="detail-value">{{ modalData.WI_LicenseProvince || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">ประเภทยานพาหนะ</span>
                        <span class="detail-value">{{ modalData.WI_VehicleType || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">รปภ. ขาเข้า</span>
                        <span class="detail-value">{{ modalData.UserWayIn || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">วันเวลาเข้าติดต่อ</span>
                        <span class="detail-value">{{ dateService.formatDate(modalData.WI_RecordedOn) || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">ผู้รับการติดต่อ</span>
                        <span class="detail-value">{{ modalData.UserInternal || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">เวลาบันทึกการติดต่อ</span>
                        <span class="detail-value">{{ dateService.formatDate(modalData.SU_IDInternalRecordedOn) || '-'
                            }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">รปภ. ขาออก</span>
                        <span class="detail-value">{{ modalData.UserWayOut || '-' }}</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">วันเวลาที่ออก</span>
                        <span class="detail-value">{{ dateService.formatDate(modalData.WO_RecordedOn) || '-' }}</span>
                    </div>
                    <hr>

                    <div class="container-fluid content">
                        <div class="container body  rounded">
                            <div class="remark-buttons">
                                <button @click="handleRemarkSelection('ลงใบผิด')" class="btn">ลงใบผิด</button>

                                <button v-show="modalData.VT_ID === 'ขอดูสินค้า'" @click="handleRemarkSelection('40')" class="btn" id="re">ฝาก/เบิกสินค้า</button>

                            </div>
                        </div>
                    </div>


                    <div class="modal-actions">
                        <button @click="printData" :disabled="!selectedRemark" class="print-button"
                            :class="{ active: selectedRemark }">
                            <i class="fa-solid fa-print"></i>
                        </button>
                    </div>

                    <div v-if="showNewTypeModal" class="modal">
                        <div class="modal-content">
                            <h2>เลือกหมายเหตุใหม่</h2>
                            <select v-model="newType" class="custom-select">
                                <option value="">กรุณาเลือก</option>
                                <option value="46">ขอดูสินค้า</option>
                                <option value="18">ติดต่อประสานงาน</option>
                                <option value="39">ซัพพลายเออร์</option>
                            </select>


                            <div class="modal-actions">
                                <button @click="confirmNewType" class="confirm-button">ยืนยัน</button>
                                <button @click="cancelNewType" class="cancel-button">ยกเลิก</button>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuthStore } from '@/stores';
import { gsap } from 'gsap';
import { format, formatDate } from 'date-fns';
import * as BwipJs from 'bwip-js';
import QRCode from 'qrcode';

const selectedRemark = ref('');
const showNewTypeModal = ref(false);
const newType = ref('');
const status = ref('');
const selectedType = ref({});

const remarkLabels = {
    '46': 'ขอดูสินค้า',
    '18': 'ติดต่อประสานงาน',
    '39': 'ซัพพลายเออร์',
    '40': 'ฝาก/เบิกสินค้า',
    'ขอดูสินค้า': 'ขอดูสินค้า',
    'ติดต่อประสานงาน': 'ติดต่อประสานงาน',
    'ซัพพลายเออร์': 'ซัพพลายเออร์',
    'เบิกสินค้า40': 'ฝาก/เบิกสินค้า'
};

const handleRemarkSelection = async (remark) => {
    const remarkLabel = remarkLabels[remark] || remark;

   /* if (remark === '40') {
        if (modalData.value.SU_IDInternal === null) { 
            Swal.fire({
                title: 'โปรดติดต่อ QC',
                icon: 'info',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#6cb836'
            });
            return;
        }
    } */

    Swal.fire({
        title: 'ยืนยันการเลือก',
        text: `คุณต้องการเลือก "${remarkLabel}" หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#4CAF50'
    }).then(async (result) => {
        if (result.isConfirmed) {

            if(modalData.value.VT_ID == "ลงใบผิด")
            {
                //UpdateVisionType(query.value,modalData.value.VT_ID);
            }
            else
            {
                UpdateVisionType(query.value,modalData.value.VT_ID);

                           // selectedRemark.value = remarkLabel;
                           // modalData.value.VT_ID = remark;
            }

        }
    });
};


watch(selectedRemark, (newValue) => {
    if (newValue === "ลงใบผิด") {
        showNewTypeModal.value = true;
    } 
});

const confirmNewType = async () => {
    if (newType.value) {
        const remarkLabel = remarkLabels[newType.value] || newType.value;
        modalData.value.VT_ID = newType.value;

        showNewTypeModal.value = false;
        newType.value = '';

        Swal.fire({
            icon: 'success',
            text: `คุณเลือก : ${remarkLabel}`,
            showConfirmButton: true,
            confirmButtonColor: '#4CAF50',
        });
    } else {
        Swal.fire('ผิดพลาด', 'กรุณาเลือกหมายเหตุใหม่', 'error');
    }
};

const cancelNewType = () => {
    showNewTypeModal.value = false;
    newType.value = '';
};

const query = ref('');
const showModal = ref(false);
const modalData = ref({});
const modalContainer = ref(null);
const qrCodeData = ref(null);
const barcodeData = ref(null);

defineProps({
    show: Boolean,
    modalData: {
        type: Object,
        default: () => ({
            WI_FullName: '',
            WI_Barcode: '',
            WI_LicensePlate: ''
        })
    }
});

const authService = {
    getAuthHeader() {
        const { user } = useAuthStore();
        return user?.token ? { Authorization: `Bearer ${user.token}` } : {}
    }
}

const dateService = {
    formatDate(date) {
        return date ? format(new Date(date), 'dd/MM/yyyy HH:mm:ss') : '-'
    }
}

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


async function generateQRCode(data) {
    return QRCode.toDataURL(`https://smartsecurity.ruxchai.co.th/index.php?param=${modalData.value.WI_Barcode} || '-'`);
}


const UpdateVisionType = async (WI_ID, VT_ID) => {

    const url = process.env.VUE_APP_API_URL + '/wayinout/UpdateVisionType';


    if(VT_ID == 'ขอดูสินค้า')
    {
        modalData.value.VT_ID = 46;
    }
    else if(VT_ID == 'ฝาก/เบิกสินค้า')
    {
        modalData.value.VT_ID = 40;
    }
        else if(VT_ID == 'ติดต่อประสานงาน')
    {
        modalData.value.VT_ID = 18;
    }
        else if(VT_ID == 'ซัพพลายเออร์')
    {
        modalData.value.VT_ID = 39;
    }
    else
    {
         modalData.value.VT_ID = 0;
    }
   
    let data = {
        WI_ID: modalData.value.WI_ID,
        VT_ID: modalData.value.VT_ID
    };

    console.log(data);


    axios.post(url, data, { headers: authService.getAuthHeader() })
        .then((res) => {

            
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

        }).catch((error) => {
            console.error("API Error Details:", error.response.data);
            Swal.fire('Error', error.response?.data?.message || 'An error occurred with the API.', 'error');
        });
};

const handleSearch = () => {
    const url = process.env.VUE_APP_API_URL + '/wayinout/Get_WayInOutWithBarcode';
    const authHeader = authService.getAuthHeader();

    if (!authHeader?.Authorization) {
        Swal.fire({
            title: "Error",
            text: "Authorization token is missing.",
            icon: "error",
        });
        return;
    }

    if (!query.value) {
        Swal.fire({
            title: "กรุณากรอก ID",
            text: "กรุณาใส่ ID เพื่อค้นหา",
            icon: "warning",
        });
        return;
    }

    const data = { WI_Barcode: query.value };
    
    axios.post(url, data, { headers: authHeader })
        .then((res) => {
            console.log(res.data);
            prepareAndShowModal(res.data.data[0]);
        })
        .catch((error) => {
            Swal.fire({
                title: "ไม่พบ ID ที่ระบุ",
                icon: "info",
            });
        });
};


const prepareAndShowModal = async (data) => {
    
    modalData.value = data;

    if (data.WI_Barcode) {
        qrCodeData.value = await generateQRCode(data.WI_Barcode);
        barcodeData.value = data.VT_ID === '40' ? await generateBarcode(data.WI_Barcode) : null;
    } else {
        qrCodeData.value = null;
        barcodeData.value = null;
        console.warn('WI_Barcode is missing or undefined');
    }

    openModal(); 
};


const openModal = () => {
    showModal.value = true;
    animateModalEntry();
};


const closeModal = () => {
    animateModalExit();
}

const animateModalEntry = () => {
    setTimeout(() => {
        gsap.fromTo(
            modalContainer.value,
            { scale: 0.7, opacity: 0 },
            { duration: 0.5, scale: 1, opacity: 1, ease: "power2.out" }
        );
    }, 0);
}

const animateModalExit = () => {
    gsap.to(modalContainer.value, {
        duration: 0.3,
        scale: 0.7,
        opacity: 0,
        ease: "power2.in",
        onComplete: () => {
            showModal.value = false;
        }
    })
}

const printData = async () => {
    try {
        const qrCodeData = await QRCode.toDataURL(`https://smartsecurity.ruxchai.co.th/index.php?param=${modalData.value.WI_Barcode || '-'}`);
        const barcodeData = modalData.value.VT_ID === '40'
            ? await generateBarcode(modalData.value.WI_Barcode || '1234567890')
            : null;
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
                        <div class="label">ประเภทการติดต่อ : &nbsp;&nbsp; ${remarkLabels[modalData.value.VT_ID] || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">หมายเหตุ : &nbsp;&nbsp; ${selectedRemark.value || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">ชื่อ - สกุล : &nbsp;&nbsp; ${modalData.value.WI_FullName || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">เลขทะเบียนรถ : &nbsp;&nbsp; ${modalData.value.WI_LicensePlate || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">ทะเบียนจังหวัด : &nbsp;&nbsp; ${modalData.value.WI_LicenseProvince || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">ประเภทยานพาหนะ : &nbsp;&nbsp; ${modalData.value.WI_VehicleType || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">รปภ. ขาเข้า : &nbsp;&nbsp; ${modalData.value.UserWayIn || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">วันเวลาเข้าติดต่อ : &nbsp;&nbsp; ${dateService.formatDate(modalData.value.WI_RecordedOn) ||
            '-'
            }</div>
                    </div>
                    <div class="row">
                        <div class="label">ผู้รับการติดต่อ : &nbsp;&nbsp; ${modalData.value.UserInternal || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">เวลาบันทึกการติดต่อ : &nbsp;&nbsp; ${modalData.value.SU_IDInternalRecordedOn ||
            '-'
            }</div>
                    </div>
                    <div class="row">
                        <div class="label">รปภ. ขาออก : &nbsp;&nbsp; ${modalData.value.UserWayOut || '-'}</div>
                    </div>
                    <div class="row">
                        <div class="label">วันเวลาออก : &nbsp;&nbsp; ${dateService.formatDate(modalData.value.WO_RecordedOn) || '-'}
                        </div>
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
            newWindow.close();
        }, 500);
    } catch (error) {
        Swal.fire({
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถพิมพ์ข้อมูลได้",
            icon: "error",
            confirmButtonText: "ตกลง",
            confirmButtonColor: '#4CAF50'
        });
    }
}
</script>

<style scoped src="./access.css"></style>