/* ========================================
   Donate Page Logic
   ======================================== */

(function () {
    'use strict';

    const modal = document.getElementById('qrModal');
    const qrImage = document.getElementById('qrImage');
    const qrTitle = document.getElementById('qrTitle');

    const qrData = {
        wechat: {
            src: 'assets/images/weixin.jpg',
            title: '微信支付',
            color: '#07C160'
        },
        alipay: {
            src: 'assets/images/zhifubao.jpg',
            title: '支付宝',
            color: '#1677FF'
        }
    };

    function showQR(type) {
        const data = qrData[type];
        if (!data) return;

        qrImage.src = data.src;
        qrTitle.textContent = data.title;
        qrTitle.style.color = data.color;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeQR(event, force) {
        if (!force && event.target.closest('.qr-modal-content')) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeQR(e, true);
            }
        });
    });

    window.showQR = showQR;
    window.closeQR = closeQR;
})();
