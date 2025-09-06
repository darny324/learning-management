import {createServer} from 'http'
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

export {httpServer, io};