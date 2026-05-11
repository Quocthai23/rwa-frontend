/**
 * Order Submission Manager (Refactored)
 * 
 * Replaces submitTradePanelOrder with simplified logic
 * Handles form validation, confirmation, and API submission
 */

import { CreateOrderPayload, OrderType } from '@/types/orders';
import {
    validatePrice,
    validateAmount,
    validateStopPrice,
    validateTakeProfit,
    validateStopLoss,
    checkBalance,
    estimateFee,
    TradeValidationRules,
} from '@/utils/tradingCalculations';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface OrderFormState {
    price: string;
    amount: string;
    stopPrice?: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;

    orderType: 'LIMIT' | 'MARKET' | 'STOP';
    side: 'BUY' | 'SELL';
    leverage?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderSubmissionContext {
    // User & Account
    accountId: string;
    userId: string;
    symbol: string;

    // Market Data
    lastPrice: number;
    bid: number;
    ask: number;

    // Account State
    availableBalance: number;
    position?: { quantity: number; entryPrice: number };

    // Asset Rules
    rules: TradeValidationRules;
    feeRate: number;

    // Form State
    form: OrderFormState;

    // Callbacks
    onSuccess: (orderId: string) => void;
    onError: (error: string) => void;
    onConfirmation?: (payload: OrderSubmissionPayload) => Promise<boolean>;
}

export interface FieldValidationErrors {
    price?: string;
    amount?: string;
    stopPrice?: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    balance?: string;
}

export interface OrderSubmissionPayload {
    assetId: string;
    side: 'BUY' | 'SELL';
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    idempotencyKey?: string;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface SubmissionResult {
    success: boolean;
    orderId?: string;
    error?: string;
    validationErrors?: FieldValidationErrors;
}

// ═══════════════════════════════════════════════════════════
// VALIDATION PIPELINE
// ═══════════════════════════════════════════════════════════

/**
 * Validate all form fields
 */
export function validateOrderForm(
    context: OrderSubmissionContext,
): FieldValidationErrors {
    const errors: FieldValidationErrors = {};
    const { form, rules, lastPrice, availableBalance, feeRate } = context;

    // Price validation (except MARKET)
    if (form.orderType !== 'MARKET') {
        const priceResult = validatePrice(form.price, form.side, lastPrice, rules);
        if (!priceResult.isValid) {
            errors.price = priceResult.error;
        }
    }

    // Amount validation
    const amountResult = validateAmount(form.amount, rules);
    if (!amountResult.isValid) {
        errors.amount = amountResult.error;
    }

    // Stop price validation (for STOP orders)
    if (form.orderType === 'STOP' && form.stopPrice) {
        const stopResult = validateStopPrice(form.stopPrice, lastPrice, form.side, rules);
        if (!stopResult.isValid) {
            errors.stopPrice = stopResult.error;
        }
    }

    // TP/SL validation (if enabled)
    if (form.takeProfitPrice) {
        const price = Number(form.price) || lastPrice;
        const tpResult = validateTakeProfit(form.takeProfitPrice, price, form.side, rules);
        if (!tpResult.isValid) {
            errors.takeProfitPrice = tpResult.error;
        }
    }

    if (form.stopLossPrice) {
        const price = Number(form.price) || lastPrice;
        const slResult = validateStopLoss(form.stopLossPrice, price, form.side, rules);
        if (!slResult.isValid) {
            errors.stopLossPrice = slResult.error;
        }
    }

    // Balance check (for BUY orders)
    if (form.side === 'BUY' && !Object.keys(errors).includes('price') && !Object.keys(errors).includes('amount')) {
        const price = form.orderType === 'MARKET' ? (form.side === 'BUY' ? context.ask : context.bid) : Number(form.price);
        const amount = Number(form.amount);

        const balanceCheck = checkBalance(price, amount, availableBalance, feeRate);
        if (!balanceCheck.isSufficient) {
            errors.balance = `Insufficient balance. Need: ${balanceCheck.needed.toFixed(2)}, Available: ${availableBalance.toFixed(2)}`;
        }
    }

    return errors;
}

// ═══════════════════════════════════════════════════════════
// PAYLOAD BUILDING
// ═══════════════════════════════════════════════════════════

/**
 * Build order submission payload
 */
export function buildOrderPayload(
    context: OrderSubmissionContext,
): OrderSubmissionPayload | null {
    const { form, symbol, rules } = context;

    // Get effective price
    let effectivePrice: number | undefined;

    if (form.orderType === 'MARKET') {
        // For market orders, we don't send price (backend uses best available)
        effectivePrice = undefined;
    } else {
        effectivePrice = Number(form.price);
    }

    return {
        assetId: symbol,
        side: form.side,
        type: form.orderType as OrderType,
        quantity: Number(form.amount),
        price: effectivePrice,
        stopPrice: form.stopPrice ? Number(form.stopPrice) : undefined,
        takeProfitPrice: form.takeProfitPrice ? Number(form.takeProfitPrice) : undefined,
        stopLossPrice: form.stopLossPrice ? Number(form.stopLossPrice) : undefined,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        timeInForce: form.timeInForce || 'GTC',
    };
}

// ═══════════════════════════════════════════════════════════
// MAIN SUBMISSION LOGIC
// ═══════════════════════════════════════════════════════════

/**
 * Execute order submission with full validation pipeline
 */
export async function submitOrder(
    context: OrderSubmissionContext,
): Promise<SubmissionResult> {
    // 1. Pre-checks
    if (!context.userId) {
        return { success: false, error: 'User not authenticated' };
    }

    if (!context.accountId) {
        return { success: false, error: 'No account selected' };
    }

    // 2. Validate form
    const validationErrors = validateOrderForm(context);
    if (Object.keys(validationErrors).length > 0) {
        return {
            success: false,
            error: 'Validation failed',
            validationErrors,
        };
    }

    // 3. Build payload
    const payload = buildOrderPayload(context);
    if (!payload) {
        return { success: false, error: 'Failed to build order payload' };
    }

    // 4. Confirmation step (if callback provided)
    if (context.onConfirmation) {
        const confirmed = await context.onConfirmation(payload);
        if (!confirmed) {
            return { success: false, error: 'Order cancelled by user' };
        }
    }

    // 5. API submission (caller should implement)
    // This function returns the framework, caller implements createOrder
    return {
        success: true,
        orderId: undefined, // Will be set by API call
    };
}

// ═══════════════════════════════════════════════════════════
// CONVENIENCE HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Check if form is complete and ready to submit
 */
export function isFormValid(context: OrderSubmissionContext): boolean {
    const errors = validateOrderForm(context);
    return Object.keys(errors).length === 0;
}

/**
 * Get fee estimate for display
 */
export function getFeeEstimate(context: OrderSubmissionContext): number {
    const { form, feeRate, rules } = context;
    const price = form.orderType === 'MARKET' ? (form.side === 'BUY' ? context.ask : context.bid) : Number(form.price);
    const amount = Number(form.amount);

    const notional = price * amount;
    const fee = estimateFee(notional, feeRate);
    return fee.amount;
}

/**
 * Format order summary for confirmation
 */
export function formatOrderSummary(context: OrderSubmissionContext): string {
    const { form, symbol } = context;
    const price = Number(form.price) || context.lastPrice;
    const amount = Number(form.amount);
    const notional = price * amount;

    return `${form.side} ${amount} ${symbol} @ ${price} = ~${notional.toFixed(2)}`;
}
