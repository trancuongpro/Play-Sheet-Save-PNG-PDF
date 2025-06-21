/**
 * Hàm chính để xuất bản nhạc ra file ảnh hoặc PDF bằng OSMD
 * @param {string} musicXmlData Dữ liệu file MusicXML (dưới dạng chuỗi)
 * @param {'png' | 'pdf'} format Định dạng file muốn xuất ('png' hoặc 'pdf')
 * @param {string} originalFileName Tên file gốc để đặt tên cho file xuất ra
 */
async function exportWithOSMD(musicXmlData, format, originalFileName) {
    const exportPngBtn = document.getElementById('export-png-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // Vô hiệu hóa các nút để tránh click nhiều lần
    exportPngBtn.disabled = true;
    exportPngBtn.textContent = 'Đang xử lý...';
    exportPdfBtn.disabled = true;

    try {
        const osmdContainer = document.getElementById('osmd-container');
        osmdContainer.innerHTML = ''; 

        // Khởi tạo OSMD, chúng ta không cần tùy chọn backgroundColor nữa
        const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdContainer, {
            autoResize: true,
            backend: "canvas",
            drawingParameters: "compact"
        });

        // Tải và render bản nhạc
        await osmd.load(musicXmlData);
        await new Promise(resolve => requestAnimationFrame(resolve));
        osmd.render();

        const pages = osmdContainer.querySelectorAll('canvas');

        if (pages.length === 0 || pages[0].width === 0) {
            throw new Error("OSMD đã không thể render bản nhạc ra canvas. Kích thước canvas bằng 0.");
        }

        const baseFileName = (originalFileName || 'music-score').replace(/\.[^/.]+$/, "");

        if (format === 'png') {
            const combinedCanvas = document.createElement('canvas');
            const totalWidth = pages[0].width;
            let totalHeight = 0;
            pages.forEach(page => totalHeight += page.height);

            combinedCanvas.width = totalWidth;
            combinedCanvas.height = totalHeight;
            const ctx = combinedCanvas.getContext('2d');
            
            // SỬA LỖI QUAN TRỌNG NHẤT: TỰ TAY TÔ NỀN TRẮNG
            // Đây là bước "sơn lót" để đảm bảo canvas có nền trắng.
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
            
            // Bây giờ mới vẽ các trang nhạc lên trên nền trắng đã có
            let currentY = 0;
            pages.forEach(page => {
                ctx.drawImage(page, 0, currentY);
                currentY += page.height;
            });

            triggerDownload(combinedCanvas.toDataURL('image/png'), `${baseFileName}.png`);

        } else if (format === 'pdf') {
            // Đối với PDF, chúng ta không cần lo lắng vì bản thân trang PDF đã là màu trắng.
            // Khi chúng ta thêm ảnh PNG (kể cả trong suốt) lên, nó sẽ hiện trên nền trắng của PDF.
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: pages[0].width > pages[0].height ? 'l' : 'p',
                unit: 'px',
                format: [pages[0].width, pages[0].height]
            });

            pages.forEach((page, index) => {
                if (index > 0) {
                    pdf.addPage([page.width, page.height]);
                }
                const imgData = page.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, page.width, page.height);
            });
            
            pdf.save(`${baseFileName}.pdf`);
        }
    } catch (error) {
        console.error("Lỗi khi xuất file bằng OSMD:", error);
        alert("Đã xảy ra lỗi trong quá trình xuất file. Vui lòng kiểm tra Console (F12).");
    } finally {
        // Kích hoạt lại các nút và trả lại tên cũ
        exportPngBtn.disabled = false;
        exportPngBtn.textContent = '📄 Xuất PNG';
        exportPdfBtn.disabled = false;
    }
}

/**
 * Hàm tiện ích để kích hoạt tải file về máy
 */
function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}