#!/usr/bin/env python3
"""
リアライズ - 仮想カメラブリッジ
Electron から送られたフレームを OBS Virtual Camera に転送する
"""

import sys
import numpy as np
import pyvirtualcam

def main():
    width = 1280
    height = 720
    fps = 30
    
    if len(sys.argv) >= 3:
        width = int(sys.argv[1])
        height = int(sys.argv[2])
    if len(sys.argv) >= 4:
        fps = int(sys.argv[3])
    
    print(f"Starting virtual camera: {width}x{height}@{fps}fps", file=sys.stderr)
    
    try:
        # OBS Virtual Camera (Windows) はBGRフォーマットを使用
        with pyvirtualcam.Camera(width=width, height=height, fps=fps, fmt=pyvirtualcam.PixelFormat.BGR) as cam:
            print(f"Virtual camera started: {cam.device}", file=sys.stderr)
            print("READY", flush=True)  # Electronに準備完了を通知
            
            frame_size = width * height * 4  # RGBA (入力)
            
            while True:
                try:
                    # stdinからRGBAフレームデータを読み取る
                    data = sys.stdin.buffer.read(frame_size)
                    
                    if len(data) == 0:
                        print("Input stream closed", file=sys.stderr)
                        break
                    
                    if len(data) != frame_size:
                        print(f"Invalid frame size: {len(data)} != {frame_size}", file=sys.stderr)
                        continue
                    
                    # RGBAからBGRに変換 (R,G,B,A) -> (B,G,R)
                    rgba_frame = np.frombuffer(data, dtype=np.uint8).reshape((height, width, 4))
                    bgr_frame = rgba_frame[:, :, [2, 1, 0]]  # Swap R and B, drop A
                    cam.send(bgr_frame)
                    cam.sleep_until_next_frame()
                    
                except KeyboardInterrupt:
                    print("Interrupted", file=sys.stderr)
                    break
                except Exception as e:
                    print(f"Error: {e}", file=sys.stderr)
                    continue
                    
    except Exception as e:
        print(f"Failed to start virtual camera: {e}", file=sys.stderr)
        print("ERROR", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
