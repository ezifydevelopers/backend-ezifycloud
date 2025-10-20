"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./lib/prisma"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await prisma_1.default.$connect();
        console.log('✅ Database connected successfully');
        const app = (0, app_1.default)();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
process.on('SIGINT', async () => {
    console.log('🔄 Closing database connections...');
    await prisma_1.default.$disconnect();
    console.log('✅ Database connections closed');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🔄 Closing database connections...');
    await prisma_1.default.$disconnect();
    console.log('✅ Database connections closed');
    process.exit(0);
});
startServer();
//# sourceMappingURL=server.js.map