import type { Translations } from './ja'

export const ko: Translations = {
    header: {
        loc: '코드줄',
        reload: '새로고침',
        window: '창',
        preview: '미리보기',
        output: '출력'
    },
    vrmModel: {
        title: '👤 VRM 모델',
        replace: '🔄 교체'
    },
    camera: {
        title: '📷 카메라 위치',
        bust: '상체',
        full: '전신',
        face: '얼굴',
        save: '💾 저장',
        reset: '🔄 초기화'
    },
    lipSync: {
        title: '🎤 립싱크',
        on: 'ON',
        off: 'OFF'
    },
    autoExpression: {
        title: '🎭 자동 표정',
        on: 'ON',
        off: 'OFF',
        interval: '간격'
    },
    background: {
        title: '🖼️ 배경',
        image: '이미지',
        video: '동영상',
        greenScreen: 'GB'
    },
    animation: {
        title: '💃 애니메이션',
        file: '.vrma'
    },
    outputMic: {
        title: '📐 출력 / 🎙️ 마이크'
    },
    colorAdjustment: {
        title: '🎨 색상 보정',
        brightness: '밝기',
        contrast: '대비',
        saturation: '채도',
        reset: '초기화'
    },
    virtualCamera: {
        title: '🎥 가상 카메라',
        start: '🎥 가상 카메라 시작',
        stop: '🎥 가상 카메라 중지',
        connecting: '연결 중...'
    },
    expressions: {
        neutral: '기본',
        happy: '기쁨',
        angry: '화남',
        sad: '슬픔',
        relaxed: '편안',
        surprised: '놀람'
    },
    alerts: {
        cameraSaved: (preset) => `${preset} 카메라 위치가 저장되었습니다!`,
        virtualCameraError: '가상 카메라 시작에 실패했습니다. OBS를 실행하여 "가상 카메라 시작" → "가상 카메라 중지"를 한 번 실행해주세요.',
        virtualCameraFailed: '가상 카메라 시작에 실패했습니다.'
    },
    dropZone: {
        title: 'VRM 파일을 드롭',
        description: '또는 클릭하여 선택'
    }
}
