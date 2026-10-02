import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Configuramos CORS para permitir que cualquier aplicación web (frontend) se conecte
@WebSocketGateway({ cors: { origin: '*' } })
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Detecta cuando un operador abre el dashboard
  handleConnection(client: Socket) {
    console.log(`[WebSockets] Operador conectado: ${client.id}`);
  }

  // Detecta cuando un operador cierra el dashboard
  handleDisconnect(client: Socket) {
    console.log(`[WebSockets] Operador desconectado: ${client.id}`);
  }

  // Método que llamaremos para transmitir los datos
  emitNewAlert(alert: any) {
    this.server.emit('nueva-alerta', alert);
  }
}