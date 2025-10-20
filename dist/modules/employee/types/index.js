"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalStatus = exports.AchievementType = exports.EventType = exports.NotificationType = exports.Priority = exports.LeaveType = exports.LeaveStatus = void 0;
var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "pending";
    LeaveStatus["APPROVED"] = "approved";
    LeaveStatus["REJECTED"] = "rejected";
})(LeaveStatus || (exports.LeaveStatus = LeaveStatus = {}));
var LeaveType;
(function (LeaveType) {
    LeaveType["ANNUAL"] = "annual";
    LeaveType["SICK"] = "sick";
    LeaveType["CASUAL"] = "casual";
    LeaveType["MATERNITY"] = "maternity";
    LeaveType["PATERNITY"] = "paternity";
    LeaveType["EMERGENCY"] = "emergency";
})(LeaveType || (exports.LeaveType = LeaveType = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
})(Priority || (exports.Priority = Priority = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["SUCCESS"] = "success";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var EventType;
(function (EventType) {
    EventType["LEAVE"] = "leave";
    EventType["HOLIDAY"] = "holiday";
    EventType["MEETING"] = "meeting";
    EventType["EVENT"] = "event";
})(EventType || (exports.EventType = EventType = {}));
var AchievementType;
(function (AchievementType) {
    AchievementType["AWARD"] = "award";
    AchievementType["MILESTONE"] = "milestone";
    AchievementType["CERTIFICATION"] = "certification";
    AchievementType["RECOGNITION"] = "recognition";
})(AchievementType || (exports.AchievementType = AchievementType = {}));
var GoalStatus;
(function (GoalStatus) {
    GoalStatus["NOT_STARTED"] = "not_started";
    GoalStatus["IN_PROGRESS"] = "in_progress";
    GoalStatus["COMPLETED"] = "completed";
    GoalStatus["OVERDUE"] = "overdue";
})(GoalStatus || (exports.GoalStatus = GoalStatus = {}));
//# sourceMappingURL=index.js.map