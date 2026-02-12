import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyCookie from '@fastify/cookie';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { currencyRoutes } from './modules/currency/routes';
import { usersRoutes } from './modules/users/routes';
import { adminRoutes } from './modules/admin/routes';
import { initDB } from './db/client';

const server: FastifyInstance = Fastify({
    logger: true
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
            origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5000'], // Allow Admin UI and App UI
            credentials: true,
        });

        await server.register(fastifyCookie, {
            secret: process.env.COOKIE_SECRET || 'changeme',
            parseOptions: {}, // options for parsing cookies
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

        // Modules
        await server.register(currencyRoutes, { prefix: '/api/currency' });
        await server.register(usersRoutes, { prefix: '/api/users' });
        await server.register(adminRoutes, { prefix: '/api/admin' });

        const port = parseInt(process.env.PORT || '4000', 10);
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
        console.log(`Documentation available at http://localhost:${port}/documentation`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
