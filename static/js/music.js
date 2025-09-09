// 音乐管理器 - 为不同功能页面提供背景音乐

class MusicManager {
    constructor() {
        // 创建不同场景的音频对象
        this.audioMap = {
            main: null,      // 主界面音乐
            game: null,      // 游戏界面音乐
            ai: null,        // AI生成界面音乐
            versus: null     // 对战界面音乐
        };
        
        // 创建点击音效音频对象
        this.clickSound = null;
        
        // 当前播放的音频
        this.currentAudio = null;
        
        // 是否静音
        this.isMuted = localStorage.getItem('musicMuted') === 'true';
        
        // 初始化音频
        this.initAudio();
    }
    
    // 初始化音频文件
    initAudio() {
        // 创建不同场景的音频对象
        this.audioMap.main = new Audio('/static/audio/main_theme.mp3');
        this.audioMap.game = new Audio('/static/audio/game_theme.mp3');
        this.audioMap.ai = new Audio('/static/audio/ai_theme.mp3');
        this.audioMap.versus = new Audio('/static/audio/versus_theme.mp3');
        
        // 创建点击音效
        this.clickSound = new Audio('/static/audio/click_sound.mp3');
        this.clickSound.volume = 0.5; // 点击音效音量
        
        // 音频加载失败时的处理
        this.clickSound.addEventListener('error', (e) => {
            console.warn(`点击音效加载失败: ${e.target.src}，请确保已添加对应的音频文件`);
        });
        
        // 设置所有音频循环播放
        Object.values(this.audioMap).forEach(audio => {
            audio.loop = true;
            audio.volume = 0.3; // 默认音量
            
            // 音频加载失败时的处理
            audio.addEventListener('error', (e) => {
                console.warn(`音频文件加载失败: ${e.target.src}，请确保已添加对应的音频文件`);
            });
        });
        
        // 应用静音设置
        this.updateMuteState();
    }
    
    // 播放指定场景的音乐
    playScene(scene) {
        // 停止当前播放的音乐
        if (this.currentAudio && this.currentAudio !== this.audioMap[scene]) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        // 开始播放新场景的音乐
        this.currentAudio = this.audioMap[scene];
        if (this.currentAudio && !this.isMuted) {
            // 尝试直接播放音频，无需等待用户交互
            this.attemptAutoPlay();
        }
    }
    
    // 尝试自动播放音频
    attemptAutoPlay() {
        if (!this.currentAudio || this.isMuted) return;
        
        // 尝试直接播放
        const playPromise = this.currentAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('音频自动播放成功');
            }).catch(err => {
                console.warn('音频自动播放失败，尝试备用方案:', err);
                // 备用方案：使用Web Audio API进行播放
                this.tryWebAudioPlayback();
            });
        }
    }
    
    // 尝试使用Web Audio API播放
    tryWebAudioPlayback() {
        try {
            // 创建Web Audio上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(this.currentAudio);
            source.connect(audioContext.destination);
            
            // 尝试恢复音频上下文并播放
            audioContext.resume().then(() => {
                this.currentAudio.play().catch(err => {
                    console.warn('Web Audio API播放也失败:', err);
                    // 记录需要用户交互才能播放的状态
                    this.requiresUserInteraction = true;
                });
            });
        } catch (e) {
            console.error('创建Web Audio上下文失败:', e);
            this.requiresUserInteraction = true;
        }
    }
    
    // 暂停当前音乐
    pauseCurrent() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
    }
    
    // 切换静音状态
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('musicMuted', this.isMuted);
        this.updateMuteState();
        return this.isMuted;
    }
    
    // 更新静音状态
    updateMuteState() {
        Object.values(this.audioMap).forEach(audio => {
            audio.muted = this.isMuted;
        });
        
        // 如果当前有音频且未静音，则继续播放
        if (this.currentAudio && !this.isMuted) {
            this.currentAudio.play().catch(err => {
                console.warn('音频播放失败:', err);
            });
        }
    }
    
    // 设置音量
    setVolume(volume) {
        // 确保音量在0-1之间
        volume = Math.max(0, Math.min(1, volume));
        Object.values(this.audioMap).forEach(audio => {
            audio.volume = volume;
        });
    }
    
    // 播放点击音效
    playClickSound() {
        if (this.isMuted || !this.clickSound) return;
        
        // 重置音频并播放
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(err => {
            console.warn('点击音效播放失败:', err);
        });
    }
}

// 创建全局音乐管理器实例
window.musicManager = new MusicManager();

// 导出MusicManager类（如果需要）
if (typeof module !== 'undefined') {
    module.exports = MusicManager;
}