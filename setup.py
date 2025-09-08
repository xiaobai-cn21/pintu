#!/usr/bin/env python3
"""
项目初始化脚本
在新电脑上运行此脚本，自动安装依赖并下载字体
"""

import subprocess
import sys
import os

def run_command(command, description):
    """运行命令并显示结果"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} 完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 失败: {e}")
        print(f"错误输出: {e.stderr}")
        return False

def main():
    """主函数"""
    print("🚀 开始初始化拼图大师项目...")
    
    # 1. 安装 Python 依赖
    if not run_command("pip install -r requirements.txt", "安装 Python 依赖"):
        print("请确保已安装 Python 和 pip")
        return
    
    # 2. 下载字体文件
    if not run_command("python download_fonts.py", "下载字体文件"):
        print("字体下载失败，但不影响项目运行")
    
    print("\n🎉 项目初始化完成！")
    print("现在可以运行: python app.py")

if __name__ == '__main__':
    main()
