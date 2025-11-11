"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const app_1 = require("./config/app");
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const leave_1 = __importDefault(require("./routes/leave"));
const routes_1 = __importDefault(require("./modules/admin/routes"));
const routes_2 = __importDefault(require("./modules/manager/routes"));
const routes_3 = __importDefault(require("./modules/employee/routes"));
const routes_4 = __importDefault(require("./modules/workspace/routes"));
const routes_5 = __importDefault(require("./modules/board/routes"));
const routes_6 = __importDefault(require("./modules/comment/routes"));
const routes_7 = __importDefault(require("./modules/file/routes"));
const routes_8 = __importDefault(require("./modules/approval/routes"));
const routes_9 = __importDefault(require("./modules/automation/routes"));
const routes_10 = __importDefault(require("./modules/ai/routes"));
const routes_11 = __importDefault(require("./modules/permission/routes"));
const routes_12 = __importDefault(require("./modules/audit/routes"));
const routes_13 = __importDefault(require("./modules/dashboard/routes"));
const routes_14 = __importDefault(require("./modules/report/routes"));
const routes_15 = __importDefault(require("./modules/template/routes"));
const currency_1 = __importDefault(require("./modules/board/routes/currency"));
const routes_16 = __importDefault(require("./modules/invoice/routes"));
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: app_1.APP_CONFIG.SERVER.CORS_ORIGINS,
        credentials: true
    }));
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: app_1.APP_CONFIG.RATE_LIMIT.WINDOW_MS,
        max: app_1.APP_CONFIG.RATE_LIMIT.MAX_REQUESTS,
        message: app_1.APP_CONFIG.RATE_LIMIT.MESSAGE,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        }
    });
    app.use(limiter);
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    app.use((0, compression_1.default)());
    app.use((0, morgan_1.default)('combined'));
    app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: app_1.APP_CONFIG.SERVER.NODE_ENV
        });
    });
    app.use('/api/auth', auth_1.default);
    app.use('/api/users', user_1.default);
    app.use('/api/leaves', leave_1.default);
    app.use('/api/admin', routes_1.default);
    app.use('/api/manager', routes_2.default);
    app.use('/api/employee', routes_3.default);
    app.use('/api/workspaces', routes_4.default);
    app.use('/api/boards', routes_5.default);
    app.use('/api/comments', routes_6.default);
    app.use('/api/files', routes_7.default);
    app.use('/api/approvals', routes_8.default);
    app.use('/api/automations', routes_9.default);
    app.use('/api/ai', routes_10.default);
    app.use('/api/permissions', routes_11.default);
    app.use('/api/audit', routes_12.default);
    app.use('/api/dashboards', routes_13.default);
    app.use('/api/reports', routes_14.default);
    app.use('/api', routes_15.default);
    app.use('/api/currency', currency_1.default);
    app.use('/api/invoice-templates', routes_16.default);
    app.use(notFound_1.notFound);
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.default = createApp;
//# sourceMappingURL=app.js.map