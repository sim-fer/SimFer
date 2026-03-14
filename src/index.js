import WebTorrent from "webtorrent/dist/webtorrent.min.js";

let uploadedFiles, uploadedInfoHash, otpServerEnabled = false;
const client = new WebTorrent();

function getMagnetLink(infoHash) {
  return `magnet:?xt=urn:btih:${infoHash}&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev`
}

function createFileLink(fileName, url) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('class', 'download-link');
  a.textContent = fileName;
  a.download = fileName;
  return a;
}

window.onbeforeunload = (e) => {
  e.preventDefault();
  return (e.returnValue = "");
}

document.addEventListener('DOMContentLoaded', () => {
  const loadingText = document.getElementById('loading');
  const uploadArea = document.getElementById('uploadArea');
  const otpArea = document.getElementById('otpArea');
  const otpMsg = document.getElementById('otpMsg');
  const otpSubmit = document.getElementById('otpSubmit');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const fileNameDisplay = document.getElementById('fileName');
  const uploadButton = document.getElementById('uploadButton');
  const cancelButton = document.getElementById('cancelButton');
  const uploadInfo = document.getElementById('uploadInfo');
  const infoHash = document.getElementById('infoHash');
  const otpViewer = document.getElementById('otpViewer');
  const createOTP = document.getElementById('createOTP');
  const copyURL = document.getElementById('copyURL');
  const downloadInfo = document.getElementById('downloadInfo');
  const downloadStatus = document.getElementById('downloadStatus');
  const downloadAll = document.getElementById('downloadAll');
  const downloadItems = document.getElementById('downloadItems');
  const qrcodeArea = document.getElementById('qrcodeArea');
  const otpInputs = document.querySelectorAll(".otp-input");

  // Check OTP server
  fetch(`${import.meta.env.VITE_OTP_BASE_URL}/`).then(res => {
    otpServerEnabled = res.status === 204;
    otpMsg.style.display = 'none';
  });

  function displayElem(name) {
    loadingText.style.display = name === 'loading' ? 'block' : 'none';
    uploadArea.style.display = name === 'upload-area' ? 'block' : 'none';
    otpArea.style.display = name === 'upload-area' ? 'block' : 'none';
    fileInfo.style.display = name === 'file-info' ? 'block' : 'none';
    uploadInfo.style.display = name === 'upload-info' ? 'block' : 'none';
    downloadInfo.style.display = name === 'download-info' ? 'block' : 'none';
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has('h')) {
    displayElem('loading');
    client.add(getMagnetLink(params.get('h')), onTorrentAdd);
  }

  function onTorrentSeed(torrent) {
    uploadedInfoHash = torrent.infoHash;
    const shareUrl = `https://${window.location.host}?h=${uploadedInfoHash}`
    infoHash.textContent = shareUrl;
    copyURL.onclick = () => {
      navigator.clipboard.writeText(shareUrl).then(() => copyURL.textContent = 'Copied');
    }
    qrcodeArea.setAttribute('src', `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${shareUrl}`);
    displayElem('upload-info');
  }

  function onTorrentAdd(torrent) {
    downloadStatus.textContent = `Downloads: ${(torrent.progress * 100).toFixed(1)}%`;
    displayElem('download-info');
    torrent.on('download', (bytes) => {
      if (torrent.progress == 1) downloadStatus.textContent = 'Done (File sharing enabled)';
      downloadStatus.textContent = `Downloads: ${(torrent.progress * 100).toFixed(1)}%`;
      // console.log('just downloaded: ' + bytes);
      // console.log('total downloaded: ' + torrent.downloaded);
      // console.log('download speed: ' + torrent.downloadSpeed);
      // console.log('progress: ' + torrent.progress);
    });

    torrent.on('done', async () => {
      downloadStatus.textContent = 'Done (File sharing enabled)';
      downloadItems.style.display = 'block';
      if (torrent.files.length > 1) {
        downloadAll.style.display = 'block';
      }
      const downloadItemsList = [];
      for (const file of torrent.files) {
        try {
          const blob = await file.blob();
          const downloadItem = createFileLink(file.name, URL.createObjectURL(blob));
          downloadItemsList.push(downloadItem);
        } catch (err) {
          if (err) console.log(err.message);
        }
      }
      downloadItems.append(...downloadItemsList);
      downloadAll.onclick = () => {
        downloadItemsList.forEach(elem => {
          elem.click();
        });
      }
    });

  }

  // 클릭하여 파일 선택
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // 드래그 앤 드롭 이벤트 처리
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  uploadArea.addEventListener('dragenter', () => {
    uploadArea.classList.add('active');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('active');
  });

  uploadArea.addEventListener('drop', (e) => {
    uploadArea.classList.remove('active');
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    handleFiles(files);
  });

  function handleFiles(files) {
    if (files.length > 0) {
      uploadedFiles = files;

      // 파일 정보 표시
      const firstFileName = files[0].name;
      const fileCount = files.length - 1;
      fileNameDisplay.textContent = fileCount > 0
        ? `${firstFileName} and ${fileCount} ${fileCount > 1 ? 'others' : 'other'}`
        : firstFileName;

      // 파일 정보 영역 표시
      displayElem('file-info');
    }
  }

  // 업로드 버튼 클릭 이벤트
  uploadButton.addEventListener('click', () => {
    // 업로드 로직 구현
    //   alert('파일이 업로드되었습니다.');
    displayElem('loading');
    client.seed(uploadedFiles, onTorrentSeed);
    //   resetUpload();
  });

  // 취소 버튼 클릭 이벤트
  cancelButton.addEventListener('click', () => {
    resetUpload();
  });

  function resetUpload() {
    displayElem('upload-area');
    // 파일 입력 초기화
    fileInput.value = '';

    // 파일 이름 초기화
    fileNameDisplay.textContent = '';
  }

  function checkAllInputsFilled() {
    if (!otpServerEnabled) return;
    const allFilled = Array.from(otpInputs).every(input => input.value.length === 1);
    if (allFilled) {
      otpSubmit.disabled = false;
      otpSubmit.classList.add("enabled");
    } else {
      otpSubmit.disabled = true;
      otpSubmit.classList.remove("enabled");
    }
  }

  otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const value = e.target.value;
      if (value.match(/[^0-9]/)) {
        e.target.value = "";
        return;
      }
      if (value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
      checkAllInputsFilled();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  otpSubmit.onclick = () => {
    if (otpSubmit.disabled) return;
    const otp = Array.from(otpInputs).map(e => e.value).toString().replaceAll(',', '');
    fetch(`${import.meta.env.VITE_OTP_BASE_URL}/get?otp=${otp}`).then(async (res) => {
      if (res.status !== 200) {
        otpMsg.style.display = 'block';
        otpMsg.textContent = 'Password not found.';
        return;
      }
      otpMsg.style.display = 'none';
      const infohash = await res.text();
      displayElem('loading');
      client.add(getMagnetLink(infohash), onTorrentAdd);
    });
  }

  createOTP.onclick = () => {
    if (createOTP.classList.contains('disabled')) return;
    createOTP.textContent = 'Loading...';

    fetch(`${process.env.OTP_BASE_URL}/create`, {
      mode: 'cors',
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ infohash: uploadedInfoHash })
    }).then(async (res) => {
      if (res.status !== 200) return;

      createOTP.classList.add("disabled");

      const otp = await res.text();

      const endTime = Date.now() + 30000;
      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= endTime) {
          clearInterval(interval);
          createOTP.classList.remove("disabled");
          createOTP.textContent = 'Create OTP';
          otpViewer.style.display = 'none';

          fetch(`${process.env.OTP_BASE_URL}/delete?otp=${otp}`).then(res => res.text().then(msg => console.log(msg)));
          return;
        }
        createOTP.textContent = `${Math.round((endTime - now) / 1000)}s`;
      }, 1000);

      otpViewer.textContent = otp;
      otpViewer.style.display = 'block';
    });
  }
});