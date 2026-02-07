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
        file: '.vrma',
        fullbody: '전신',
        greeting: '인사',
        vsign: 'V사인',
        shoot: '쏘기',
        spin: '회전',
        pose: '포즈',
        squat: '스쿼트'
    },
    outputMic: {
        title: '📐 출력 / 🎙️ 마이크',
        noMic: '마이크 없음'
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
        connecting: '연결 중...',
        preview: '📹 출력 확인',
        previewCheck: '👁️ 미리보기',
        previewClose: '클릭하여 닫기',
        previewNotFound: '가상 카메라를 찾을 수 없습니다'
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
    tooltips: {
        hideVrm: 'VRM 모델 숨기기',
        clearBackground: '배경 지우기',
        stopAnimation: '애니메이션 중지',
        virtualCameraHelp: '가상 카메라를 사용하여 방송 소프트웨어에 영상 전송'
    },
    dropZone: {
        title: 'VRM 파일을 드롭',
        description: '또는 클릭하여 선택',
        lastVrm: '📂 이전 VRM',
        invalidFile: 'VRM 파일을 드롭해주세요'
    }
}
