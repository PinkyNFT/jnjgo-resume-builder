import { NextRequest, NextResponse } from 'next/server';
import { requireAiUser } from '@/lib/ai-guards';
import { getAiCreditStatus } from '@/lib/ai-credits';

// Live numbers for the beta credit meter; never cached by the platform.
export const dynamic = 'force-dynamic';

/** Today's shared beta AI credits: { limit, used, remaining, resetAt, exhausted }. */
export async function GET(request: NextRequest) {
    const userId = await requireAiUser(request.cookies.get('NEXT_LOCALE')?.value);
    if (userId instanceof NextResponse) return userId;
    try {
        const status = await getAiCreditStatus();
        return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[ai-credits] status failed:', error);
        return NextResponse.json({ error: 'Credit status unavailable' }, { status: 500 });
    }
}
