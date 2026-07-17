/**
 * Donate Page Logic
 */

(function () {
    'use strict';

    /* ---------- Payment Modal ---------- */
    const payModal = document.getElementById('payModal');

    function openPayModal() {
        payModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePayModal(event) {
        if (event.target.closest('.pay-modal-content')) return;
        payModal.classList.remove('active');
        if (!qrSubmodal.classList.contains('active')) {
            document.body.style.overflow = '';
        }
    }

    /* ---------- QR Sub-modal ---------- */
    const qrSubmodal = document.getElementById('qrSubmodal');
    const qrSubImg = document.getElementById('qrSubImg');
    const qrSubTitle = document.getElementById('qrSubTitle');

    const qrData = {
        wechat: { src: 'assets/images/weixin.webp', title: '微信支付' },
        alipay: { src: 'assets/images/zhifubao.webp', title: '支付宝' }
    };

    function showQR(type) {
        const data = qrData[type];
        if (!data) return;
        qrSubImg.style.backgroundImage = 'url(' + data.src + ')';
        qrSubTitle.textContent = data.title;
        qrSubmodal.classList.add('active');
    }

    function closeQRSub(event) {
        if (event.target.closest('.qr-sub-content')) return;
        qrSubmodal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ---------- Donor List ---------- */
    function decodeDonors(base64) {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            // Reverse bytes
            const reversed = bytes.reverse();
            return new TextDecoder('utf-8').decode(reversed);
        } catch {
            return '';
        }
    }

    async function loadDonors() {
        try {
            const response = await fetch('donations.md');
            if (!response.ok) return;
            const text = await response.text();
            // Find base64 lines (skip HTML comments)
            const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('<'));
            if (!lines.length) return;

            const donors = [];
            for (const line of lines) {
                const decoded = decodeDonors(line);
                if (!decoded) continue;
                // Format: "name:amount"
                const name = decoded.split(':')[0];
                if (name) donors.push(name);
            }

            if (!donors.length) return;

            const listEl = document.getElementById('donor-list');
            const sectionEl = document.getElementById('donor-section');
            listEl.innerHTML = donors.map(n => `<li>${n}</li>`).join('');
            sectionEl.style.display = '';
        } catch {
            // Silently fail
        }
    }

    /* ---------- Keyboard ---------- */
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (qrSubmodal.classList.contains('active')) {
            qrSubmodal.classList.remove('active');
            document.body.style.overflow = '';
        } else if (payModal.classList.contains('active')) {
            payModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    /* ---------- Init ---------- */
    document.addEventListener('DOMContentLoaded', loadDonors);

    /* Expose globals for inline onclick handlers */
    window.openPayModal = openPayModal;
    window.closePayModal = closePayModal;
    window.showQR = showQR;
    window.closeQRSub = closeQRSub;
})();
