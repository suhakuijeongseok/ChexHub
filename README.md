<p align="center"><img src="public/chexhub-logo.png" width="180" alt="ChexHub" /></p>

# ChexHub

여러 Chrome 프로필의 확장 프로그램 설치 상태를 한 화면에서 비교하고, 누락된 프로필의 Chrome Web Store 설치 페이지를 여는 Windows 데스크톱 앱입니다.

설치된 항목은 선택한 프로필의 Chrome Web Store 상세 페이지를 열어 `Chrome에서 삭제`로 공식 제거 절차를 진행할 수 있습니다.

공유 세트에서는 자주 쓰는 확장 프로그램 묶음을 생성·수정·삭제하고, 선택한 여러 프로필에 누락된 확장만 적용할 수 있습니다. 세트 데이터는 ChexHub의 로컬 앱 데이터 폴더에 저장됩니다.

## ChexHub Companion

`companion/`에는 현재 Chrome 프로필 안에서 동작하는 Manifest V3 사이드 패널 확장이 포함되어 있습니다. 이 확장을 각 프로필에 한 번 로드하면 Chrome 안에서 해당 프로필의 확장 목록을 확인하고 설정, Web Store, 삭제 화면을 열 수 있습니다.

1. 대상 Chrome 프로필에서 `chrome://extensions`를 엽니다.
2. 오른쪽 위의 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 선택합니다.
4. `C:\Users\user\hackathon\ChexHub\companion` 폴더를 선택합니다.
5. 툴바에서 ChexHub Companion을 누르면 사이드 패널이 열립니다.

Companion의 삭제 기능은 Chrome 자체 확인 대화상자를 사용합니다. 다른 확장의 격리된 `chrome.storage` 값은 읽거나 변경하지 않습니다.

## 실행

```powershell
npm install
npm run dev
```

프로덕션 UI를 빌드해 실행하려면:

```powershell
npm start
```

## 안전 원칙

- Chrome 프로필 파일은 읽기만 합니다.
- `Preferences`나 확장 폴더를 직접 수정하거나 복사하지 않습니다.
- 확장 프로그램 설치는 공식 Chrome Web Store에서 사용자가 직접 승인합니다.
