// ✅ 사용자 정보
let USER_ID = "";
let USER_PW = "";
let USER_TOKEN = localStorage.getItem("USER_TOKEN") || "";  // 로그인 토큰 유지
let ROOM_ID = 102;
let stopFlag = false;
let myReservationId = null;  // 예약된 좌석 ID 저장
let seatNumber = null;

async function login() {
    USER_ID = document.getElementById("userId").value;
    USER_PW = document.getElementById("userPw").value;

    if (!USER_ID || !USER_PW) {
        document.getElementById("status").innerText = "❌ 아이디와 비밀번호를 입력하세요!";
        return;
    }

    try {
        // ✅ Render에 배포된 프록시 서버 주소 사용!
        let response = await fetch("https://login-proxy-server.onrender.com/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8" },
            body: JSON.stringify({
                loginId: USER_ID,
                password: USER_PW
            })
        });

        let loginData = await response.json();

        if (loginData.success) {
            USER_TOKEN = loginData.data.accessToken;
            localStorage.setItem("USER_TOKEN", USER_TOKEN);

            document.getElementById("status").innerText = "✅ 로그인 성공! 페이지 이동 중...";
            setTimeout(() => {
                window.location.href = "main.html";
            }, 1000);
        } else {
            document.getElementById("status").innerText = "❌ 로그인 실패!";
        }
    } catch (error) {
        document.getElementById("status").innerText = "❌ 로그인 오류 발생!";
        console.error("로그인 오류:", error);
    }
}
//

function logout() {
    localStorage.removeItem("USER_ID");
    localStorage.removeItem("USER_PW");
    window.location.href = "index.html"; // 로그아웃 후 로그인 페이지로 이동
}



function goToMyInfo() {
    window.location.href = "myinfo.html";
}

// 
function goBack() {
    window.location.href = "main.html";
}

// 
async function getUserInfo() {
    USER_TOKEN = localStorage.getItem("USER_TOKEN");

    if (!USER_TOKEN) {
        document.getElementById("userSeat").innerText = "-";
        document.getElementById("remainingTime").innerText = "-";
        document.getElementById("renewTime").innerText = "-";
        return;
    }

    try {
        let response = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/seat-charges", {
            method: "GET",
            headers: {
                "Content-Type": "application/json;charset=UTF-8",
                "pyxis-auth-token": USER_TOKEN
            }
        });

        let data = await response.json();

        if (data.success && data.data.totalCount > 0) {
            let reservation = data.data.list[0]; // 첫 번째 예약 정보 가져오기
            myReservationId = reservation.id;  // ✅ 배석 해제용 ID 저장
            console.log("예약 ID:", myReservationId);  // 🔍 디버깅용 콘솔 출력

            document.getElementById("userSeat").innerText = `좌석 ${reservation.seat.code} (${reservation.room.name})`;

            let now = new Date();
            let endTime = new Date(reservation.endTime);
            let remainingMinutes = Math.floor((endTime - now) / (1000 * 60));

            document.getElementById("remainingTime").innerText = remainingMinutes > 0
                ? `${Math.floor(remainingMinutes / 60)}시간 ${remainingMinutes % 60}분 남음`
                : "시간 종료됨";

            if (reservation.renewableDate) {
                let renewTime = new Date(reservation.renewableDate);
                let renewHours = renewTime.getHours().toString().padStart(2, '0');
                let renewMinutes = renewTime.getMinutes().toString().padStart(2, '0');
                document.getElementById("renewTime").innerText = `${renewHours}:${renewMinutes}부터 연장 가능`;
            } else {
                document.getElementById("renewTime").innerText = "연장 불가";
            }

        } else {
            document.getElementById("userSeat").innerText = "예약 없음";
            document.getElementById("remainingTime").innerText = "-";
            document.getElementById("renewTime").innerText = "-";
            myReservationId = null;  // ✅ 예약이 없으면 null 값 설정
        }

    } catch (error) {
        document.getElementById("userSeat").innerText = "오류 발생!";
        document.getElementById("remainingTime").innerText = "-";
        document.getElementById("renewTime").innerText = "-";
    }
    // 
    fetchQRCode();
}

// 
document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes("myinfo.html")) {
        getUserInfo();
    }
});



//집 데스크탑 pull
async function startSeatNinja(mode) {
    USER_TOKEN = localStorage.getItem("USER_TOKEN");

    if (!USER_TOKEN) {
        document.getElementById("status").innerText = "❌ 로그인 정보 없음. 로그인 페이지로 이동합니다.";
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        return;
    }

    
    if (mode === 1) {
        seatNumber = prompt("🎯 예약할 좌석 번호 입력:");
        if (!seatNumber) {
            alert("❌ 좌석 번호를 입력해야 합니다!");
            return;
        }
        document.getElementById("status").innerText = `🎯 특정 좌석 ${seatNumber} 예약 시도 중...`;
        await reserveSpecificSeat(seatNumber);
    }else if(mode === 2){
        seatNumber = prompt("🎯 예약할 좌석 번호 입력:");
        if (!seatNumber) {
            alert("❌ 좌석 번호를 입력해야 합니다!");
            return;
        }
        document.getElementById("status").innerText = `🎯 특정 좌석 ${seatNumber} 예약 시도 중...`;
        await reserveSpecificSeat_2(seatNumber);
    }else if(mode === 3){
        seatNumber = prompt("🎯 예약할 좌석 번호 입력:");
        if (!seatNumber) {
            alert("❌ 좌석 번호를 입력해야 합니다!");
            return;
        }
        document.getElementById("status").innerText = `🎯 특정 좌석 ${seatNumber} 예약 시도 중...`;
        await reserveSpecificSeat_3(seatNumber);
    }
    else {
        document.getElementById("status").innerText = "🔄 빈자리 탐색 중...";
        await findAndReserveSeat();
    }
}

// 
async function reserveSpecificSeat(seatId) {
    try {
        let response = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/seat-charges", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json;charset=UTF-8",
                "pyxis-auth-token": USER_TOKEN
            },
            body: JSON.stringify({ seatId: seatId, smufMethodCode: "MOBILE" })
        });

        let reserveData = await response.json();

        if (reserveData.success) {
            myReservationId = reserveData.data.id;  // ✅ 예약 ID 저장
            //document.getElementById("status").innerText = `✅ 좌석 ${seatId} 예약 성공! 배석 확정 중...`;

            await confirmSeat(myReservationId, seatId); // ✅ 배석 확정 실행
        } else {
            document.getElementById("status").innerText = `❌ 예약 실패: ${reserveData.message}`;
        }
    } catch (error) {
        document.getElementById("status").innerText = "❌ 예약 오류 발생!";
    }
}

async function reserveSpecificSeat_2(seatId) {
    try {
        let response = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/seat-charges", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json;charset=UTF-8",
                "pyxis-auth-token": USER_TOKEN
            },
            body: JSON.stringify({ seatId: parseInt(seatId) + 2607, smufMethodCode: "MOBILE" })

        });
        //안녕하세요

        let reserveData = await response.json();

        if (reserveData.success) {
            myReservationId = reserveData.data.id;  // ✅ 예약 ID 저장
            //document.getElementById("status").innerText = `✅ 좌석 ${seatId} 예약 성공! 배석 확정 중...`;

            await confirmSeat(myReservationId, seatId); // ✅ 배석 확정 실행
        } else {
            document.getElementById("status").innerText = `❌ 예약 실패: ${reserveData.message}`;
        }
    } catch (error) {
        document.getElementById("status").innerText = "❌ 예약 오류 발생!";
    }
}

async function reserveSpecificSeat_3(seatId) {
    try {
        let response = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/seat-charges", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json;charset=UTF-8",
                "pyxis-auth-token": USER_TOKEN
            },
            body: JSON.stringify({ seatId: parseInt(seatId) + 2729, smufMethodCode: "MOBILE" })

        });

        let reserveData = await response.json();

        if (reserveData.success) {
            myReservationId = reserveData.data.id;  // ✅ 예약 ID 저장
            
            await confirmSeat(myReservationId, seatId); // ✅ 배석 확정 실행
        } else {
            document.getElementById("status").innerText = `❌ 예약 실패: ${reserveData.message}`;
        }
    } catch (error) {
        document.getElementById("status").innerText = "❌ 예약 오류 발생!";
    }
}


async function findAndReserveSeat() {
    while (!stopFlag) {
        document.getElementById("status").innerText = "🔄 빈자리 탐색 중...";

        try {
            let response = await fetch(`https://library.konkuk.ac.kr/pyxis-api/1/api/rooms/${ROOM_ID}/seats`, {
                method: "GET",
                headers: { 
                    "Content-Type": "application/json;charset=UTF-8",
                    "pyxis-auth-token": USER_TOKEN
                }
            });

            let data = await response.json();
            let availableSeats = data.data.list.filter(seat => !seat.isOccupied);

            if (availableSeats.length === 0) {
                document.getElementById("status").innerText = "🔄 빈자리 없음, 다시 탐색 중...";
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
            }

            let targetSeat = availableSeats[0];
            document.getElementById("status").innerText = `🎯 빈자리 발견! 좌석 ${targetSeat.id} 예약 시도...`;

            let reserveResponse = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/seat-charges", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json;charset=UTF-8",
                    "pyxis-auth-token": USER_TOKEN
                },
                body: JSON.stringify({ seatId: targetSeat.id, smufMethodCode: "MOBILE" })
            });

            let reserveData = await reserveResponse.json();

            if (reserveData.success) {
                myReservationId = reserveData.data.id;
                document.getElementById("status").innerText = `✅ 좌석 ${targetSeat.id} 예약 성공! 배석 확정 중...`;

                await confirmSeat(myReservationId, seatId); // ✅ 배석 확정 실행
                break;
            }
        } catch (error) {
            document.getElementById("status").innerText = "❌ 오류 발생!";
        }

        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

async function confirmSeat(reservationId, seatId) {
    try {
        let response = await fetch("https://login-proxy-server.onrender.com/api/confirm-seat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: USER_TOKEN,
                reservationId: reservationId,
                seatId: seatId
            })
        });

        let data = await response.json();

        if (data.success) {
            document.getElementById("status").innerText = `✅ 좌석 ${reservationId} 배석 확정 완료!`;
        } else {
            document.getElementById("status").innerText = `❌ 배석 확정 실패: ${data.message}`;
        }
    } catch (error) {
        document.getElementById("status").innerText = "❌ 배석 확정 오류 발생!";
    }
}


// 
async function cancelReservation() {
    USER_TOKEN = localStorage.getItem("USER_TOKEN");

    if (!USER_TOKEN) {
        document.getElementById("cancelStatus").innerText = "❌ 로그인 정보 없음.";
        return;
    }

    if (!myReservationId) {
        document.getElementById("cancelStatus").innerText = "❌ 해제할 좌석이 없습니다.";
        return;
    }

    try {
        let response = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/seat-discharges", {
            method: "POST",
            headers: {
                "Content-Type": "application/json;charset=UTF-8",
                "pyxis-auth-token": USER_TOKEN
            },
            body: JSON.stringify({
                "seatCharge": myReservationId,  // ✅ 예약된 좌석 ID
                "smufMethodCode": "MOBILE"  // ✅ 모바일에서 해제 요청
            })
        });

        let data = await response.json();

        if (data.success) {
            document.getElementById("cancelStatus").innerText = "✅ 배석이 해제되었습니다!";
            getUserInfo(); // ✅ 해제 후 정보 다시 불러오기
        } else {
            document.getElementById("cancelStatus").innerText = `❌ 배석 해제 실패: ${data.message}`;
        }
    } catch (error) {
        document.getElementById("cancelStatus").innerText = "❌ 배석 해제 오류 발생!";
    }
}



async function renewSeat() {
    USER_TOKEN = localStorage.getItem("USER_TOKEN");

    if (!USER_TOKEN) {
        document.getElementById("renewStatus").innerText = "❌ 로그인 정보 없음.";
        return;
    }

    if (!myReservationId) {
        document.getElementById("renewStatus").innerText = "❌ 연장할 좌석 예약이 없습니다.";
        return;
    }

    try {
        let response = await fetch("https://login-proxy-server.onrender.com/api/renew-seat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: USER_TOKEN,
                reservationId: myReservationId,
                seatId:seatNumber
            })
        });

        let data = await response.json();

        if (data.success) {
            document.getElementById("renewStatus").innerText = "✅ 좌석이 연장되었습니다!";
            getUserInfo(); // 다시 정보 불러오기
        } else {
            document.getElementById("renewStatus").innerText = `❌ 연장 실패: ${data.message}`;
        }
    } catch (error) {
        document.getElementById("renewStatus").innerText = "❌ 연장 오류 발생!";
    }
}


// 
async function fetchSeatStatus() {
    let USER_TOKEN = localStorage.getItem("USER_TOKEN");

    if (!USER_TOKEN) {
        document.getElementById("cubicleSeatsStatus").innerText = "❌ 로그인 정보 없음.";
        document.getElementById("singleSeatsStatus").innerText = "❌ 로그인 정보 없음.";
        return;
    }

    let ROOM_IDS = [102, 101]; // ✅ 여러 개의 RoomID를 조회할 배열
    let allCubicleSeats = [];
    let allSingleSeats = [];

    try {
        for (let ROOM_ID of ROOM_IDS) {
            let response = await fetch(`https://library.konkuk.ac.kr/pyxis-api/1/api/rooms/${ROOM_ID}/seats`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json;charset=UTF-8",
                    "pyxis-auth-token": USER_TOKEN
                }
            });

            let data = await response.json();
            let seats = data.data.list;

            // ✅ 칸막이석 필터링 (24~114번 좌석)
            let cubicleSeats = seats.filter(s => s.code >= 24 && s.code <= 131);
            let availableCubicleSeats = cubicleSeats.filter(s => !s.isOccupied).map(s => s.code);
            allCubicleSeats.push(...availableCubicleSeats);

            // ✅ 1인석 필터링 (지정된 번호 범위)
            let singleSeatNumbers = [1, 2, 3, 4, 21, 22, 23, 391, 392, 393, 394, 395, 396, 397, 398, 405, 406, 407, 408];
            let singleSeats = seats.filter(s => singleSeatNumbers.includes(s.code));
            let availableSingleSeats = singleSeats.filter(s => !s.isOccupied).map(s => s.code);
            allSingleSeats.push(...availableSingleSeats);
        }

        // ✅ HTML 업데이트
        document.getElementById("cubicleSeatsStatus").innerHTML =
            allCubicleSeats.length > 0
                ? `✅ ${allCubicleSeats.join(", ")} 번 사용 가능`
                : "❌ 모두 사용 중";

        document.getElementById("singleSeatsStatus").innerHTML =
            allSingleSeats.length > 0
                ? `✅ ${allSingleSeats.join(", ")} 번 사용 가능`
                : "❌ 모두 사용 중";

    } catch (error) {
        document.getElementById("cubicleSeatsStatus").innerText = "❌ 데이터 불러오기 실패!";
        document.getElementById("singleSeatsStatus").innerText = "❌ 데이터 불러오기 실패!";
    }
}

// 
document.addEventListener("DOMContentLoaded", function () {
    fetchSeatStatus();
});

// 
function goToFavorites() {
    window.location.href = "favorites.html";
}









// ✅ 5. 실행 중지 기능
function stopLoop() {
    stopFlag = true;
    document.getElementById("status").innerText = "🛑 예약 중지됨.";
}

// 
document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes("index.html")) {
        USER_TOKEN = localStorage.getItem("USER_TOKEN");
        if (!USER_TOKEN) {
            document.getElementById("status").innerText = "❌ 로그인 정보 없음. 로그인 페이지로 이동합니다.";
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        }
    }
});


// 
const script = document.createElement('script');
script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
document.head.appendChild(script);

// 
async function fetchQRCode() {
    if (!USER_TOKEN) {
        document.getElementById("qrStatus").innerText = "❌ 로그인 필요";
        return;
    }

    try {
        let response = await fetch("https://library.konkuk.ac.kr/pyxis-api/1/api/my-membership-card?type=qrcode", {
            method: "GET",
            headers: {
                "Content-Type": "application/json;charset=UTF-8",
                "pyxis-auth-token": USER_TOKEN
            }
        });

        let data = await response.json();
        console.log("API 응답 데이터:", data);

        if (response.ok && data.success) {
            let qrData = data.data.membershipCard;
            console.log("QR Code Data:", qrData);

            document.getElementById("qrStatus").innerText = "";
            generateQRCode(qrData);
        } else {
            document.getElementById("qrStatus").innerText = "❌ QR 코드 불러오기 실패";
        }
    } catch (error) {
        document.getElementById("qrStatus").innerText = "❌ QR 코드 요청 오류 발생";
        console.error("QR 코드 요청 오류:", error);
    }
}

// 
function generateQRCode(data) {
    document.getElementById("qrCode").innerHTML = "";
    new QRCode(document.getElementById("qrCode"), {
        text: data,
        width: 170,
        height: 170
    });
}

// 
document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes("myinfo.html")) {
        fetchQRCode();
    }
});