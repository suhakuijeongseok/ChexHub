<p align="center"><img src="public/chexhub-logo.png" width="180" alt="ChexHub" /></p>

# ChexHub

여러 Chrome 프로필의 확장 프로그램 설치 상태를 한 화면에서 비교하고, 누락된 프로필의 Chrome Web Store 설치 페이지를 여는 Windows 데스크톱 앱입니다.

설치된 항목은 선택한 프로필의 Chrome Web Store 상세 페이지를 열어 `Chrome에서 삭제`로 공식 제거 절차를 진행할 수 있습니다.

공유 세트에서는 자주 쓰는 확장 프로그램 묶음을 생성·수정·삭제하고, 선택한 여러 프로필에 누락된 확장만 적용할 수 있습니다. 세트 데이터는 ChexHub의 로컬 앱 데이터 폴더에 저장됩니다.

`확장 찾기`에서는 공식 Chrome Web Store를 ChexHub 내부에서 검색하고 탐색할 수 있습니다. 상세 페이지를 선택한 뒤 대상 프로필을 지정하면 각 프로필의 공식 설치 페이지가 열리며, 최종 권한 승인은 Chrome에서 진행합니다.

## 실행

```powershell
npm install
npm run dev
```

프로덕션 UI를 빌드해 실행하려면:

```powershell
npm start
```

## Windows 배포

로컬에서 Windows 설치 파일을 만들려면 다음 명령을 실행합니다.

```powershell
npm ci
npm run dist:win
```

설치 파일은 `release/ChexHub-Setup-<버전>.exe`에 생성됩니다.

GitHub Release는 `v`로 시작하는 태그를 푸시하면 자동으로 생성됩니다.

```powershell
git tag v0.1.0
git push origin v0.1.0
```

공개 배포에서 Windows의 게시자 경고를 제거하려면 별도의 코드 서명 인증서가 필요합니다.

## 안전 원칙

- Chrome 프로필 파일은 읽기만 합니다.
- `Preferences`나 확장 폴더를 직접 수정하거나 복사하지 않습니다.
- 확장 프로그램 설치는 공식 Chrome Web Store에서 사용자가 직접 승인합니다.
