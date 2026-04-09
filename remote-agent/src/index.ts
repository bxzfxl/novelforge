import { Server } from 'socket.io';
import { createServer } from 'node:http';

const PORT = Number(process.env.AGENT_PORT) || 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(`客户端已连接: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`客户端已断开: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Remote Agent 服务已启动，端口: ${PORT}`);
});
