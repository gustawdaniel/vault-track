import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyMultipart from '@fastify/multipart';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { currencyRoutes } from './modules/currency/routes';
import { usersRoutes } from './modules/users/routes';
import { adminRoutes } from './modules/admin/routes';
import { receiptsRoutes } from './modules/receipts/routes';
import { syncRoutes } from './modules/sync/routes';
import { initDB } from './db/client';

const server: FastifyInstance = Fastify({
    logger: {
        level: 'warn',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
    bodyLimit: 10485760, // 10MB
});

// Zod validation setup
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

const start = async () => {
    try {
        // Init DB Schema
        await initDB();

        // Plugins
        await server.register(cors, {
            origin: true, // Reflects the origin to allow any frontend (even custom ngrok) while preserving credentials support
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'Accept',
                'Origin',
                'x-sync-group-id'
            ],
        });

        await server.register(fastifyMultipart, {
            limits: {
                fieldNameSize: 100, // Max field name size in bytes
                fieldSize: 100, // Max field value size in bytes
                fields: 10, // Max number of non-file fields
                fileSize: 10000000, // For multipart forms, the max file size in bytes
                files: 1, // Max number of file fields
                headerPairs: 2000, // Max number of header key=>value pairs
            },
        });

        await server.register(swagger, {
            openapi: {
                info: {
                    title: 'VaultTrack API',
                    description: 'Backend API for VaultTrack/Open Cash Manager',
                    version: '0.1.0',
                },
                servers: [],
            },
            transform: jsonSchemaTransform,
        });

        await server.register(swaggerUi, {
            routePrefix: '/documentation',
        });

        // Health Check
        server.get('/health', async () => {
            return { status: 'ok', timestamp: new Date().toISOString() };
        });

        server.get('/', async () => {
            return { app: 'VaultTrack API', version: '0.1.0' };
        });

        // Modules
        await server.register(currencyRoutes, { prefix: '/api/currency' });
        await server.register(usersRoutes, { prefix: '/api/users' });
        await server.register(adminRoutes, { prefix: '/api/admin' });
        await server.register(receiptsRoutes, { prefix: '/api/receipts' });
        await server.register(syncRoutes, { prefix: '/api/sync' });

        const port = parseInt(process.env.PORT || '4500', 10);
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
        console.log(`Documentation available at http://localhost:${port}/documentation`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
