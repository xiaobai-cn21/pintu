/**
 * 移动端触摸支持
 * 为拼图游戏提供触摸拖拽功能
 */

class MobileTouchHandler {
    constructor() {
        this.isMobile = this.detectMobile();
        this.touchStartPos = { x: 0, y: 0 };
        this.touchCurrentPos = { x: 0, y: 0 };
        this.isDragging = false;
        this.draggedElement = null;
        this.touchOffset = { x: 0, y: 0 };
        
        console.log('移动端检测结果:', this.isMobile);
        console.log('用户代理:', navigator.userAgent);
        console.log('窗口宽度:', window.innerWidth);
        
        if (this.isMobile) {
            this.initMobileSupport();
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    initMobileSupport() {
        console.log('移动端触摸支持已启用');
        
        // 添加调试面板
        this.addDebugPanel();
        
        // 等待DOM加载完成后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initTouchEvents();
                this.initPiecesZoneScroll();
            });
        } else {
            this.initTouchEvents();
            this.initPiecesZoneScroll();
        }
        
        // 添加移动端特定的CSS类
        document.body.classList.add('mobile-device');
    }
    
    addDebugPanel() {
        // 创建调试面板
        const debugPanel = document.createElement('div');
        debugPanel.id = 'mobile-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 200px;
            background: rgba(32, 34, 58, 0.9);
            border: 2px solid #F9E078;
            border-radius: 5px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            color: #F9E078;
            z-index: 10000;
            display: none;
        `;
        
        debugPanel.innerHTML = `
            <div style="margin-bottom: 10px;">
                <button id="debug-toggle" style="background: #F9E078; color: #20223A; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">调试</button>
                <button id="debug-clear" style="background: #F9E078; color: #20223A; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">清除</button>
            </div>
            <div id="debug-log" style="max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 3px;"></div>
        `;
        
        document.body.appendChild(debugPanel);
        
        // 添加调试按钮
        const debugBtn = document.createElement('button');
        debugBtn.id = 'debug-btn';
        debugBtn.innerHTML = '🐛';
        debugBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: #F9E078;
            color: #20223A;
            border: 2px solid #20223A;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(debugBtn);
        
        // 添加事件监听器
        debugBtn.addEventListener('click', () => {
            const panel = document.getElementById('mobile-debug-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        document.getElementById('debug-toggle').addEventListener('click', () => {
            const panel = document.getElementById('mobile-debug-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        document.getElementById('debug-clear').addEventListener('click', () => {
            document.getElementById('debug-log').innerHTML = '';
        });
        
        // 重写console.log
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.addDebugLog(args.join(' '));
        };
    }
    
    addDebugLog(message) {
        const debugLog = document.getElementById('debug-log');
        if (!debugLog) return;
        
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 5px;
            padding: 2px;
            border-bottom: 1px solid rgba(249, 224, 120, 0.3);
            word-break: break-all;
        `;
        logEntry.textContent = new Date().toLocaleTimeString() + ': ' + message;
        
        debugLog.appendChild(logEntry);
        debugLog.scrollTop = debugLog.scrollHeight;
        
        // 限制日志条数
        const logs = debugLog.children;
        if (logs.length > 50) {
            debugLog.removeChild(logs[0]);
        }
    }
    
    initTouchEvents() {
        // 添加触摸事件监听器
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // 防止页面滚动
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    initPiecesZoneScroll() {
        const piecesZone = document.querySelector('.pieces-zone');
        if (!piecesZone) {
            console.log('拼图块栏未找到，延迟初始化');
            // 延迟重试
            setTimeout(() => this.initPiecesZoneScroll(), 1000);
            return;
        }
        
        console.log('初始化拼图块栏滚动');
        
        let startY = 0;
        let scrollTop = 0;
        let isScrolling = false;
        let scrollStartTime = 0;
        
        // 添加滚动按钮
        this.addScrollButtons(piecesZone);
        
        piecesZone.addEventListener('touchstart', (e) => {
            // 检查是否点击在拼图块上
            const piece = e.target.closest('.puzzle-piece');
            if (piece) {
                console.log('点击在拼图块上，不处理滚动');
                // 如果点击的是拼图块，不处理滚动
                return;
            }
            
            // 检查是否点击在滚动按钮上
            if (e.target.closest('.scroll-btn')) {
                console.log('点击在滚动按钮上');
                return;
            }
            
            console.log('开始滚动');
            startY = e.touches[0].clientY;
            scrollTop = piecesZone.scrollTop;
            isScrolling = true;
            scrollStartTime = Date.now();
        }, { passive: true });
        
        piecesZone.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            
            const currentY = e.touches[0].clientY;
            const deltaY = startY - currentY;
            piecesZone.scrollTop = scrollTop + deltaY;
            
            e.preventDefault();
        }, { passive: false });
        
        piecesZone.addEventListener('touchend', () => {
            isScrolling = false;
        }, { passive: true });
    }
    
    addScrollButtons(piecesZone) {
        // 创建滚动按钮容器
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'mobile-scroll-container';
        scrollContainer.style.cssText = `
            position: absolute;
            right: -40px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
        `;
        
        // 向上滚动按钮
        const upBtn = document.createElement('button');
        upBtn.className = 'scroll-btn scroll-up';
        upBtn.innerHTML = '↑';
        upBtn.style.cssText = `
            width: 30px;
            height: 30px;
            background: #F9E078;
            color: #20223A;
            border: 2px solid #20223A;
            border-radius: 0;
            font-family: 'Zpix', monospace;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // 向下滚动按钮
        const downBtn = document.createElement('button');
        downBtn.className = 'scroll-btn scroll-down';
        downBtn.innerHTML = '↓';
        downBtn.style.cssText = upBtn.style.cssText;
        
        // 添加点击事件
        upBtn.addEventListener('click', () => {
            piecesZone.scrollTop -= 100;
        });
        
        downBtn.addEventListener('click', () => {
            piecesZone.scrollTop += 100;
        });
        
        scrollContainer.appendChild(upBtn);
        scrollContainer.appendChild(downBtn);
        
        // 将滚动按钮添加到拼图块栏
        piecesZone.style.position = 'relative';
        piecesZone.appendChild(scrollContainer);
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        const target = e.target.closest('.puzzle-piece');
        
        if (!target) return;
        
        console.log('触摸开始 - 拼图块:', target);
        
        // 记录触摸起始位置和时间
        this.touchStartPos = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
        
        // 计算元素相对于触摸点的偏移
        const rect = target.getBoundingClientRect();
        this.touchOffset = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
        
        // 延迟启动拖拽，避免与单击/双击/三击冲突
        this.dragStartTimer = setTimeout(() => {
            console.log('拖拽启动');
            this.startDragging(target, touch);
        }, 200); // 200ms延迟，给点击手势更多时间
        
        e.preventDefault();
    }
    
    startDragging(target, touch) {
        this.isDragging = true;
        this.draggedElement = target;
        
        // 添加拖拽样式
        target.classList.add('dragging');
        target.style.position = 'fixed';
        target.style.zIndex = '1000';
        target.style.pointerEvents = 'none';
        
        // 触发拖拽开始事件
        this.triggerDragStart(target, touch);
    }
    
    handleTouchMove(e) {
        // 如果还没有开始拖拽，检查是否需要取消拖拽
        if (!this.isDragging && this.dragStartTimer) {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - this.touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - this.touchStartPos.y);
            
            // 如果移动距离很小，取消拖拽
            if (deltaX < 10 && deltaY < 10) {
                clearTimeout(this.dragStartTimer);
                this.dragStartTimer = null;
                return;
            }
        }
        
        if (!this.isDragging || !this.draggedElement) return;
        
        const touch = e.touches[0];
        
        // 更新当前位置
        this.touchCurrentPos = {
            x: touch.clientX,
            y: touch.clientY
        };
        
        // 移动元素
        this.draggedElement.style.left = (touch.clientX - this.touchOffset.x) + 'px';
        this.draggedElement.style.top = (touch.clientY - this.touchOffset.y) + 'px';
        
        // 触发拖拽移动事件
        this.triggerDragMove(this.draggedElement, touch);
        
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        // 清除拖拽启动定时器
        if (this.dragStartTimer) {
            clearTimeout(this.dragStartTimer);
            this.dragStartTimer = null;
        }
        
        if (!this.isDragging || !this.draggedElement) {
            // 如果没有拖拽，检查是否是单击/双击/三击
            this.handleTap(e);
            return;
        }
        
        const touch = e.changedTouches[0];
        
        // 检查是否放置在拼图板上
        const puzzleBoard = document.querySelector('.puzzle-board');
        if (puzzleBoard) {
            const boardRect = puzzleBoard.getBoundingClientRect();
            const pieceRect = this.draggedElement.getBoundingClientRect();
            
            // 检查是否在拼图板范围内
            if (this.isOverlapping(pieceRect, boardRect)) {
                // 计算网格位置
                const gridX = Math.floor((touch.clientX - boardRect.left) / (boardRect.width / 4));
                const gridY = Math.floor((touch.clientY - boardRect.top) / (boardRect.height / 4));
                
                // 触发放置事件
                this.triggerDropOnBoard(this.draggedElement, gridX, gridY, touch);
            }
        }
        
        // 触发拖拽结束事件
        this.triggerDragEnd(this.draggedElement, touch);
        
        // 重置状态
        this.isDragging = false;
        this.draggedElement.classList.remove('dragging');
        this.draggedElement.style.position = '';
        this.draggedElement.style.zIndex = '';
        this.draggedElement.style.pointerEvents = '';
        this.draggedElement.style.left = '';
        this.draggedElement.style.top = '';
        
        this.draggedElement = null;
        
        e.preventDefault();
    }
    
    handleTap(e) {
        const target = e.target.closest('.puzzle-piece');
        if (!target) return;
        
        console.log('点击检测 - 拼图块:', target);
        
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - (this.lastTapTime || 0);
        
        if (timeSinceLastTap < 500) {
            // 连续点击
            this.tapCount = (this.tapCount || 0) + 1;
            console.log('连续点击次数:', this.tapCount);
            
            if (this.tapCount === 2) {
                // 双击 - 旋转
                console.log('双击检测 - 旋转拼图块');
                this.rotatePiece(target);
                this.tapCount = 0;
            } else if (this.tapCount === 3) {
                // 三击 - 翻转
                console.log('三击检测 - 翻转拼图块');
                this.flipPiece(target);
                this.tapCount = 0;
            }
        } else {
            // 单击
            console.log('单击检测');
            this.tapCount = 1;
        }
        
        this.lastTapTime = currentTime;
        
        // 重置计数
        setTimeout(() => {
            this.tapCount = 0;
        }, 500);
    }
    
    isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    triggerDropOnBoard(element, gridX, gridY, touch) {
        // 创建自定义放置事件
        const dropEvent = new CustomEvent('mobileDropOnBoard', {
            detail: {
                element: element,
                gridX: gridX,
                gridY: gridY,
                clientX: touch.clientX,
                clientY: touch.clientY
            }
        });
        element.dispatchEvent(dropEvent);
    }
    
    triggerDragStart(element, touch) {
        // 创建自定义拖拽开始事件
        const dragStartEvent = new CustomEvent('mobileDragStart', {
            detail: {
                element: element,
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: touch.target
            }
        });
        element.dispatchEvent(dragStartEvent);
    }
    
    triggerDragMove(element, touch) {
        // 创建自定义拖拽移动事件
        const dragMoveEvent = new CustomEvent('mobileDragMove', {
            detail: {
                element: element,
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: touch.target
            }
        });
        element.dispatchEvent(dragMoveEvent);
    }
    
    triggerDragEnd(element, touch) {
        // 创建自定义拖拽结束事件
        const dragEndEvent = new CustomEvent('mobileDragEnd', {
            detail: {
                element: element,
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: touch.target
            }
        });
        element.dispatchEvent(dragEndEvent);
    }
}

// 移动端手势支持
class MobileGestureHandler {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       window.innerWidth <= 768;
        
        if (this.isMobile) {
            this.initGestureSupport();
        }
    }
    
    initGestureSupport() {
        // 双击旋转支持 - 已集成到 handleTap 中
        // 三击翻转支持 - 已集成到 handleTap 中
        console.log('手势支持已启用');
    }
    
    rotatePiece(element) {
        console.log('移动端旋转函数被调用:', element);
        // 触发旋转事件
        const rotateEvent = new CustomEvent('mobileRotate', {
            detail: { element: element }
        });
        console.log('触发旋转事件:', rotateEvent);
        element.dispatchEvent(rotateEvent);
        
        // 也尝试直接调用游戏逻辑
        if (window.rotatePiece) {
            console.log('直接调用游戏旋转函数');
            window.rotatePiece(element);
        }
    }
    
    
    flipPiece(element) {
        console.log('移动端翻转函数被调用:', element);
        // 触发翻转事件
        const flipEvent = new CustomEvent('mobileFlip', {
            detail: { element: element }
        });
        console.log('触发翻转事件:', flipEvent);
        element.dispatchEvent(flipEvent);
        
        // 也尝试直接调用游戏逻辑
        if (window.flipPiece) {
            console.log('直接调用游戏翻转函数');
            window.flipPiece(element);
        }
    }
}

// 移动端性能优化
class MobilePerformanceOptimizer {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       window.innerWidth <= 768;
        
        if (this.isMobile) {
            this.initOptimizations();
        }
    }
    
    initOptimizations() {
        // 减少动画复杂度
        this.reduceAnimations();
        
        // 优化图片加载
        this.optimizeImageLoading();
        
        // 减少重绘
        this.reduceRepaints();
    }
    
    reduceAnimations() {
        // 为移动端添加减少动画的CSS类
        document.body.classList.add('reduce-motion');
        
        // 添加CSS规则
        const style = document.createElement('style');
        style.textContent = `
            .reduce-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    optimizeImageLoading() {
        // 延迟加载非关键图片
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    reduceRepaints() {
        // 使用 transform 而不是改变位置属性
        const style = document.createElement('style');
        style.textContent = `
            .puzzle-piece {
                will-change: transform;
            }
            
            .dragging {
                will-change: transform;
            }
        `;
        document.head.appendChild(style);
    }
}

// 初始化移动端支持
document.addEventListener('DOMContentLoaded', () => {
    // 检测移动端并初始化相应功能
    if (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        new MobileTouchHandler();
        new MobileGestureHandler();
        new MobilePerformanceOptimizer();
        
        console.log('移动端优化已启用');
    }
});

// 导出供其他模块使用
window.MobileTouchHandler = MobileTouchHandler;
window.MobileGestureHandler = MobileGestureHandler;
window.MobilePerformanceOptimizer = MobilePerformanceOptimizer;
