package back.backend.domain.expense.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ExpenseErrorCode implements ErrorCode {
    MEMBER_NOT_IN_TRIP(HttpStatus.BAD_REQUEST, "EXPENSE_MEMBER_NOT_IN_TRIP", "여행방 멤버만 정산에 포함할 수 있습니다."),
    INVALID_PARTICIPANTS(HttpStatus.BAD_REQUEST, "INVALID_EXPENSE_PARTICIPANTS", "정산 참여자를 확인해주세요."),
    INVALID_CUSTOM_SHARES(HttpStatus.BAD_REQUEST, "INVALID_CUSTOM_SHARES", "직접 입력한 부담액의 합계가 지출 금액과 일치해야 합니다."),
    TRIP_SCHEDULE_REQUIRED(HttpStatus.CONFLICT, "TRIP_SCHEDULE_REQUIRED", "여행 일정을 먼저 확정해주세요."),
    EXPENSE_DATE_OUT_OF_RANGE(HttpStatus.BAD_REQUEST, "EXPENSE_DATE_OUT_OF_RANGE", "지출 날짜는 여행 일정 안에서 선택해주세요."),
    SETTLEMENT_TRANSFER_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTLEMENT_TRANSFER_NOT_FOUND", "완료할 수 있는 송금 내역을 찾지 못했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ExpenseErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public String getMessage() { return message; }
}
