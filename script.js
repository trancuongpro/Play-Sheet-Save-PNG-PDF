console.log(">>>> Chào Mừng Đến Với Web Của Trần Cường.Zalo:0907860662 <<<<");

document.addEventListener('DOMContentLoaded', () => {
    // --- Lấy các phần tử trên trang ---
    const container = document.querySelector('#alpha-tab-container');
    const uploadButton = document.querySelector('#upload-button');
    const fileInput = document.querySelector('#file-input');
    const fileNameDisplay = document.querySelector('#file-name');
    
    const exportPngBtn = document.querySelector('#export-png-btn');
    const exportPdfBtn = document.querySelector('#export-pdf-btn');
    
    const playPauseBtn = document.querySelector('#play-pause-btn');
    const playPauseBtnText = playPauseBtn.querySelector('span');
    const stopBtn = document.querySelector('#stop-btn');
    
    const timelineSlider = document.querySelector('#timeline-slider');
    const currentTimeLabel = document.querySelector('#current-time');

    // --- Biến toàn cục ---
    let alphaTabApi = null;
    let customCursor = null; 
    let alphaTabCursor = null;
    let animationFrameId = null;

    // --- DỮ LIỆU DÀNH RIÊNG CHO CÁC THƯ VIỆN ---
    let dataForAlphaTab = null; // Dạng ArrayBuffer, cho cả GPX và MusicXML
    let dataForOSMD = null;     // Dạng Text, chỉ dành cho MusicXML

    const leadDistance = 30;

    // --- Các hàm tiện ích ---
    function formatTime(seconds) {
        const safeSeconds = Math.round(seconds || 0);
        const m = Math.floor(safeSeconds / 60);
        const s = Math.floor(safeSeconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function setControlsEnabled(playerControls, exportControls) {
        playPauseBtn.disabled = !playerControls;
        stopBtn.disabled = !playerControls;
        exportPngBtn.disabled = !exportControls;
        exportPdfBtn.disabled = !exportControls;
    }

    function createCustomCursor() {
        const existingCursor = document.getElementById('custom-cursor');
        if (existingCursor) existingCursor.remove();
        customCursor = document.createElement('div');
        customCursor.id = 'custom-cursor';
        container.appendChild(customCursor);
    }
    
    function cursorUpdateLoop() {
        if (customCursor && alphaTabCursor) {
            const style = window.getComputedStyle(alphaTabCursor);
            const matrix = new DOMMatrix(style.transform);
            const alphaX = matrix.m41;
            const alphaY = matrix.m42;
            customCursor.style.transform = `translate(${alphaX + leadDistance}px, ${alphaY}px)`;
        }
        animationFrameId = requestAnimationFrame(cursorUpdateLoop);
    }
    
    function startCursorLoop() {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(cursorUpdateLoop);
    }

    function stopCursorLoop() {
        cancelAnimationFrame(animationFrameId);
    }

    // --- Logic tải file ---
    uploadButton.addEventListener('click', () => { fileInput.click(); });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset tất cả
        fileNameDisplay.textContent = file.name;
        container.innerHTML = '<p class="placeholder">Đây Là Sheet Của Bạn</p>';
        setControlsEnabled(false, false);
        stopCursorLoop(); 
        createCustomCursor(); 
        if (alphaTabApi) alphaTabApi.destroy();
        dataForAlphaTab = null;
        dataForOSMD = null;
        
        // --- LUỒNG 1: ĐỌC DỮ LIỆU CHO ALPHATAB (ArrayBuffer) ---
        const readerForAlphaTab = new FileReader();
        readerForAlphaTab.onload = (event) => {
            dataForAlphaTab = event.target.result;
            
            const settings = { 
                core: { fontDirectory: './', engine: { copyright: false } }, 
                player: { enablePlayer: true, soundFont: 'sonivox.sf3', enableCursor: true } 
            };
            alphaTabApi = new alphaTab.AlphaTabApi(container, settings);
            setupAlphaTabEvents();
            alphaTabApi.load(dataForAlphaTab);
        };
        readerForAlphaTab.readAsArrayBuffer(file);


        // --- LUỒNG 2: ĐỌC DỮ LIỆU CHO OSMD (Text) ---
        // Chỉ thực hiện nếu là file XML
        const isXmlFile = file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.musicxml');
        if (isXmlFile) {
            const readerForOSMD = new FileReader();
            readerForOSMD.onload = (event) => {
                dataForOSMD = event.target.result;
                // Kích hoạt nút xuất file khi cả AlphaTab render xong và dữ liệu OSMD đã sẵn sàng
                if (playPauseBtn.disabled === false) {
                    setControlsEnabled(true, true);
                }
            };
            readerForOSMD.readAsText(file);
        }
    });

    // --- Cài đặt các sự kiện của AlphaTab ---
    function setupAlphaTabEvents() {
        alphaTabApi.playerReady.on(() => {
            timelineSlider.max = alphaTabApi.player.duration;
            currentTimeLabel.textContent = formatTime(0);
        });
        
        alphaTabApi.renderFinished.on(() => {
            alphaTabCursor = container.querySelector('.at-cursor-bar');
            if(customCursor) customCursor.classList.add('visible');
            startCursorLoop();

            // Kích hoạt các nút điều khiển nhạc
            // Nếu dữ liệu cho OSMD cũng đã sẵn sàng, nút export cũng sẽ được kích hoạt
            const canExport = dataForOSMD !== null;
            setControlsEnabled(true, canExport);
        });

        alphaTabApi.playerStateChanged.on(e => {
            playPauseBtnText.textContent = e.state === 1 ? 'Pause' : 'Play';
        });

        alphaTabApi.playerPositionChanged.on(e => {
            timelineSlider.value = e.currentTime;
            currentTimeLabel.textContent = formatTime(e.currentTime / 1000);
        });
    }

    // --- Sự kiện của các nút điều khiển ---
    playPauseBtn.addEventListener('click', () => { if (alphaTabApi) alphaTabApi.playPause(); });
    stopBtn.addEventListener('click', () => { 
        if (alphaTabApi) {
            alphaTabApi.stop();
            timelineSlider.value = 0;
            currentTimeLabel.textContent = formatTime(0);
        }
    });

    // --- Gán sự kiện cho các nút xuất file ---
    exportPngBtn.addEventListener('click', () => {
        // Truyền dữ liệu DÀNH RIÊNG cho OSMD
        if (dataForOSMD && typeof exportWithOSMD === 'function') {
            exportWithOSMD(dataForOSMD, 'png', fileNameDisplay.textContent);
        } else {
            alert('Chức năng xuất file chỉ hỗ trợ định dạng MusicXML (.xml, .musicxml).');
        }
    });

    exportPdfBtn.addEventListener('click', () => {
        if (dataForOSMD && typeof exportWithOSMD === 'function') {
            exportWithOSMD(dataForOSMD, 'pdf', fileNameDisplay.textContent);
        } else {
            alert('Chức năng xuất file chỉ hỗ trợ định dạng MusicXML (.xml, .musicxml).');
        }
    });
});