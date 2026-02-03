import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRMLoaderPlugin, VRM, VRMExpressionPresetName } from '@pixiv/three-vrm'
import type { OutputSize } from '../App'

// 解像度からアスペクト比を計算
const OUTPUT_SIZE_MAP: Record<OutputSize, { width: number; height: number }> = {
    '1920x1080': { width: 1920, height: 1080 },
    '1280x720': { width: 1280, height: 720 },
    '960x540': { width: 960, height: 540 },
    '640x360': { width: 640, height: 360 }
}

interface VRMViewerProps {
    vrmUrl: string
    cameraPreset: 'bust' | 'full' | 'face'
    isLipSyncEnabled: boolean
    selectedDeviceId: string
    backgroundImage?: string | null
    outputSize: OutputSize
}

// カメラプリセットの位置設定
const CAMERA_PRESETS = {
    bust: { position: [0, 1.3, 1.5], target: [0, 1.3, 0] },
    full: { position: [0, 1, 3], target: [0, 1, 0] },
    face: { position: [0, 1.5, 0.8], target: [0, 1.5, 0] }
}

function VRMModel({
    vrmUrl,
    isLipSyncEnabled,
    selectedDeviceId,
    onVrmLoad
}: {
    vrmUrl: string
    isLipSyncEnabled: boolean
    selectedDeviceId: string
    onVrmLoad?: (vrm: VRM) => void
}): JSX.Element | null {
    const [vrm, setVrm] = useState<VRM | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // VRM読み込み
    useEffect(() => {
        const loader = new GLTFLoader()
        loader.register((parser) => new VRMLoaderPlugin(parser))

        loader.load(
            vrmUrl,
            (gltf) => {
                const loadedVrm = gltf.userData.vrm as VRM
                if (loadedVrm) {
                    loadedVrm.scene.rotation.y = Math.PI
                    setVrm(loadedVrm)
                    onVrmLoad?.(loadedVrm)
                    console.log('VRM loaded:', loadedVrm)
                }
            },
            (progress) => {
                console.log('Loading VRM:', (progress.loaded / progress.total) * 100, '%')
            },
            (error) => {
                console.error('Error loading VRM:', error)
            }
        )

        return () => {
            if (vrm) {
                vrm.scene.traverse((obj) => {
                    if (obj instanceof THREE.Mesh) {
                        obj.geometry?.dispose()
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach((m) => m.dispose())
                        } else {
                            obj.material?.dispose()
                        }
                    }
                })
            }
        }
    }, [vrmUrl])

    // リップシンク用オーディオ設定（デバイス選択対応）
    useEffect(() => {
        if (!isLipSyncEnabled) {
            if (audioContextRef.current) {
                audioContextRef.current.close()
                audioContextRef.current = null
                analyserRef.current = null
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
                streamRef.current = null
            }
            return
        }

        const setupAudio = async (): Promise<void> => {
            try {
                // 既存のストリームを停止
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop())
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close()
                }

                const constraints: MediaStreamConstraints = {
                    audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
                }

                const stream = await navigator.mediaDevices.getUserMedia(constraints)
                const audioContext = new AudioContext()
                const source = audioContext.createMediaStreamSource(stream)
                const analyser = audioContext.createAnalyser()
                analyser.fftSize = 256

                source.connect(analyser)
                audioContextRef.current = audioContext
                analyserRef.current = analyser
                streamRef.current = stream
                console.log('Audio setup complete with device:', selectedDeviceId)
            } catch (error) {
                console.error('Audio setup failed:', error)
            }
        }

        setupAudio()

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [isLipSyncEnabled, selectedDeviceId])

    // 時間カウンター（アイドルアニメーション用）
    const timeRef = useRef(0)

    // アニメーションループ
    useFrame((_, delta) => {
        if (!vrm) return

        vrm.update(delta)
        timeRef.current += delta

        const time = timeRef.current

        // === 可愛いアイドルアニメーション ===

        // 1. 呼吸アニメーション（胸・肩が上下）
        const breathSpeed = 0.8
        const breathAmount = 0.003
        const breath = Math.sin(time * breathSpeed * Math.PI * 2) * breathAmount

        // 2. 体の揺れ（ゆるやかな左右）
        const swaySpeed = 0.3
        const swayAmount = 0.015
        const sway = Math.sin(time * swaySpeed * Math.PI * 2) * swayAmount

        // 3. 頭の動き（首をかしげる）
        const headTiltSpeed = 0.25
        const headTiltAmount = 0.03
        const headTilt = Math.sin(time * headTiltSpeed * Math.PI * 2) * headTiltAmount

        // VRMのボーンにアニメーションを適用
        const humanoid = vrm.humanoid
        if (humanoid) {
            // 胸のボーン（呼吸）
            const chest = humanoid.getNormalizedBoneNode('chest')
            if (chest) {
                chest.position.y += breath
            }

            // 上半身のボーン（揺れ）
            const spine = humanoid.getNormalizedBoneNode('spine')
            if (spine) {
                spine.rotation.z = sway
            }

            // 頭のボーン（首かしげ）
            const head = humanoid.getNormalizedBoneNode('head')
            if (head) {
                head.rotation.z = headTilt * 0.5
                // 少し上を見る動き
                head.rotation.x = Math.sin(time * 0.2 * Math.PI * 2) * 0.02
            }

            // 肩のボーン（呼吸に連動）
            const leftShoulder = humanoid.getNormalizedBoneNode('leftShoulder')
            const rightShoulder = humanoid.getNormalizedBoneNode('rightShoulder')
            if (leftShoulder) {
                leftShoulder.rotation.z = breath * 2
            }
            if (rightShoulder) {
                rightShoulder.rotation.z = -breath * 2
            }
        }

        // まばたき（ランダム、よりゆっくり）
        if (Math.random() < 0.002) {
            vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 1)
            setTimeout(() => {
                vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 0)
            }, 150)
        }

        // リップシンク
        if (isLipSyncEnabled && analyserRef.current && vrm.expressionManager) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
            analyserRef.current.getByteFrequencyData(dataArray)

            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
            const mouthOpen = Math.min(average / 128, 1)

            const lowFreq = dataArray.slice(0, 4).reduce((a, b) => a + b, 0) / 4
            const midFreq = dataArray.slice(4, 12).reduce((a, b) => a + b, 0) / 8
            const highFreq = dataArray.slice(12, 24).reduce((a, b) => a + b, 0) / 12

            // 一度口の表情をリセット
            vrm.expressionManager.setValue(VRMExpressionPresetName.Aa, 0)
            vrm.expressionManager.setValue(VRMExpressionPresetName.Ih, 0)
            vrm.expressionManager.setValue(VRMExpressionPresetName.Ou, 0)
            vrm.expressionManager.setValue(VRMExpressionPresetName.Ee, 0)
            vrm.expressionManager.setValue(VRMExpressionPresetName.Oh, 0)

            // 最も強い母音だけをセット（重複防止）
            const vowels = [
                { name: VRMExpressionPresetName.Aa, value: lowFreq > midFreq ? mouthOpen * 0.8 : 0 },
                { name: VRMExpressionPresetName.Ih, value: midFreq > lowFreq && midFreq > highFreq ? mouthOpen * 0.5 : 0 },
                { name: VRMExpressionPresetName.Ou, value: lowFreq > highFreq ? mouthOpen * 0.6 : 0 },
                { name: VRMExpressionPresetName.Ee, value: highFreq > lowFreq ? mouthOpen * 0.4 : 0 },
                { name: VRMExpressionPresetName.Oh, value: midFreq > highFreq ? mouthOpen * 0.5 : 0 }
            ]

            // 最も強い母音を見つけてセット
            const strongest = vowels.reduce((a, b) => a.value > b.value ? a : b)
            if (strongest.value > 0.1) {
                vrm.expressionManager.setValue(strongest.name, strongest.value)
            }

            // 手を振るアニメーション（喋っている時）
            if (humanoid && mouthOpen > 0.1) {
                const waveSpeed = 8
                const waveAmount = 0.3
                const wave = Math.sin(time * waveSpeed) * waveAmount

                // 右腕を上げて振る
                const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm')
                const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm')
                const rightHand = humanoid.getNormalizedBoneNode('rightHand')

                if (rightUpperArm) {
                    // 腕を上げる（Z軸で外側に、X軸で前に少し）
                    rightUpperArm.rotation.z = -1.2 + wave * 0.2
                    rightUpperArm.rotation.x = 0.3
                }
                if (rightLowerArm) {
                    // 肘を曲げる
                    rightLowerArm.rotation.y = -0.8
                }
                if (rightHand) {
                    // 手首を振る
                    rightHand.rotation.z = wave
                }
            }
        }
    })

    if (!vrm) return null

    return <primitive object={vrm.scene} />
}

function CameraController({ cameraPreset }: { cameraPreset: 'bust' | 'full' | 'face' }): null {
    const { camera } = useThree()

    useEffect(() => {
        const preset = CAMERA_PRESETS[cameraPreset]
        camera.position.set(...(preset.position as [number, number, number]))
        camera.lookAt(...(preset.target as [number, number, number]))
    }, [cameraPreset, camera])

    return null
}

function Background({ backgroundImage }: { backgroundImage?: string | null }): JSX.Element | null {
    const { scene } = useThree()

    useEffect(() => {
        if (backgroundImage) {
            const loader = new THREE.TextureLoader()
            loader.load(backgroundImage, (texture) => {
                scene.background = texture
            })
        } else {
            scene.background = new THREE.Color(0x1a1a2e)
        }

        return () => {
            scene.background = new THREE.Color(0x1a1a2e)
        }
    }, [backgroundImage, scene])

    return null
}

export function VRMViewer({
    vrmUrl,
    cameraPreset,
    isLipSyncEnabled,
    selectedDeviceId,
    backgroundImage,
    outputSize
}: VRMViewerProps): JSX.Element {
    const { width, height } = OUTPUT_SIZE_MAP[outputSize]
    const aspectRatio = width / height

    return (
        <div
            className="vrm-viewer"
            style={{ aspectRatio: `${width} / ${height}` }}
        >
            <Canvas
                camera={{
                    fov: 30,
                    near: 0.1,
                    far: 100,
                    position: CAMERA_PRESETS[cameraPreset].position as [number, number, number]
                }}
                gl={{ preserveDrawingBuffer: true }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight position={[1, 1, 1]} intensity={0.8} />
                <directionalLight position={[-1, 1, -1]} intensity={0.4} />

                <Background backgroundImage={backgroundImage} />
                <VRMModel
                    vrmUrl={vrmUrl}
                    isLipSyncEnabled={isLipSyncEnabled}
                    selectedDeviceId={selectedDeviceId}
                />
                <CameraController cameraPreset={cameraPreset} />
                <OrbitControls
                    target={CAMERA_PRESETS[cameraPreset].target as THREE.Vector3Tuple}
                    enablePan={true}
                    panSpeed={1.5}
                    screenSpacePanning={true}
                    mouseButtons={{
                        LEFT: THREE.MOUSE.ROTATE,
                        MIDDLE: THREE.MOUSE.PAN,
                        RIGHT: THREE.MOUSE.DOLLY
                    }}
                    keys={{
                        LEFT: 'ArrowLeft',
                        UP: 'ArrowUp',
                        RIGHT: 'ArrowRight',
                        BOTTOM: 'ArrowDown'
                    }}
                />
            </Canvas>
        </div>
    )
}
