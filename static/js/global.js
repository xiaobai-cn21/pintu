// 全局按钮点击音效处理
function setupButtonClickSounds() {
    // 等待音乐管理器加载完成
    function waitForMusicManager() {
        if (window.musicManager) {
            console.log('音乐管理器已加载，准备设置点击音效');
            
            // 添加全局按钮点击事件监听器
            document.addEventListener('click', function(e) {
                // 更全面的按钮检测逻辑
                const isButton = e.target.tagName === 'BUTTON' || 
                               e.target.closest('button') ||
                               e.target.classList.contains('btn') ||
                               e.target.closest('.btn') ||
                               e.target.classList.contains('pm-menu-item') ||
                               e.target.closest('.pm-menu-item') ||
                               e.target.classList.contains('pm-music-btn') ||
                               e.target.closest('.pm-music-btn');
                
                // 调试信息
                if (isButton) {
                    console.log('检测到按钮点击:', e.target);
                    console.log('音乐是否静音:', window.musicManager.isMuted);
                }
                
                // 播放点击音效，不考虑是否静音，这样用户可以听到效果
                if (isButton && window.musicManager) {
                    window.musicManager.playClickSound();
                }
            }, true); // 使用捕获阶段，确保能捕获到所有按钮点击
        } else {
            console.log('音乐管理器尚未加载，100ms后重试');
            // 如果音乐管理器尚未加载，稍后重试
            setTimeout(waitForMusicManager, 100);
        }
    }
    
    // 立即尝试设置，不等待页面加载完成
    waitForMusicManager();
}

// 导出函数（如果需要）
if (typeof module !== 'undefined') {
    module.exports = setupButtonClickSounds;
}

// 自动初始化
setupButtonClickSounds();