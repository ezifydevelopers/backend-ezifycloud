"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = exports.PerformanceLevel = exports.TeamMemberStatus = exports.LeavePriority = exports.ApprovalStatus = void 0;
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pending";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["REJECTED"] = "rejected";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var LeavePriority;
(function (LeavePriority) {
    LeavePriority["LOW"] = "low";
    LeavePriority["MEDIUM"] = "medium";
    LeavePriority["HIGH"] = "high";
})(LeavePriority || (exports.LeavePriority = LeavePriority = {}));
var TeamMemberStatus;
(function (TeamMemberStatus) {
    TeamMemberStatus["ACTIVE"] = "active";
    TeamMemberStatus["INACTIVE"] = "inactive";
    TeamMemberStatus["ON_LEAVE"] = "on_leave";
})(TeamMemberStatus || (exports.TeamMemberStatus = TeamMemberStatus = {}));
var PerformanceLevel;
(function (PerformanceLevel) {
    PerformanceLevel["HIGH"] = "high";
    PerformanceLevel["MEDIUM"] = "medium";
    PerformanceLevel["LOW"] = "low";
})(PerformanceLevel || (exports.PerformanceLevel = PerformanceLevel = {}));
var EventType;
(function (EventType) {
    EventType["LEAVE"] = "leave";
    EventType["HOLIDAY"] = "holiday";
    EventType["MEETING"] = "meeting";
    EventType["EVENT"] = "event";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=index.js.map