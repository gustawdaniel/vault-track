import { FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

// No default secret: a missing ADMIN_TOKEN_SECRET must disable admin auth, not
// fall back to a public value anyone could sign tokens with.
function getSecret(): string | null {
    const secret = process.env.ADMIN_TOKEN_SECRET;
    return secret && secret.length >= 16 ? secret : null;
}

export function generateToken(email: string): string {
    const payload = Buffer.from(email).toString('base64url');
    const secret = getSecret();
    if (!secret) throw new Error('ADMIN_TOKEN_SECRET is not configured');
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}.${hash}`;
}

export function verifyToken(token: string): string | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, hash] = parts;

    const secret = getSecret();
    if (!secret || !process.env.ADMIN_EMAIL) return null;
    const expectedHash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const a = Buffer.from(hash);
    const b = Buffer.from(expectedHash);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
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
