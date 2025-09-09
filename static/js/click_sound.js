// 简单直接的按钮点击音效实现
(function() {
    // 预加载点击音效
    let clickAudio = null;
    let isInitialized = false;
    
    // 初始化函数
    function initClickSound() {
        if (isInitialized) return;
        
        try {
            // 创建音频对象
            clickAudio = new Audio('/static/audio/click_sound.mp3');
            clickAudio.volume = 0.5; // 设置音量
            
            // 音频加载完成事件
            clickAudio.addEventListener('canplaythrough', function() {
                console.log('点击音效加载完成');
            });
            
            // 音频加载失败事件
            clickAudio.addEventListener('error', function(e) {
                console.error('点击音效加载失败:', e);
                console.error('请检查音频文件路径是否正确:', '/static/audio/click_sound.mp3');
            });
            
            isInitialized = true;
        } catch (error) {
            console.error('创建点击音效音频对象失败:', error);
        }
    }
    
    // 播放点击音效的函数
    function playClickSound() {
        if (!clickAudio) {
            console.warn('点击音效未初始化');
            return;
        }
        
        try {
            // 克隆音频对象以支持快速连续点击
            const soundClone = clickAudio.cloneNode();
            soundClone.volume = 0.5;
            
            // 播放音效
            const playPromise = soundClone.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('点击音效播放成功');
                }).catch(err => {
                    console.warn('点击音效播放失败:', err);
                    // 尝试使用另一种方式播放
                    fallbackPlay();
                });
            }
        } catch (error) {
            console.error('播放点击音效时出错:', error);
            fallbackPlay();
        }
    }
    
    // 备用播放方法
    function fallbackPlay() {
        try {
            // 简单地重置并播放原音频
            clickAudio.currentTime = 0;
            clickAudio.play().catch(err => {
                console.warn('备用播放方法也失败:', err);
            });
        } catch (e) {
            console.error('备用播放方法出错:', e);
        }
    }
    
    // 添加全局点击事件监听器
    function setupGlobalClickListener() {
        document.addEventListener('click', function(e) {
            // 检测各种类型的按钮，确保覆盖游戏中的所有交互元素
            const isButton = 
                // 标准按钮元素
                e.target.tagName === 'BUTTON' ||
                e.target.closest('button') ||
                // 带有btn类的按钮
                e.target.classList.contains('btn') ||
                e.target.closest('.btn') ||
                e.target.classList.contains('btn-primary') ||
                e.target.closest('.btn-primary') ||
                e.target.classList.contains('btn-secondary') ||
                e.target.closest('.btn-secondary') ||
                e.target.classList.contains('btn-default') ||
                e.target.closest('.btn-default') ||
                // 导航相关按钮
                e.target.classList.contains('pm-menu-item') ||
                e.target.closest('.pm-menu-item') ||
                e.target.classList.contains('pm-music-btn') ||
                e.target.closest('.pm-music-btn') ||
                e.target.classList.contains('pm-brand') ||
                e.target.closest('.pm-brand') ||
                e.target.classList.contains('pm-link') ||
                e.target.closest('.pm-link') ||
                // 游戏筛选相关按钮
                e.target.classList.contains('filter-label') ||
                e.target.closest('.filter-label') ||
                e.target.classList.contains('filter-section-label') ||
                e.target.closest('.filter-section-label') ||
                // 关卡卡片（可点击的关卡选择）
                e.target.classList.contains('level-card') ||
                e.target.closest('.level-card') ||
                // 游戏控制按钮
                e.target.id === 'toggleBgBtn' ||
                e.target.id === 'undoBtn' ||
                e.target.id === 'restartBtn' ||
                e.target.id === 'playAgainBtn' ||
                e.target.id === 'backToMenuBtn' ||
                // 返回按钮
                e.target.classList.contains('back-btn') ||
                e.target.closest('.back-btn') ||
                e.target.textContent.includes('返回') && (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A' || e.target.closest('a')) ||
                e.target.textContent.includes('返回主界面') && (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A' || e.target.closest('a')) ||
                e.target.textContent.includes('返回首页') && (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A' || e.target.closest('a')) ||
                // 模态框按钮
                e.target.classList.contains('modal-close') ||
                e.target.closest('.modal-close') ||
                e.target.classList.contains('tab-item') ||
                e.target.closest('.tab-item') ||
                // 编辑按钮
                e.target.textContent.includes('编辑') && e.target.closest('button') ||
                // 帮助链接和按钮
                e.target.id === 'pm-help-link' ||
                e.target.closest('#pm-help-link') ||
                e.target.id === 'helpBtn' ||
                e.target.closest('#helpBtn') ||
                // 首页特定按钮
                e.target.id === 'loginBtn' ||
                e.target.closest('#loginBtn') ||
                e.target.id === 'createPuzzleBtn' ||
                e.target.closest('#createPuzzleBtn') ||
                e.target.id === 'rankBtn' ||
                e.target.closest('#rankBtn') ||
                e.target.id === 'versusBtn' ||
                e.target.closest('#versusBtn') ||
                e.target.id === 'myPuzzleBtn' ||
                e.target.closest('#myPuzzleBtn') ||
                e.target.id === 'shareBtn' ||
                e.target.closest('#shareBtn') ||
                e.target.id === 'aiBtnHome' ||
                e.target.closest('#aiBtnHome') ||
                // 表单提交按钮
                e.target.id === 'submitLogin' ||
                e.target.closest('#submitLogin') ||
                e.target.id === 'submitRegister' ||
                e.target.closest('#submitRegister') ||
                // 包含特定文本的按钮
                (e.target.textContent.includes('开始游戏') || 
                 e.target.textContent.includes('创建拼图') || 
                 e.target.textContent.includes('排行榜') || 
                 e.target.textContent.includes('房间对战') || 
                 e.target.textContent.includes('我的拼图') || 
                 e.target.textContent.includes('分享中心') || 
                 e.target.textContent.includes('AI生成') || 
                 e.target.textContent.includes('我知道了') || 
                 e.target.textContent.includes('取消') || 
                 e.target.textContent.includes('登录') || 
                 e.target.textContent.includes('注册') ||
                 e.target.textContent.includes('首页')) && 
                (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A' || e.target.closest('a'));
            
            if (isButton) {
                console.log('检测到按钮点击:', e.target);
                
                // 检测是否为页面间切换的按钮（a标签或表单提交按钮）
                const isNavigationButton = 
                    (e.target.tagName === 'A' || e.target.closest('a')) && 
                    (e.target.href || (e.target.closest('a') && e.target.closest('a').href)) ||
                    (e.target.tagName === 'INPUT' && e.target.type === 'submit') ||
                    (e.target.tagName === 'BUTTON' && e.target.form && e.target.form.method === 'post') ||
                    (e.target.closest('button') && e.target.closest('button').form && e.target.closest('button').form.method === 'post');
                
                // 如果是页面间切换的按钮，阻止默认行为，先播放音效，然后再执行跳转
                if (isNavigationButton) {
                    e.preventDefault();
                    
                    const targetElement = e.target.closest('a') || e.target.closest('button') || e.target;
                    
                    // 播放音效
                    playClickSound();
                    
                    // 延迟一小段时间后执行页面跳转或表单提交
                    setTimeout(() => {
                        if (targetElement.tagName === 'A' || targetElement.closest('a')) {
                            const anchor = targetElement.tagName === 'A' ? targetElement : targetElement.closest('a');
                            window.location.href = anchor.href;
                        } else if (targetElement.form) {
                            targetElement.form.submit();
                        }
                    }, 100); // 100毫秒的延迟，确保音效有足够时间播放
                } else {
                    // 普通按钮直接播放音效
                    playClickSound();
                }
            }
        }, true); // 使用捕获阶段
    }
    
    // 当页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initClickSound();
            setupGlobalClickListener();
        });
    } else {
        initClickSound();
        setupGlobalClickListener();
    }
    
    // 导出函数以便在其他地方调用（如果需要）
    window.playClickSound = playClickSound;
})();