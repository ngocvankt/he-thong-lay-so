// ====== script.js ======
// === Khởi tạo Firebase ===
const firebaseConfig = {
    apiKey: "AIzaSyAHLTITwmLt845c1pvhBtvJuV5OLZN0dDA",
    authDomain: "ttytsokhambenh.firebaseapp.com",
    databaseURL: "https://ttytsokhambenh-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "ttytsokhambenh",
    storageBucket: "ttytsokhambenh.firebasestorage.app",
    messagingSenderId: "805566207765",
    appId: "1:805566207765:web:e083cca4dd29bc59a8bb1c",
    measurementId: "G-VDK48MJ8Q4"
  };
  
  firebase.initializeApp(firebaseConfig);
  let users = [];

firebase.database().ref("users").once("value")
  .then(snapshot => {
    const data = snapshot.val();
    if (data) {
      users = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    }
  })
  .catch(error => {
    console.error("Error loading users from Firebase:", error);
  });
// Clinics mặc định
let clinics = [
    { name: "Phòng khám Đông Y 1", limit: 100, issued: 0 },
    { name: "Phòng khám Đông Y 2", limit: 100, issued: 0 },
    { name: "Phòng khám Nội 1", limit: 100, issued: 0 },
    { name: "Phòng khám Nội 2", limit: 100, issued: 0 },
    { name: "Phòng khám Nội 3", limit: 100, issued: 0 },
    { name: "Phòng khám Nội 4", limit: 100, issued: 0 },
    { name: "Phòng khám Nội 5", limit: 100, issued: 0 },
    { name: "Phòng khám Nhi 1", limit: 100, issued: 0 },
    { name: "Phòng khám Nhi 2", limit: 100, issued: 0 },
    { name: "Phòng khám Tai Mũi Họng", limit: 100, issued: 0 },
    { name: "Phòng khám Mắt", limit: 100, issued: 0 },
    { name: "Phòng khám Sản khoa", limit: 100, issued: 0 },
    { name: "Phòng khám Ngoại Tổng hợp", limit: 100, issued: 0 }
];

let selectedClinic = "";
let calledNumbers = {}; // Phatso cấp số
let calledHistory = {}; // Phongkham đã gọi
let audioQueue = [];         // Hàng đợi âm thanh
let isPlayingAudio = false;  // Trạng thái đang phát hay không
function normalizeKey(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\s]/g, "-");
}
function saveClinics() {
    firebase.database().ref("clinics").set(clinics);
}

function loadClinics(callback) {
    firebase.database().ref("clinics").once("value", snapshot => {
        const data = snapshot.val();
        if (Array.isArray(data)) {
            clinics = data; // ✅ CHỈ GÁN KHI CHẮC CHẮN data là MẢNG
        }
        if (typeof callback === "function") callback();
    });
}

function saveCalledNumbers() {
    firebase.database().ref("calledNumbers").set(calledNumbers);
}
function loadCalledNumbers(callback) {
    firebase.database().ref("calledNumbers").once("value", snapshot => {
        const data = snapshot.val();
        if (data) {
            calledNumbers = data;
        }
        if (typeof callback === "function") callback();
    });
}
function loadCalledHistory(callback) {
    firebase.database().ref("calledHistory").once("value", snapshot => {
        const data = snapshot.val();
        if (data) {
            calledHistory = data;
        }
        clinics.forEach(c => {
            if (!Array.isArray(calledHistory[c.name])) calledHistory[c.name] = [];
        });
        if (typeof callback === "function") callback();
    });
}

function saveCalledHistory() {
    firebase.database().ref("calledHistory").set(calledHistory);
}


function login() {
    const id = document.getElementById("username").value.trim();
    const pw = document.getElementById("password").value.trim();
    const user = users.find(u => u.id === id && u.password === pw);
    if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        location.reload();
    } else {
        alert("Sai ID hoặc mật khẩu!");
    }
}

function logout() {
    localStorage.removeItem("currentUser");
    location.reload();
}

function showDashboard(user) {
    const loginBox = document.querySelector(".login-box");
    if (loginBox) loginBox.style.display = "none";
    if (user.role === "admin") {
        document.getElementById("admin-container").style.display = "block";
        renderAdmin();
        renderHighlightEditor();
    } else if (user.role === "phatso") {
        document.getElementById("phatso-container").style.display = "block";
        renderPhatSo();
    } else if (user.role === "phongkham") {
    const savedClinic = localStorage.getItem("selectedClinic");
    if (savedClinic) {
        selectedClinic = savedClinic;
        document.getElementById("clinic-name-display").innerText = selectedClinic;
        document.getElementById("clinic-name-display").style.display = "block";
        document.getElementById("clinic-select-container").style.display = "none";
        document.getElementById("phongkham-action").style.display = "block";
        document.getElementById("main-heading").innerText = "GỌI BỆNH NHÂN VÀO PHÒNG KHÁM!";
        document.getElementById("top-right-buttons").style.display = "block";
        setTimeout(updateCalledList, 100);
    } else {
        showClinicSelect(); // ✅ Chỉ gọi khi chưa có selectedClinic
    }
    document.getElementById("phongkham-container").style.display = "block";
}
}

function renderAdmin() {
    const tbody = document.querySelector("#admin-clinic-list tbody");
    tbody.innerHTML = "";

    clinics.forEach((clinic, idx) => {
        const row = document.createElement("tr");

        // Tạo input sửa tên
        const inputName = document.createElement("input");
        inputName.type = "text";
        inputName.value = clinic.name;
        inputName.setAttribute("data-index", idx);
        inputName.className = "admin-input-text clinic-name-input";

        // Tạo input giới hạn
        const inputLimit = document.createElement("input");
        inputLimit.type = "number";
        inputLimit.value = clinic.limit;
        inputLimit.min = 1;
        inputLimit.setAttribute("data-index", idx);
        inputLimit.className = "admin-input-number limit-input";

        row.innerHTML = `
            <td><button onclick="deleteClinic(${idx})" class="icon-btn">❌</button></td>
            <td></td>
            <td></td>
            <td>${clinic.issued}</td>
        `;

        row.children[1].appendChild(inputName);
        row.children[2].appendChild(inputLimit);

        tbody.appendChild(row);
    });
    renderHighlightEditor();
}

function deleteClinic(index) {
    if (confirm("Bạn có chắc chắn muốn xóa phòng khám này không?")) {
        clinics.splice(index, 1);
        saveClinics();
        renderAdmin();
    }
}

function addClinic() {
    const name = document.getElementById("new-clinic-name").value.trim();
    const limit = parseInt(document.getElementById("new-clinic-limit").value);

    if (!name || isNaN(limit) || limit <= 0) {
        alert("Vui lòng nhập tên và giới hạn hợp lệ!");
        return;
    }

    // Kiểm tra trùng tên
    if (clinics.some(c => c.name === name)) {
        alert("Tên phòng khám đã tồn tại!");
        return;
    }

    clinics.push({ name, limit, issued: 0 });
    calledNumbers[name] = [];
    calledHistory[name] = [];

    saveClinics();
    saveCalledNumbers();
    saveCalledHistory();

    // Xoá nội dung input
    document.getElementById("new-clinic-name").value = "";
    document.getElementById("new-clinic-limit").value = "";
    
    renderAdmin();
}

function saveChanges() {
    const limitInputs = document.querySelectorAll(".limit-input");
    const nameInputs = document.querySelectorAll(".clinic-name-input");

    limitInputs.forEach((input, idx) => {
        const index = input.getAttribute("data-index");
        const newLimit = Number(input.value);
        const newName = nameInputs[idx].value.trim();
        const oldName = clinics[index].name;

        const oldKey = normalizeKey(oldName);
        const newKey = normalizeKey(newName);

        if (newName !== oldName) {
            // Chuyển dữ liệu từ key cũ sang key mới (nếu khác tên)
            if (calledNumbers[oldKey]) {
                calledNumbers[newKey] = [...calledNumbers[oldKey]];
                delete calledNumbers[oldKey];
            }
            if (calledHistory[oldKey]) {
                calledHistory[newKey] = [...calledHistory[oldKey]];
                delete calledHistory[oldKey];
            }
        }

        clinics[index].name = newName;
        clinics[index].limit = newLimit;
    });

    saveClinics();
    saveCalledNumbers();
    saveCalledHistory();
    alert("Đã lưu thay đổi!");
    renderAdmin();
}

function resetIssued() {
    if (confirm("Bạn có chắc chắn muốn reset toàn bộ?")) {
        clinics.forEach(c => {
            c.limit = 100;
            c.issued = 0;

            const key = normalizeKey(c.name); // ✅ chuẩn hóa
            calledNumbers[key] = [];
            calledHistory[key] = [];
        });
        saveClinics();
        saveCalledNumbers();
        saveCalledHistory();
        alert("Đã reset thành công!");
        renderAdmin();
    }
}

function renderPhatSo() {
    loadCalledNumbers();
    const table = document.getElementById("phatso-list");
    table.innerHTML = "";
    clinics.forEach(clinic => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${clinic.name}</td>
            <td>${clinic.issued}</td>
            <td style="color: green;">${clinic.limit - clinic.issued}</td>
            <td>
                <button onclick="issueNumber('${clinic.name}', false)" class="btn-normal">Cấp số</button>
                <button onclick="issueNumber('${clinic.name}', true)" class="btn-priority">Ưu tiên</button>
            </td>
        `;
        table.appendChild(row);
    });
}

function issueNumber(name, isPriority = false) {
    loadCalledNumbers();
    const clinic = clinics.find(c => c.name === name);
    if (!clinic || clinic.issued >= clinic.limit) {
        alert("Hết số hoặc phòng khám không hợp lệ!");
        return;
    }

    clinic.issued++;
    const key = normalizeKey(clinic.name); // ✅ Chuẩn hóa tên

    if (!calledNumbers[key]) calledNumbers[key] = [];

    const number = clinic.issued;
    const displayNumber = isPriority
        ? `A${number.toString().padStart(2, "0")}`
        : number;

    calledNumbers[key].push(displayNumber); // ✅ Dùng key chuẩn hóa

    saveClinics();
    saveCalledNumbers();
    renderPhatSo();
    handlePrint(clinic.name, displayNumber, isPriority);
}

function handlePrint(clinicName, number, isPriority = false) {
  const now = new Date();
  document.getElementById("clinicNamePrint").innerText = clinicName;
  const displayNumber = typeof number === "string"
    ? number
    : number.toString().padStart(2, "0");
  document.getElementById("ticketNumberPrint").innerText = displayNumber;
  document.getElementById("timePrint").innerText = now.toLocaleString("vi-VN");
  const printArea = document.getElementById("print-area");
  printArea.style.display = "block";

  // ✅ Luôn luôn tải nội dung từ Firebase (dù là trình duyệt nào)
  firebase.database().ref("highlightHTML").once("value").then(snapshot => {
    const content = snapshot.val() || "<i>Không có nội dung dịch vụ nổi bật.</i>";
    document.getElementById("highlight-service").innerHTML = content;

    // Sau khi gán xong nội dung, tiến hành in
    setTimeout(() => {
      window.print();
      printArea.style.display = "none";
    }, 300);
  });
}

async function callNextNumbers(count) {
    await new Promise(resolve => loadCalledNumbers(resolve));

    const clinicName = selectedClinic;
    const key = normalizeKey(clinicName); // ✅ chuẩn hóa tên
    const clinic = clinics.find(c => c.name === clinicName);
    if (!clinic) {
        alert("Phòng khám không tồn tại!");
        return;
    }

    const queue = [...calledNumbers[key] || []];         // ✅ dùng key chuẩn hóa
    const history = new Set(calledHistory[key] || []);   // ✅ dùng key chuẩn hóa

    // Lọc các số chưa gọi
    let toCall = queue.filter(n => !history.has(n));

    // Ưu tiên gọi Axx trước
    toCall.sort((a, b) => {
        const aIsPriority = typeof a === "string" && a.startsWith("A");
        const bIsPriority = typeof b === "string" && b.startsWith("A");

        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;

        const aNum = parseInt(typeof a === "string" ? a.replace("A", "") : a);
        const bNum = parseInt(typeof b === "string" ? b.replace("A", "") : b);
        return aNum - bNum;
    });

    if (toCall.length === 0) {
        alert("Không có số mới để gọi!");
        return;
    }

    document.getElementById("called-section").style.display = "none";
    const slug = key; // dùng key chuẩn hóa luôn cho tên file âm thanh

    for (let i = 0; i < count && i < toCall.length; i++) {
        const number = toCall[i];
        const isPriority = typeof number === "string" && number.startsWith("A");
        const numOnly = isPriority
            ? number.slice(1).toString().padStart(2, "0")
            : number.toString().padStart(2, "0");

        const files = isPriority
            ? ["audio/uu-tien.mp3", "audio/a.mp3", `audio/so-${numOnly}.mp3`, `audio/${slug}.mp3`]
            : ["audio/moi-so.mp3", `audio/so-${numOnly}.mp3`, `audio/${slug}.mp3`];

        enqueueAudioSequence(files);
        history.add(number);
    }

    calledHistory[key] = Array.from(history); // ✅ lưu lại bằng key chuẩn hóa
    saveCalledHistory();
    updateCalledList();
}

function confirmClinic() {
    selectedClinic = document.getElementById("clinic-select").value;

    const nameText = document.getElementById("clinic-name-text");
    const nameDisplay = document.getElementById("clinic-name-display");

    if (!selectedClinic) {
        alert("Vui lòng chọn phòng khám!");
        return;
    }

    if (nameText) nameText.innerText = selectedClinic;
    if (nameDisplay) nameDisplay.innerText = selectedClinic;
    if (nameDisplay) nameDisplay.style.display = "block";

    const selectContainer = document.getElementById("clinic-select-container");
    const actionContainer = document.getElementById("phongkham-action");
    const topButtons = document.getElementById("top-right-buttons");
    const heading = document.getElementById("main-heading");
    const statsBox = document.getElementById("phongkham-stats");

    if (selectContainer) selectContainer.style.display = "none";
    if (actionContainer) actionContainer.style.display = "block";
    if (topButtons) topButtons.style.display = "block";
    if (heading) heading.innerText = "GỌI BỆNH NHÂN VÀO PHÒNG KHÁM!";
    if (statsBox) statsBox.style.display = "flex";

    localStorage.setItem("selectedClinic", selectedClinic);
    updateCalledList();
}


function enqueueAudioSequence(files) {
    audioQueue.push(files);
    playAudioQueue();
}

async function playAudioQueue() {
    if (isPlayingAudio || audioQueue.length === 0) return;

    isPlayingAudio = true;
    const files = audioQueue.shift();

    for (let i = 0; i < files.length; i++) {
        await new Promise(resolve => {
            const audio = new Audio(files[i]);
            audio.onloadedmetadata = () => {
                const duration = audio.duration;
                const nextStartTime = (duration - 0.1) * 650;
                setTimeout(resolve, nextStartTime);
                audio.play();
            };
            audio.onerror = resolve;
        });
    }

    isPlayingAudio = false;
    document.getElementById("called-section").style.display = "block";
    playAudioQueue(); // Gọi tiếp chuỗi tiếp theo nếu còn
}

function updateCalledList() {
    const container = document.getElementById("called-list");
    const section = document.getElementById("called-section");
    const statsBox = document.getElementById("phongkham-stats");
  
    const fullHistory = calledHistory[selectedClinic] || [];
    const lastCalled = fullHistory.length > 0 ? fullHistory[fullHistory.length - 1] : "-";

    // ✅ Luôn hiện thống kê
    statsBox.style.display = "flex";

    // ✅ Hiện danh sách nếu có ít nhất 1 số đã gọi
    if (fullHistory.length > 0) {
        section.style.display = "block";
        container.innerHTML = fullHistory.map(n =>
            `<button onclick="recallNumber('${n}')">Số ${n}</button>`
        ).join("");
    } else {
        section.style.display = "none";
        container.innerHTML = "";
    }

    const clinic = clinics.find(c => c.name === selectedClinic);
    const totalIssued = clinic ? clinic.issued : 0;
    const remaining = clinic ? (clinic.issued - fullHistory.length) : 0;
  
    document.getElementById("total-issued").innerText = totalIssued;
    document.getElementById("remaining").innerText = remaining;
    document.getElementById("last-called").innerText = lastCalled;
}
  

window.onload = function () {
    loadClinics(() => {
        loadCalledNumbers(() => {
            loadCalledHistory(() => {
                renderClinicSelect();
                setTimeout(() => {
                    const user = JSON.parse(localStorage.getItem("currentUser"));
                    if (user) showDashboard(user);
                }, 10); // trì hoãn nhẹ để DOM render xong
            });
        });
    });
    // 🟢 Nếu là tài khoản phongkham, thì cập nhật số đã cấp mỗi 5 phút
    setInterval(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (user && user.role === "phongkham") {
        loadCalledNumbers(() => {
            loadCalledHistory(() => {
                updateCalledList(); // ✅ Cập nhật đúng
            });
        });
    }
    }, 300000); // mỗi 5 phút
};

function recallNumber(number) {
    const slug = selectedClinic.toLowerCase().replace(/\s+/g, "-");
    const isPriority = typeof number === "string" && number.startsWith("A");
    const numOnly = isPriority ? number.slice(1) : number;

    const files = isPriority
      ? ["audio/uu-tien.mp3", "audio/a.mp3", `audio/so-${numOnly}.mp3`, `audio/${slug}.mp3`]
      : ["audio/moi-so.mp3", `audio/so-${number}.mp3`, `audio/${slug}.mp3`];

    enqueueAudioSequence(files);
}

function switchClinic() {
    // Ẩn giao diện gọi bệnh nhân
    document.getElementById("phongkham-action").style.display = "none";
  
    // Hiện lại khối chọn phòng
    document.getElementById("clinic-select-container").style.display = "block";
  
    // Ẩn nút Đổi phòng khám + Đăng xuất
    document.getElementById("top-right-buttons").style.display = "none";
  
    // Đổi lại tiêu đề
    document.getElementById("main-heading").innerText = "VUI LÒNG THIẾT LẬP PHÒNG KHÁM!";
  
    // Ẩn tên phòng khám ở tiêu đề
    document.getElementById("clinic-name-display").style.display = "none";
  
    // Xoá lựa chọn phòng khám đã lưu
    localStorage.removeItem("selectedClinic");
  }
  function loadHighlight() {
    const saved = localStorage.getItem("highlightHTML");
    if (saved) {
        document.getElementById("highlight-service").innerHTML = saved;
    }
  }
  
   function showClinicSelect() {
    document.getElementById("clinic-select-container").style.display = "block";
    document.getElementById("phongkham-action").style.display = "none";
    document.getElementById("top-right-buttons").style.display = "none";
    document.getElementById("main-heading").innerText = "VUI LÒNG THIẾT LẬP PHÒNG KHÁM!";
    document.getElementById("clinic-name-display").style.display = "none";
  }
  function renderClinicSelect() {
    const select = document.getElementById("clinic-select");
    select.innerHTML = '<option value="">-- Chọn phòng khám --</option>';
    clinics.forEach(clinic => {
      const option = document.createElement("option");
      option.value = clinic.name;
      option.textContent = clinic.name;
      select.appendChild(option);
    });
  }
  function saveHighlight() {
  const content = quill.root.innerHTML.trim();
  if (!content) {
    alert("Nội dung không được để trống!");
    return;
  }

  localStorage.setItem("highlightHTML", content);
  document.getElementById("highlight-service").innerHTML = content;

  // 💾 Lưu lên Firebase
  firebase.database().ref("highlightHTML").set(content);

  alert("Đã lưu nội dung dịch vụ nổi bật!");
}