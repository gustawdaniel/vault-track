import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import OpenAI from 'openai';
import { MultipartFile } from '@fastify/multipart';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { db } from '../../db/client';

// Type definitions for LLM response
interface LLMReceiptItem {
    product_name: string;
    final_price: number | string;
    raw_line_text: string;
    category_guess?: string;
}

interface LLMReceiptResult {
    shop_name: string;
    date: string;
    receipt_total?: number | string;
    items?: LLMReceiptItem[];
}

interface ReceiptSplit {
    amount: number;
    memo: string;
    category: string;
    payee: string;
}

interface ReceiptAnalysisResult {
    payee: string;
    date: string;
    splits: ReceiptSplit[];
    receipt_total?: number;
    debug?: string;
}

export async function receiptsRoutes(fastify: FastifyInstance) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.post(
        '/analyze',
        {
            schema: {
                // schema for multipart is tricky in fastify-zod, usually we skip body validation or use explicit types
                // We'll rely on manual check for now or basic schema
            },
        },
        async (req, reply) => {
            console.log('--- Analyze Receipt Request Received ---');

            // Check credits
            const syncGroupId = req.headers['x-sync-group-id'] as string;
            if (!syncGroupId) {
                return reply.code(401).send({ error: 'Unauthorized: Missing sync group ID' });
            }

            const userResult = await db.execute({
                sql: 'SELECT credits FROM users WHERE id = ?',
                args: [syncGroupId]
            });

            if (userResult.rows.length === 0) {
                return reply.code(401).send({ error: 'User not found. Please sync first to register.' });
            }

            const credits = userResult.rows[0].credits as number;
            if (credits <= 0) {
                return reply.code(402).send({ error: 'Insufficient credits. Please top up.' });
            }

            const data = await req.file();
            if (!data) {
                console.log('No file uploaded');
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            const buffer = await data.toBuffer();
            const base64Image = buffer.toString('base64');
            const dataUrl = `data:${data.mimetype};base64,${base64Image}`;

            try {
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert receipt analyzer. Extract data from the receipt image into a JSON format.
                            
Rules:
1. **Shop Name**: Extract the store name (e.g. Biedronka).
2. **Date**: Extract date (YYYY-MM-DDTHH:mm:ss).
3. **Items**: Extract ALL line items.
   - **product_name**: The specific NAME of the product (e.g. "Masło Ekstra", "Coca-Cola 0.5L"). 
     - NEVER use the Shop Name here. 
     - If it's a deposit, use "Kaucja".
   - **final_price**: The price the user ACTUALLY PAYS for this line item. 
     - SUBTRACT any discounts immediately. 
     - If line is 10.00 and next line is "Discount -2.00", final_price is 8.00.
     - Ensure the sum of all final_prices equals the Receipt Total.
   - **raw_line_text**: The exact text shown on the line.
   - **category_guess**: 'Food', 'Home', 'Transport', etc.
4. **Receipt Total**: Extract the "To Pay" (Do zapłaty) amount shown on receipt.

Example JSON:
{
  "shop_name": "Biedronka",
  "date": "2026-02-12T14:00:00",
  "receipt_total": 12.50,
  "items": [
    { "product_name": "Masło Mlekovita", "final_price": 5.00, "raw_line_text": "Maslo Ex. 200g", "category_guess": "Food:Groceries" },
    { "product_name": "Kaucja", "final_price": 0.50, "raw_line_text": "Butelka zwrotna", "category_guess": "Food" }
  ]
}
`,
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: 'Analyze this receipt.' },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: dataUrl,
                                    },
                                },
                            ],
                        },
                    ],
                    max_tokens: 2000,
                    response_format: { type: 'json_object' },
                });

                // Deduct credit only after successful API call
                await db.execute({
                    sql: 'UPDATE users SET credits = credits - 1 WHERE id = ?',
                    args: [syncGroupId]
                });

                const content = completion.choices[0].message.content;
                if (!content) throw new Error('No content from LLM');

                console.log('LLM Result (Raw):', content);

                const llmResult = JSON.parse(content) as LLMReceiptResult;

                // Map LLM result to App Model
                const result: ReceiptAnalysisResult = {
                    payee: llmResult.shop_name,
                    date: llmResult.date,
                    splits: []
                };

                if (llmResult.items && Array.isArray(llmResult.items)) {
                    result.splits = llmResult.items.map((item: LLMReceiptItem) => {
                        // Handle potential string numbers with commas (e.g. "5,99")
                        const priceStr = String(item.final_price).replace(',', '.');
                        let amount = parseFloat(priceStr);
                        if (isNaN(amount)) amount = 0;

                        amount = Math.round(amount * 100) / 100;

                        let payee = item.product_name || '';

                        const shopName = (llmResult.shop_name || '').toLowerCase();
                        const payeeLower = payee.toLowerCase();

                        // Fallback: if product name is basically the shop name or contains it, try to use raw text
                        if (shopName && (payeeLower === shopName || payeeLower.includes(shopName))) {
                            payee = item.raw_line_text;
                        }

                        return {
                            amount: amount,
                            memo: item.raw_line_text,
                            category: item.category_guess || 'Uncategorized',
                            payee: payee || item.raw_line_text // Final fallback
                        };
                    })
                        // Filter out negative amounts (e.g. discounts that weren't applied to items)
                        .filter((split: ReceiptSplit) => split.amount > 0);
                }

                if (llmResult.receipt_total) {
                    const totalStr = String(llmResult.receipt_total).replace(',', '.');
                    result.receipt_total = parseFloat(totalStr);
                }

                console.log('Processed Result:', JSON.stringify(result, null, 2));

                return { ...result, debug: content };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to analyze receipt';
                console.error('Analysis Error:', error);
                req.log.error(error);
                return reply.code(500).send({ error: errorMessage });
            }
        }
    );
}
