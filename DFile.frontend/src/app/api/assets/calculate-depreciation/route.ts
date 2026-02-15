import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { purchasePrice, usefulLifeYears, purchaseDate } = body;

        const price = Number(purchasePrice);
        const lifeYears = Number(usefulLifeYears);
        const pDate = new Date(purchaseDate);
        const now = new Date();

        if (isNaN(price) || isNaN(lifeYears) || !purchaseDate) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const totalMonths = lifeYears * 12;
        const monthlyDepreciation = price / totalMonths;

        const monthsElapsed = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
        const validMonthsElapsed = Math.max(0, monthsElapsed);

        const accumulatedDepreciation = Math.min(price, monthlyDepreciation * validMonthsElapsed);
        const currentBookValue = Math.max(0, price - accumulatedDepreciation);

        return NextResponse.json({
            currentBookValue,
            monthlyDepreciation
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
