<p align="center"><img src="public/chexhub-logo.png" width="180" alt="ChexHub" /></p>

# ChexHub

여러 Chrome 프로필의 확장 프로그램 설치 상태를 한 화면에서 비교하고, 누락된 프로필의 Chrome Web Store 설치 페이지를 여는 Windows 데스크톱 앱입니다.

설치된 항목은 선택한 프로필의 Chrome Web Store 상세 페이지를 열어 `Chrome에서 삭제`로 공식 제거 절차를 진행할 수 있습니다.

공유 세트에서는 자주 쓰는 확장 프로그램 묶음을 생성·수정·삭제하고, 선택한 여러 프로필에 누락된 확장만 적용할 수 있습니다. 세트 데이터는 ChexHub의 로컬 앱 데이터 폴더에 저장됩니다.

`확장 찾기`에서는 공식 Chrome Web Store를 ChexHub 내부에서 검색하고 탐색할 수 있습니다. 상세 페이지를 선택한 뒤 대상 프로필을 지정하면 각 프로필의 공식 설치 페이지가 열리며, 최종 권한 승인은 Chrome에서 진행합니다.

## Windows에 설치하기

ChexHub를 사용하기 위해 Node.js나 Git을 설치할 필요는 없습니다.

1. [최신 Releases 페이지](https://github.com/suhakuijeongseok/ChexHub/releases/latest)를 엽니다.
2. **Assets**에서 `ChexHub-Setup-<버전>.exe`를 다운로드합니다.
3. 다운로드한 `.exe` 파일을 실행합니다.
4. 설치 위치를 선택하고 설치를 완료합니다.
5. 시작 메뉴 또는 바탕 화면에서 ChexHub를 실행합니다.

> `Source code (zip)`과 `Source code (tar.gz)`는 개발용 소스 코드이며 Windows 설치 파일이 아닙니다. 반드시 이름이 `ChexHub-Setup-`으로 시작하는 `.exe` 파일을 받으세요.

현재 설치 파일은 코드 서명되지 않았습니다. Windows SmartScreen 경고가 표시되면 출처가 이 공식 저장소인지 확인한 뒤 **추가 정보 → 실행**을 선택할 수 있습니다.

### 사용 조건

- Windows 10 또는 Windows 11
- Google Chrome 설치
- 표준 Chrome 사용자 데이터 폴더를 사용하는 프로필

## 개발 환경에서 실행

```powershell
npm install
npm run dev
```

프로덕션 UI를 빌드해 실행하려면:

```powershell
npm start
```

## 개발자용 Windows 배포

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
