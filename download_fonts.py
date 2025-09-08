#!/usr/bin/env python3
"""
字体下载脚本
自动下载像素字体文件到本地，确保项目在任何电脑上都能正常显示像素风格
"""

import os
import requests
from pathlib import Path

def download_font(url, filename):
    """下载字体文件"""
    try:
        print(f"正在下载 {filename}...")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # 确保目录存在
        os.makedirs('static/fonts', exist_ok=True)
        
        # 写入文件
        with open(f'static/fonts/{filename}', 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ {filename} 下载完成")
        return True
    except Exception as e:
        print(f"❌ {filename} 下载失败: {e}")
        return False

def main():
    """主函数"""
    print("🎮 开始下载像素字体...")
    
    # 字体文件列表
    fonts = [
        {
            'url': 'https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2',
            'filename': 'PressStart2P-Regular.woff2'
        },
        {
            'url': 'https://github.com/SolidZORO/zpix-pixel-font/releases/download/v1.0/Zpix.ttf',
            'filename': 'Zpix-Regular.ttf'
        }
    ]
    
    success_count = 0
    for font in fonts:
        if download_font(font['url'], font['filename']):
            success_count += 1
    
    print(f"\n🎉 字体下载完成！成功下载 {success_count}/{len(fonts)} 个字体文件")
    print("现在可以在任何电脑上运行项目，字体都会正常显示！")

if __name__ == '__main__':
    main()
