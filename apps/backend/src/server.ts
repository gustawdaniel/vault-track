import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { currencyRoutes } from './modules/currency/routes';

const server: FastifyInstance = Fastify({
    logger: true
});

// Zod validation setup
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

const start = async () => {
    try {
        // Plugins
        await server.register(cors, {
            origin: '*', // TODO: locking down in production
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

        // Currency
        await server.register(currencyRoutes, { prefix: '/api/currency' });

        // TODO: Register modules (Auth, LLM)

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
