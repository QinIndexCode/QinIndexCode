(function() {
    // 增强滚动阻尼效果
    let isScrolling = false;
    let scrollTimeout;
    let lastScrollTop = 0;
    let scrollVelocity = 0;
    
    // 阻尼系数（值越大阻尼越强）
    const DAMPING_FACTOR = 0.85;
    const VELOCITY_THRESHOLD = 0.5;
    
    // 监听滚动事件
    window.addEventListener('scroll', function(e) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const delta = Math.abs(scrollTop - lastScrollTop);
        const direction = scrollTop > lastScrollTop ? 1 : -1;
        
        // 计算滚动速度
        scrollVelocity = delta * direction;
        lastScrollTop = scrollTop;
        
        // 清除之前的超时
        clearTimeout(scrollTimeout);
        
        // 添加阻尼效果
        if (Math.abs(scrollVelocity) > VELOCITY_THRESHOLD) {
            isScrolling = true;
            document.body.style.setProperty('--scroll-velocity', Math.abs(scrollVelocity));
            
            // 逐渐减速
            scrollTimeout = setTimeout(() => {
                scrollVelocity *= DAMPING_FACTOR;
                isScrolling = false;
                document.body.style.setProperty('--scroll-velocity', '0');
            }, 50);
        }
    }, { passive: true });
    
    // 触摸设备增强阻尼
    let touchStartY = 0;
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].pageY;
        touchStartTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        const touchY = e.touches[0].pageY;
        const deltaY = touchY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;
        
        // 计算触摸滚动速度
        const velocity = Math.abs(deltaY / deltaTime);
        
        // 根据速度调整阻尼
        if (velocity < 0.5) {
            // 慢速滚动时增加阻尼
            e.preventDefault();
            window.scrollBy(0, deltaY * 0.7);
        }
        
        touchStartY = touchY;
        touchStartTime = Date.now();
    }, { passive: false });
    
    // 鼠标滚轮增强阻尼
    let wheelTimeout;
    let wheelDelta = 0;
    
    document.addEventListener('wheel', function(e) {
        wheelDelta += e.deltaY;
        
        // 清除之前的超时
        clearTimeout(wheelTimeout);
        
        // 应用阻尼效果
        wheelTimeout = setTimeout(() => {
            wheelDelta *= DAMPING_FACTOR;
            if (Math.abs(wheelDelta) < 1) {
                wheelDelta = 0;
            }
        }, 30);
    }, { passive: true });
    
    console.log('✅ Scroll damping enhanced');
})();
