/**
 * 移动端支持 - 非侵入式设计
 * 不修改原有script.js，通过事件监听和适配层实现移动端功能
 */

class MobileSupport {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isInitialized = false;
        
        if (this.isMobile) {
            this.init();
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    init() {
        if (this.isInitialized) return;
        
        console.log('移动端支持已启用');
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initMobileSupport();
            });
        } else {
            this.initMobileSupport();
        }
        
        this.isInitialized = true;
    }
    
    initMobileSupport() {
        // 添加移动端CSS类
        document.body.classList.add('mobile-device');
        
        // 初始化触摸支持
        this.initTouchSupport();
        
        // 初始化拼图块栏滚动
        this.initPiecesZoneScroll();
        
        // 添加调试面板
        this.addDebugPanel();
    }
    
    initTouchSupport() {
        let touchStartPos = { x: 0, y: 0 };
        let touchOffset = { x: 0, y: 0 };
        let isDragging = false;
        let draggedElement = null;
        let dragStartTimer = null;
        let tapCount = 0;
        let lastTapTime = 0;
        
        // 触摸开始
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const target = e.target.closest('.puzzle-piece');
            
            if (!target) return;
            
            console.log('移动端触摸开始:', target);
            
            // 记录触摸起始位置
            touchStartPos = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            };
            
            // 计算元素相对于触摸点的偏移
            const rect = target.getBoundingClientRect();
            touchOffset = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            // 延迟启动拖拽，避免与点击冲突
            dragStartTimer = setTimeout(() => {
                this.startDragging(target, touch);
                isDragging = true;
                draggedElement = target;
            }, 200);
            
            e.preventDefault();
        }, { passive: false });
        
        // 触摸移动
        document.addEventListener('touchmove', (e) => {
            if (!isDragging || !draggedElement) return;
            
            const touch = e.touches[0];
            
            // 移动元素
            draggedElement.style.position = 'fixed';
            draggedElement.style.zIndex = '1000';
            draggedElement.style.left = (touch.clientX - touchOffset.x) + 'px';
            draggedElement.style.top = (touch.clientY - touchOffset.y) + 'px';
            
            e.preventDefault();
        }, { passive: false });
        
        // 触摸结束
        document.addEventListener('touchend', (e) => {
            // 清除拖拽启动定时器
            if (dragStartTimer) {
                clearTimeout(dragStartTimer);
                dragStartTimer = null;
            }
            
            if (!isDragging || !draggedElement) {
                // 处理点击事件
                this.handleTap(e, touchStartPos);
                return;
            }
            
            const touch = e.changedTouches[0];
            
            // 检查是否放置在拼图板上
            const puzzleBoard = document.querySelector('.puzzle-board');
            if (puzzleBoard) {
                const boardRect = puzzleBoard.getBoundingClientRect();
                const pieceRect = draggedElement.getBoundingClientRect();
                
                // 检查是否在拼图板范围内
                if (this.isOverlapping(pieceRect, boardRect)) {
                    // 计算网格位置
                    const gridX = Math.floor((touch.clientX - boardRect.left) / (boardRect.width / 4));
                    const gridY = Math.floor((touch.clientY - boardRect.top) / (boardRect.height / 4));
                    
                    // 触发放置事件
                    this.triggerDropOnBoard(draggedElement, gridX, gridY);
                }
            }
            
            // 重置拖拽状态
            this.resetDragging(draggedElement);
            isDragging = false;
            draggedElement = null;
            
            e.preventDefault();
        }, { passive: false });
    }
    
    startDragging(target, touch) {
        console.log('移动端拖拽开始:', target);
        
        // 添加拖拽样式
        target.classList.add('dragging');
        target.style.position = 'fixed';
        target.style.zIndex = '1000';
        target.style.pointerEvents = 'none';
    }
    
    resetDragging(element) {
        if (!element) return;
        
        element.classList.remove('dragging');
        element.style.position = '';
        element.style.zIndex = '';
        element.style.pointerEvents = '';
        element.style.left = '';
        element.style.top = '';
    }
    
    handleTap(e, touchStartPos) {
        const target = e.target.closest('.puzzle-piece');
        if (!target) return;
        
        console.log('移动端点击检测:', target);
        
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTime;
        
        if (timeSinceLastTap < 500) {
            // 连续点击
            tapCount++;
            console.log('连续点击次数:', tapCount);
            
            if (tapCount === 2) {
                // 双击 - 旋转
                console.log('双击检测 - 旋转拼图块');
                this.rotatePiece(target);
                tapCount = 0;
            } else if (tapCount === 3) {
                // 三击 - 翻转
                console.log('三击检测 - 翻转拼图块');
                this.flipPiece(target);
                tapCount = 0;
            }
        } else {
            // 单击
            console.log('单击检测');
            tapCount = 1;
        }
        
        lastTapTime = currentTime;
        
        // 重置计数
        setTimeout(() => {
            tapCount = 0;
        }, 500);
    }
    
    rotatePiece(element) {
        console.log('移动端旋转函数被调用:', element);
        
        // 直接调用游戏逻辑
        if (window.rotatePiece) {
            console.log('直接调用游戏旋转函数');
            window.rotatePiece(element);
        }
    }
    
    flipPiece(element) {
        console.log('移动端翻转函数被调用:', element);
        
        // 直接调用游戏逻辑
        if (window.flipPiece) {
            console.log('直接调用游戏翻转函数');
            window.flipPiece(element);
        }
    }
    
    triggerDropOnBoard(element, gridX, gridY) {
        console.log('移动端放置事件:', element, gridX, gridY);
        
        // 直接调用游戏逻辑
        if (window.dropOnBoard) {
            console.log('直接调用游戏放置函数');
            window.dropOnBoard(element, gridX, gridY);
        }
    }
    
    isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    initPiecesZoneScroll() {
        const piecesZone = document.querySelector('.pieces-zone');
        if (!piecesZone) {
            console.log('拼图块栏未找到，延迟初始化');
            setTimeout(() => this.initPiecesZoneScroll(), 1000);
            return;
        }
        
        console.log('初始化拼图块栏滚动');
        
        let startY = 0;
        let scrollTop = 0;
        let isScrolling = false;
        
        // 添加滚动按钮
        this.addScrollButtons(piecesZone);
        
        piecesZone.addEventListener('touchstart', (e) => {
            // 检查是否点击在拼图块上
            const piece = e.target.closest('.puzzle-piece');
            if (piece) {
                console.log('点击在拼图块上，不处理滚动');
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
}

// 自动初始化
const mobileSupport = new MobileSupport();
