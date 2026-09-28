# Netlify setup

1. GitHub 저장소를 Netlify에 연결합니다.
2. Base directory: `frontend`
3. Build command: 비워둠
4. Publish directory: `.`
5. 실제 AWS API를 연결할 경우 환경변수/런타임 설정에서 API base URL을 주입하도록 프런트 API adapter를 확장합니다.

현재 대회 데모는 브라우저에서 완전 동작하는 deterministic demo mode를 기본으로 합니다.
