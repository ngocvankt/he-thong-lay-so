// ===== Khởi tạo Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyAHLTITwmLt845c1pvhBtvJuV5OLZN0dDA",
  authDomain: "ttytsokhambenh.firebaseapp.com",
  databaseURL: "https://ttytsokhambenh-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "ttytsokhambenh",
  storageBucket: "ttytsokhambenh.appspot.com",
  messagingSenderId: "805566207765",
  appId: "1:805566207765:web:e083cca4dd29bc59a8bb1c"
};
firebase.initializeApp(firebaseConfig);

// Đăng nhập giữ trạng thái
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    startDisplayBoard();
  } else {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('main-section').style.display = 'none';
  }
});

const clinicNameMap = {
  "pho-ng-kha-m-đo-ng-y-1": "PK. Đông Y 1",
  "pho-ng-kha-m-đo-ng-y-2": "PK. Đông Y 2",
  "pho-ng-kha-m-ngoa-i-to--ng-ho--p": "PK. Ngoại Tổng hợp",
  "pho-ng-kha-m-nhi-1": "PK. Nhi 1",
  "pho-ng-kha-m-nhi-2": "PK. Nhi 2",
  "pho-ng-kha-m-no--i-1": "PK. Nội 1",
  "pho-ng-kha-m-no--i-2": "PK. Nội 2",
  "pho-ng-kha-m-no--i-3": "PK. Nội 3",
  "pho-ng-kha-m-no--i-4": "PK. Nội 4",
  "pho-ng-kha-m-no--i-to--ng-ho--p": "PK. Nội Tổng hợp",
  "pho-ng-kha-m-sa-n-khoa": "PK. Sản khoa",
  "pho-ng-kha-m-ma--t": "PK. Mắt",
  "pho-ng-kha-m-tai-mui-hong": "PK. Tai Mũi Họng",
  "pho-ng-kha-m-ra-ng-ha-m-ma--t": "PK. Răng Hàm Mặt"
};

let allClinics = [];
const effectQueues = {}; // { key: [number, ...] }
const effectStatus = {}; // { key: true/false }
const lastDisplayedNumbers = {}; // { key: number }

// ===== Giao diện bảng chia 2 cột, mỗi số nháy riêng =====
function renderBoardQueue(clinicNumbers) {
  const n = Math.ceil(clinicNumbers.length / 2);
  let left = clinicNumbers.slice(0, n);
  let right = clinicNumbers.slice(n);

  function makeTable(list, offset = 0) {
    let html = `
      <table class="display-table">
        <thead>
          <tr>
            <th style="width:70%;">TÊN PHÒNG KHÁM</th>
            <th style="width:30%;">SỐ ĐÃ GỌI</th>
          </tr>
        </thead>
        <tbody>
    `;
    list.forEach((item, i) => {
      const key = Object.keys(clinicNameMap)[i + offset];
      let displayNumber = lastDisplayedNumbers[key] !== undefined ? lastDisplayedNumbers[key] : "...";
      let flashClass = (effectStatus[key]) ? "flash" : "";
      html += `
        <tr>
          <td class="name-cell">${item.name.toUpperCase()}</td>
          <td class="number-cell" data-key="${key}">
            <span class="${flashClass}">${displayNumber}</span>
          </td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    return html;
  }

  document.getElementById('board').innerHTML = `
    <div class="split-tables">
      ${makeTable(left, 0)}
      ${makeTable(right, n)}
    </div>
  `;
}

// ===== Xử lý hiệu ứng nháy queue cho từng phòng khám =====
function playNextNumber(clinicKey) {
  if (!effectQueues[clinicKey] || effectQueues[clinicKey].length === 0) {
    effectStatus[clinicKey] = false;
    return;
  }
  effectStatus[clinicKey] = true;
  // Lấy số đầu queue để hiển thị
  lastDisplayedNumbers[clinicKey] = effectQueues[clinicKey][0];
  // Render lại bảng
  renderBoardQueue(allClinics);

  // Sau khi nháy xong (vd: 2.1s), bỏ số khỏi queue, nháy tiếp số sau nếu có
  setTimeout(() => {
    effectStatus[clinicKey] = false;
    renderBoardQueue(allClinics);

    effectQueues[clinicKey].shift();
    // Nếu còn số → tiếp tục
    if (effectQueues[clinicKey].length > 0) {
      setTimeout(() => playNextNumber(clinicKey), 100); // Dư 0.1s cho an toàn
    }
  }, 3500); 
}

// ===== Đăng nhập =====
function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('main-section').style.display = 'block';
      startDisplayBoard();
    })
    .catch(err => {
      document.getElementById('login-error').innerText = 'Sai tài khoản hoặc mật khẩu!';
    });
}

// ===== Lắng nghe dữ liệu Firebase, push queue hiệu ứng =====
function startDisplayBoard() {
  firebase.database().ref("calledHistory").on("value", snapshot => {
    const data = snapshot.val() || {};

    allClinics = Object.keys(clinicNameMap).map(key => {
      const arr = data[key];
      let lastNumber = Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : "...";
      let name = clinicNameMap[key];
      return { key, name, number: lastNumber };
    });

    // So sánh từng phòng khám
    allClinics.forEach(item => {
      const clinicKey = item.key;
      const newNumber = item.number;

      if (!effectQueues[clinicKey]) effectQueues[clinicKey] = [];
      if (!lastDisplayedNumbers[clinicKey]) lastDisplayedNumbers[clinicKey] = "...";

      if (
        newNumber !== "..."
        && newNumber !== lastDisplayedNumbers[clinicKey]
        && !effectQueues[clinicKey].includes(newNumber)
      ) {
        effectQueues[clinicKey].push(newNumber);
        if (!effectStatus[clinicKey]) {
          playNextNumber(clinicKey);
        }
      }
    });

    // Lần đầu load
    renderBoardQueue(allClinics);
  });
}
