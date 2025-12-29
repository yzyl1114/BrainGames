// assets/games/chess/scripts/AudioManager.ts

import { _decorator, Component, AudioSource, AudioClip, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static instance: AudioManager = null;
    
    @property(AudioClip)
    public bgmClip: AudioClip = null; // 背景音乐
    
    @property(AudioClip)
    public moveSuccessClip: AudioClip = null; // 移动成功音效
    
    @property(AudioClip)
    public moveFailClip: AudioClip = null; // 移动失败音效
    
    @property(AudioClip)
    public buttonClickClip: AudioClip = null; // 按钮点击音效
    
    private audioSource: AudioSource = null;
    private isMuted: boolean = false;
    
    public static getInstance(): AudioManager {
        return AudioManager.instance;
    }
    
    protected onLoad() {
        if (AudioManager.instance && AudioManager.instance !== this) {
            this.destroy();
            return;
        }
        AudioManager.instance = this;
        
        // 创建AudioSource组件
        this.audioSource = this.getComponent(AudioSource) || this.addComponent(AudioSource);
        
        // 从本地存储读取静音状态
        this.loadMuteState();
        
        // 播放背景音乐
        this.playBGM();
    }
    
    /**
     * 播放背景音乐
     */
    private playBGM() {
        if (this.bgmClip && !this.isMuted) {
            this.audioSource.clip = this.bgmClip;
            this.audioSource.loop = true;
            this.audioSource.play();
        }
    }
    
    /**
     * 播放音效
     */
    public playSound(clip: AudioClip, volume: number = 1.0) {
        if (!this.isMuted && clip) {
            this.audioSource.playOneShot(clip, volume);
        }
    }
    
    /**
     * 播放移动成功音效
     */
    public playMoveSuccess() {
        this.playSound(this.moveSuccessClip);
    }
    
    /**
     * 播放移动失败音效
     */
    public playMoveFail() {
        this.playSound(this.moveFailClip);
    }
    
    /**
     * 播放按钮点击音效
     */
    public playButtonClick() {
        this.playSound(this.buttonClickClip, 0.5); // 按钮音效音量减半
    }
    
    /**
     * 切换静音状态
     */
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            // 静音：停止背景音乐
            this.audioSource.stop();
        } else {
            // 取消静音：重新播放背景音乐
            this.playBGM();
        }
        
        // 保存到本地存储
        this.saveMuteState();
        
        return this.isMuted;
    }
    
    /**
     * 获取当前静音状态
     */
    public isMutedState(): boolean {
        return this.isMuted;
    }
    
    /**
     * 保存静音状态到本地存储
     */
    private saveMuteState() {
        try {
            localStorage.setItem('diamond_chess_muted', this.isMuted.toString());
        } catch (e) {
            console.warn('Failed to save mute state:', e);
        }
    }
    
    /**
     * 从本地存储加载静音状态
    private loadMuteState() {
        try {
            const saved = localStorage.getItem('diamond_chess_muted');
            if (saved !== null) {
                this.isMuted = saved === 'true';
            } else {
                this.isMuted = false; // 默认不静音
            }
        } catch (e) {
            console.warn('Failed to load mute state:', e);
            this.isMuted = false;
        }
    }
    */

    private loadMuteState() {
        // 改为每次默认开启声音
        this.isMuted = false; // 忽略本地存储
    }
}