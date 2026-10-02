import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Activar Helmet para asegurar las cabeceras HTTP contra vulnerabilidades comunes
  app.use(helmet());

  // 2. Configurar CORS (Permitir solicitudes de origen seguro)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // 3. Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 4. Configuración de Swagger (Documentación de la API)
  const config = new DocumentBuilder()
    .setTitle('Lules-Alerta API')
    .setDescription('API geoespacial para el sistema de alertas de emergencias en Lules.')
    .setVersion('1.0')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 5. Puerto dinámico (compatible con Render y entorno local)
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Servidor corriendo en el puerto ${port}`);
}
bootstrap();