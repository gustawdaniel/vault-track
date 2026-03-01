import { FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

export function generateToken(email: string): string {
    const payload = Buffer.from(email).toString('base64url');
    const secret = process.env.ADMIN_TOKEN_SECRET || 'changeme';
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}.${hash}`;
}

export function verifyToken(token: string): string | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, hash] = parts;

    const secret = process.env.ADMIN_TOKEN_SECRET || 'changeme';
    const expectedHash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (hash === expectedHash) {
        try {
            const email = Buffer.from(payload, 'base64url').toString('utf-8');
            if (email === process.env.ADMIN_EMAIL) {
                return email;
            }
        } catch (e) {
            return null;
        }
    }
    return null;
}

export function extractBearerToken(req: FastifyRequest): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
}
