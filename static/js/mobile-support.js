/**
 * 移动端支持 - 基础版本
 * 提供基本的移动端触摸支持，不干扰原有功能
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
        
        // 初始化拼图块栏左右按键
        this.initPiecesZoneNavigation();
        
        // 添加调试面板
        this.addDebugPanel();
    }
    
    initTouchSupport() {
        // 将触摸相关变量设为类属性
        this.touchStartPos = { x: 0, y: 0 };
        this.touchOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.draggedElement = null;
        this.dragStartTimer = null;
        this.tapCount = 0;
        this.lastTapTime = 0;
        this.dragThreshold = 10;
        this.touchFollower = null;
        
        // 等待拼图块创建完成后绑定事件
        this.waitForPiecesAndBindEvents();
    }
    
    waitForPiecesAndBindEvents() {
        const checkPieces = () => {
            const pieces = document.querySelectorAll('.puzzle-piece');
            if (pieces.length > 0) {
                console.log(`找到 ${pieces.length} 个拼图块，绑定触摸事件`);
                this.bindTouchEventsToPieces(pieces);
            } else {
                // 如果拼图块还没创建，继续等待
                setTimeout(checkPieces, 100);
            }
        };
        checkPieces();
    }
    
    bindTouchEventsToPieces(pieces) {
        pieces.forEach(piece => {
            // 移除可能存在的旧事件监听器
            piece.removeEventListener('touchstart', this.handleTouchStart);
            piece.removeEventListener('touchmove', this.handleTouchMove);
            piece.removeEventListener('touchend', this.handleTouchEnd);
            
            // 绑定新的事件监听器
            piece.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            piece.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            piece.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        });
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        const target = e.target.closest('.puzzle-piece');
        
        if (!target) return;
        
        console.log('移动端触摸开始:', target);
        
        // 阻止默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();
        
        // 设置拖拽元素
        this.draggedElement = target;
        
        this.touchStartPos.x = touch.clientX;
        this.touchStartPos.y = touch.clientY;
        
        // 记录与目标块的相对偏移
        const rect = target.getBoundingClientRect();
        this.touchOffset.x = touch.clientX - rect.left;
        this.touchOffset.y = touch.clientY - rect.top;

        // 设置拖拽开始定时器（长按触发拖拽）
        this.dragStartTimer = setTimeout(() => {
            if (!this.isDragging) {
                console.log('长按触发拖拽');
                this.startDragging(target, touch);
                this.isDragging = true;
            }
        }, 300); // 300ms后开始拖拽
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartPos.x;
        const deltaY = touch.clientY - this.touchStartPos.y;
        
        // 如果移动距离超过阈值，开始拖拽
        if (Math.abs(deltaX) > this.dragThreshold || Math.abs(deltaY) > this.dragThreshold) {
            if (this.dragStartTimer) {
                clearTimeout(this.dragStartTimer);
                this.dragStartTimer = null;
            }
            
            if (!this.isDragging && this.draggedElement) {
                console.log('移动距离触发拖拽');
                this.startDragging(this.draggedElement, touch);
                this.isDragging = true;
            }
        }
        
        // 如果正在拖拽，更新跟随影子位置
        if (this.isDragging && this.touchFollower) {
            e.preventDefault();
            e.stopPropagation();
            this.touchFollower.style.left = (touch.clientX - this.touchFollower.offsetX) + 'px';
            this.touchFollower.style.top = (touch.clientY - this.touchFollower.offsetY) + 'px';
            console.log('更新跟随影子位置:', this.touchFollower.style.left, this.touchFollower.style.top);
        }
    }
    
    handleTouchEnd(e) {
        if (this.dragStartTimer) {
            clearTimeout(this.dragStartTimer);
            this.dragStartTimer = null;
        }
        
        if (this.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null;
            console.log('停止拖拽');
            this.stopDragging(this.draggedElement, touch || e, this.touchFollower);
            this.isDragging = false;
            this.draggedElement = null;
            this.touchFollower = null;
        } else {
            // 处理点击事件
            this.handleTap(e);
        }
    }
    
    startDragging(target, touch) {
        console.log('开始拖拽:', target);
        console.log('触摸位置:', touch.clientX, touch.clientY);

        // 标记被拖拽元素
        this.draggedElement = target;
        target.classList.add('dragging');

        // 设置全局拖拽状态，供 script.js 使用
        window.draggedPiece = target;

        // 禁用棋盘上其他块的点击（对齐 web 端逻辑）
        try {
            const board = document.getElementById('puzzleBoard');
            if (board) {
                Array.from(board.querySelectorAll('.puzzle-piece')).forEach(piece => {
                    if (piece !== target) piece.style.pointerEvents = 'none';
                });
            }
        } catch (_) {}

        // 创建移动端的跟随影子，不直接移动原块
        const clone = target.cloneNode(true);
        clone.id = 'touch-follower';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '9999';
        clone.style.opacity = '0.8'; // 添加透明度，便于识别

        const rect = target.getBoundingClientRect();
        console.log('原块位置:', rect.left, rect.top, rect.width, rect.height);
        
        clone.offsetX = touch.clientX - rect.left;
        clone.offsetY = touch.clientY - rect.top;
        clone.style.left = (touch.clientX - clone.offsetX) + 'px';
        clone.style.top = (touch.clientY - clone.offsetY) + 'px';

        console.log('跟随影子位置:', clone.style.left, clone.style.top);
        console.log('跟随影子偏移:', clone.offsetX, clone.offsetY);

        document.body.appendChild(clone);
        this.touchFollower = clone;

        console.log('跟随影子已创建并添加到页面');

        // 隐藏原始元素，保持布局
        setTimeout(() => {
            target.style.visibility = 'hidden';
            console.log('原块已隐藏');
        }, 0);
    }
    
    stopDragging(element, touch, touchFollower) {
        if (!element) return;
        
        console.log('停止拖拽:', element);
        console.log('触摸位置:', touch ? touch.clientX : 'N/A', touch ? touch.clientY : 'N/A');
        
        element.classList.remove('dragging');

        // 还原可见性
        element.style.visibility = 'visible';
        console.log('原块可见性已恢复');

        // 恢复棋盘上其他块的点击
        try {
            const allPieces = document.querySelectorAll('.puzzle-piece');
            allPieces.forEach(p => (p.style.pointerEvents = 'auto'));
            console.log('其他拼图块点击已恢复');
        } catch (_) {}

        // 清除全局拖拽状态
        if (window.draggedPiece === element) {
            window.draggedPiece = null;
            console.log('全局拖拽状态已清除');
        }

        // 移除跟随影子
        if (touchFollower && touchFollower.parentNode) {
            touchFollower.parentNode.removeChild(touchFollower);
            console.log('跟随影子已移除');
        }
        
        // 触发放置事件
        if (touch) {
            console.log('触发放置事件');
            this.triggerDropOnBoard(element, touch);
        } else {
            console.log('没有触摸信息，无法触发放置事件');
        }
    }
    
    triggerDropOnBoard(element, touch) {
        console.log('触发放置事件:', element);
        console.log('触摸坐标:', touch.clientX, touch.clientY);
        
        // 检查是否在棋盘区域内
        const puzzleBoard = document.getElementById('puzzleBoard');
        if (!puzzleBoard) {
            console.log('棋盘未找到，拼图块回到候选区');
            return;
        }
        
        const boardRect = puzzleBoard.getBoundingClientRect();
        console.log('棋盘位置:', boardRect);
        
        // 检查触摸点是否在棋盘内
        const isInBoard = touch.clientX >= boardRect.left && 
                         touch.clientX <= boardRect.right && 
                         touch.clientY >= boardRect.top && 
                         touch.clientY <= boardRect.bottom;
        
        console.log('是否在棋盘内:', isInBoard);
        
        if (isInBoard) {
            // 创建模拟的鼠标事件
            const mockEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {},
                stopPropagation: () => {}
            };
            
            console.log('调用 dropOnBoard 函数');
            console.log('全局 draggedPiece:', window.draggedPiece);
            console.log('当前拖拽元素:', element);
            
            // 确保全局变量正确设置
            if (window.draggedPiece !== element) {
                console.log('修正全局 draggedPiece 变量');
                window.draggedPiece = element;
            }
            
            // 调用原有的放置函数
            if (window.dropOnBoard) {
                try {
                    console.log('开始调用 dropOnBoard 函数...');
                    console.log('模拟事件坐标:', mockEvent.clientX, mockEvent.clientY);
                    
                    // 保存调用前的状态
                    const beforeParent = element.parentNode;
                    const beforePosition = element.style.position;
                    const beforeLeft = element.style.left;
                    const beforeTop = element.style.top;
                    
                    console.log('调用前状态:', {
                        parent: beforeParent,
                        position: beforePosition,
                        left: beforeLeft,
                        top: beforeTop
                    });
                    
                    // 检查拼图块的基本信息
                    console.log('拼图块基本信息:', {
                        correctX: element.dataset.correctX,
                        correctY: element.dataset.correctY,
                        rotation: element.dataset.rotation,
                        flipped: element.dataset.flipped,
                        type: element.dataset.type
                    });
                    
                    // 检查棋盘信息
                    const boardInfo = document.getElementById('puzzleBoard');
                    console.log('棋盘信息:', {
                        width: boardInfo.offsetWidth,
                        height: boardInfo.offsetHeight,
                        difficulty: window.difficulty || 'undefined'
                    });
                    
                    console.log('=== 开始调用 dropOnBoard 函数 ===');
                    console.log('调用前 window.draggedPiece:', window.draggedPiece);
                    console.log('调用前 element:', element);
                    console.log('window.draggedPiece === element:', window.draggedPiece === element);
                    
                    // 检查关键变量
                    console.log('检查关键变量:');
                    console.log('- window.difficulty:', window.difficulty);
                    console.log('- puzzleBoard:', document.getElementById('puzzleBoard'));
                    console.log('- puzzleBoard.offsetWidth:', document.getElementById('puzzleBoard').offsetWidth);
                    console.log('- puzzleBoard.offsetHeight:', document.getElementById('puzzleBoard').offsetHeight);
                    
                    // 修复 difficulty 问题
                    console.log('检查 difficulty 变量:');
                    console.log('- 全局 difficulty:', typeof difficulty !== 'undefined' ? difficulty : 'undefined');
                    console.log('- window.difficulty:', window.difficulty);
                    
                    // 确保 difficulty 变量存在（dropOnBoard 函数内部使用的是 difficulty，不是 window.difficulty）
                    if (typeof difficulty === 'undefined') {
                        console.log('⚠️ 全局 difficulty 未定义，尝试从 window.difficulty 获取...');
                        if (window.difficulty) {
                            // 将 window.difficulty 赋值给全局 difficulty 变量
                            difficulty = window.difficulty;
                            console.log('✅ 已设置全局 difficulty =', difficulty);
                        } else {
                            console.log('⚠️ window.difficulty 也未找到，使用默认值 4');
                            difficulty = 4;
                            window.difficulty = 4;
                            console.log('✅ 已设置 difficulty =', difficulty);
                        }
                    } else {
                        console.log('✅ 全局 difficulty 已存在:', difficulty);
                        // 确保 window.difficulty 也同步
                        window.difficulty = difficulty;
                    }
                    
                    try {
                        console.log('准备调用 dropOnBoard 函数...');
                        console.log('调用参数:', {
                            clientX: mockEvent.clientX,
                            clientY: mockEvent.clientY,
                            draggedPiece: window.draggedPiece
                        });
                        
                        // 关键修复：确保全局 draggedPiece 变量被设置
                        console.log('设置全局 draggedPiece 变量...');
                        console.log('设置前 - 全局 draggedPiece:', typeof draggedPiece !== 'undefined' ? draggedPiece : 'undefined');
                        console.log('设置前 - window.draggedPiece:', window.draggedPiece);
                        
                        // 将 window.draggedPiece 赋值给全局 draggedPiece 变量
                        draggedPiece = window.draggedPiece;
                        
                        console.log('设置后 - 全局 draggedPiece:', draggedPiece);
                        console.log('设置后 - window.draggedPiece:', window.draggedPiece);
                        console.log('draggedPiece === window.draggedPiece:', draggedPiece === window.draggedPiece);
                        
                        window.dropOnBoard(mockEvent);
                        console.log('=== dropOnBoard 函数调用完成 ===');
                        
                        // 检查 console.group 是否影响了日志输出
                        console.log('检查 console.group 影响...');
                        console.group('测试分组');
                        console.log('这是测试分组内的日志');
                        console.groupEnd();
                        
                    } catch (error) {
                        console.error('dropOnBoard 函数调用出错:', error);
                    }
                    
                    console.log('调用后 window.draggedPiece:', window.draggedPiece);
                    
                    // 立即检查拼图块状态
                    console.log('立即检查拼图块状态...');
                    console.log('拼图块父节点:', element.parentNode);
                    console.log('拼图块位置样式:', element.style.position, element.style.left, element.style.top);
                    console.log('拼图块数据属性:', element.dataset.currentX, element.dataset.currentY);
                    
                    // 检查是否被移动到棋盘
                    const puzzleBoard = document.getElementById('puzzleBoard');
                    if (element.parentNode === puzzleBoard) {
                        console.log('✅ 拼图块已成功放置到棋盘');
                    } else {
                        console.log('❌ 拼图块未放置到棋盘，仍在:', element.parentNode);
                        console.log('父节点类型:', element.parentNode.nodeName);
                        console.log('父节点类名:', element.parentNode.className);
                        console.log('父节点ID:', element.parentNode.id);
                    }
                    
                    // 延迟检查拼图块状态
                    setTimeout(() => {
                        console.log('延迟检查拼图块状态...');
                        console.log('拼图块父节点:', element.parentNode);
                        console.log('拼图块位置样式:', element.style.position, element.style.left, element.style.top);
                        console.log('拼图块数据属性:', element.dataset.currentX, element.dataset.currentY);
                        
                        // 检查是否被移动到棋盘
                        if (element.parentNode === puzzleBoard) {
                            console.log('✅ 延迟检查：拼图块已成功放置到棋盘');
                        } else {
                            console.log('❌ 延迟检查：拼图块未放置到棋盘，仍在:', element.parentNode);
                            console.log('父节点类型:', element.parentNode.nodeName);
                            console.log('父节点类名:', element.parentNode.className);
                            console.log('父节点ID:', element.parentNode.id);
                        }
                        
                        // 检查棋盘上的所有拼图块
                        const piecesOnBoard = puzzleBoard.querySelectorAll('.puzzle-piece');
                        console.log('棋盘上的拼图块数量:', piecesOnBoard.length);
                        console.log('棋盘上的拼图块:', piecesOnBoard);
                        
                        // 检查当前拼图块是否在棋盘上
                        const isOnBoard = Array.from(piecesOnBoard).includes(element);
                        console.log('当前拼图块是否在棋盘上:', isOnBoard);
                    }, 100);
                } catch (error) {
                    console.error('dropOnBoard 函数调用出错:', error);
                }
            } else {
                console.log('dropOnBoard 函数未找到');
            }
        } else {
            console.log('触摸点不在棋盘内，拼图块回到候选区');
        }
    }
    
    handleTap(e) {
        const target = e.target.closest('.puzzle-piece');
        if (!target) return;
        
        const now = Date.now();
        const timeDiff = now - this.lastTapTime;
        
        if (timeDiff < 300) {
            this.tapCount++;
        } else {
            this.tapCount = 1;
        }
        
        this.lastTapTime = now;
        
        console.log(`触摸计数: ${this.tapCount}, 时间差: ${timeDiff}`);
        
        // 清除之前的定时器
        if (this.tapTimer) {
            clearTimeout(this.tapTimer);
        }
        
        // 设置新的定时器
        this.tapTimer = setTimeout(() => {
            console.log(`最终触摸计数: ${this.tapCount}`);
            if (this.tapCount === 1) {
                console.log('单击:', target);
                // 单击选中
                this.selectPiece(target);
            } else if (this.tapCount === 2) {
                console.log('双击:', target);
                // 双击旋转
                this.rotatePiece(target);
            } else if (this.tapCount === 3) {
                console.log('三击:', target);
                // 三击翻转
                this.flipPiece(target);
            }
            this.tapCount = 0;
        }, 300);
    }
    
    selectPiece(piece) {
        console.log('选中拼图块:', piece);
        // 可以添加选中效果
        piece.classList.add('selected');
        setTimeout(() => {
            piece.classList.remove('selected');
        }, 200);
    }
    
    rotatePiece(piece) {
        console.log('旋转拼图块:', piece);
        if (window.rotatePiece) {
            window.rotatePiece(piece);
        }
    }
    
    flipPiece(piece) {
        console.log('翻转拼图块:', piece);
        if (window.flipPiece) {
            window.flipPiece(piece);
        }
    }
    
    initPiecesZoneNavigation() {
        const piecesZone = document.querySelector('.pieces-zone');
        if (!piecesZone) {
            console.log('拼图块栏未找到');
            return;
        }
        
        console.log('设置拼图块栏为多行显示');
        console.log('拼图块栏当前样式:', piecesZone.style.cssText);
        console.log('拼图块栏内容:', piecesZone.innerHTML);
        console.log('拼图块栏尺寸:', {
            width: piecesZone.offsetWidth,
            height: piecesZone.offsetHeight,
            scrollWidth: piecesZone.scrollWidth,
            clientWidth: piecesZone.clientWidth
        });
        
        // 设置拼图块栏样式 - 多行显示
        piecesZone.style.touchAction = 'none';
        piecesZone.style.overflowX = 'visible';
        piecesZone.style.overflowY = 'visible';
        piecesZone.style.position = 'relative';
        piecesZone.style.display = 'flex';
        piecesZone.style.flexWrap = 'wrap'; // 允许换行
        piecesZone.style.alignItems = 'center';
        piecesZone.style.justifyContent = 'center'; // 居中对齐
        piecesZone.style.minHeight = '120px';
        piecesZone.style.padding = '10px';
        piecesZone.style.gap = '5px'; // 拼图块之间的间距
        
        console.log('拼图块栏已设置为多行显示');
    }
    
    // 删除导航按键相关代码，因为不再需要滚动
    
    addDebugPanel() {
        // 创建调试面板
        const debugPanel = document.createElement('div');
        debugPanel.id = 'mobile-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 250px;
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

// 添加全局测试函数
window.testPiecesZone = function() {
    console.log('测试拼图块栏多行显示...');
    
    const piecesZone = document.querySelector('.pieces-zone');
    console.log('拼图块栏:', piecesZone);
    
    if (piecesZone) {
        console.log('拼图块栏样式:', piecesZone.style.cssText);
        console.log('拼图块栏内容:', piecesZone.innerHTML);
        console.log('拼图块数量:', piecesZone.children.length);
        console.log('拼图块栏尺寸:', {
            width: piecesZone.offsetWidth,
            height: piecesZone.offsetHeight,
            scrollWidth: piecesZone.scrollWidth,
            clientWidth: piecesZone.clientWidth
        });
        
        // 重新设置样式
        mobileSupport.initPiecesZoneNavigation();
    }
    
    return piecesZone;
};

// 添加拖拽测试函数
window.testDrag = function() {
    console.log('测试拖拽功能...');
    
    const pieces = document.querySelectorAll('.puzzle-piece');
    console.log('找到拼图块数量:', pieces.length);
    
    if (pieces.length > 0) {
        const firstPiece = pieces[0];
        console.log('第一个拼图块:', firstPiece);
        console.log('拼图块样式:', firstPiece.style.cssText);
        console.log('拼图块位置:', firstPiece.getBoundingClientRect());
        
        // 测试创建跟随影子
        const clone = firstPiece.cloneNode(true);
        clone.id = 'test-follower';
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '9999';
        clone.style.opacity = '0.8';
        clone.style.left = '100px';
        clone.style.top = '100px';
        
        document.body.appendChild(clone);
        console.log('测试跟随影子已创建:', clone);
        
        // 3秒后移除测试影子
        setTimeout(() => {
            if (clone.parentNode) {
                clone.parentNode.removeChild(clone);
                console.log('测试跟随影子已移除');
            }
        }, 3000);
    }
    
    return pieces;
};
