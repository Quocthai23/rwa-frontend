/**
 * Centralized Trading Calculations
 * 
 * All trade-related math in one place:
 * - Validation (price, amount, bounds)
 * - Fee calculation
 * - Balance checks
 * - Margin & PnL
 */

import Decimal from 'decimal.js';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface TradeValidationRules {
    minTradeSize: number;
    maxTradeSize: number;
    pipSize: number;
    volumeStep: number;
    minPrice?: number;
    maxPrice?: number;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    suggestion?: number;
    warning?: string;
}

export interface FeeEstimate {
    amount: number;
    rate: number;
    total: number; // notional + fee
}

export interface BalanceCheckResult {
    isSufficient: boolean;
    needed: number;
    available: number;
    shortOf?: number;
}

// ═══════════════════════════════════════════════════════════
// PRICE VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate price against tick size and bounds
 */
export function validatePrice(
    priceInput: string | number,
    side: 'BUY' | 'SELL',
    lastPrice: number,
    rules: TradeValidationRules,
): ValidationResult {
    const price = Number(priceInput);

    // 1. Not empty
    if (!priceInput || isNaN(price) || price <= 0) {
        return { isValid: false, error: 'Price must be a positive number' };
    }

    // 2. Within bounds
    if (rules.minPrice && price < rules.minPrice) {
        return { isValid: false, error: `Min price: ${rules.minPrice}` };
    }
    if (rules.maxPrice && price > rules.maxPrice) {
        return { isValid: false, error: `Max price: ${rules.maxPrice}` };
    }

    // 3. Tick size validation
    const roundedPrice = roundToTick(price, rules.pipSize);
    if (price !== roundedPrice) {
        const decimalPlaces = getDecimalPlaces(rules.pipSize);
        return {
            isValid: false,
            error: `Price precision: max ${decimalPlaces} decimals`,
            suggestion: roundedPrice,
        };
    }

    // 4. Sanity check (price shouldn't be wildly different from last)
    const deviation = Math.abs((price - lastPrice) / lastPrice);
    if (deviation > 0.5) {
        // > 50% deviation
        return {
            isValid: true,
            warning: `Price significantly different from last (${lastPrice})`,
        };
    }

    return { isValid: true };
}

// ═══════════════════════════════════════════════════════════
// AMOUNT VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate order amount against trading rules
 */
export function validateAmount(
    amountInput: string | number,
    rules: TradeValidationRules,
): ValidationResult {
    const amount = Number(amountInput);

    // 1. Not empty
    if (!amountInput || isNaN(amount) || amount <= 0) {
        return { isValid: false, error: 'Amount must be a positive number' };
    }

    // 2. Min/Max size
    if (amount < rules.minTradeSize) {
        return { isValid: false, error: `Minimum size: ${rules.minTradeSize}` };
    }
    if (amount > rules.maxTradeSize) {
        return { isValid: false, error: `Maximum size: ${rules.maxTradeSize}` };
    }

    // 3. Volume step validation
    const roundedAmount = roundToStep(amount, rules.volumeStep);
    if (Math.abs(amount - roundedAmount) > 1e-10) {
        return {
            isValid: false,
            error: `Increment: ${rules.volumeStep}`,
            suggestion: roundedAmount,
        };
    }

    return { isValid: true };
}

// ═══════════════════════════════════════════════════════════
// BALANCE CHECKS
// ═══════════════════════════════════════════════════════════

/**
 * Check if user has sufficient balance for trade
 */
export function checkBalance(
    price: number,
    amount: number,
    availableBalance: number,
    feeRate: number,
): BalanceCheckResult {
    const notional = price * amount;
    const feeAmount = notional * feeRate;
    const totalNeeded = notional + feeAmount;

    if (totalNeeded > availableBalance) {
        return {
            isSufficient: false,
            needed: totalNeeded,
            available: availableBalance,
            shortOf: totalNeeded - availableBalance,
        };
    }

    return {
        isSufficient: true,
        needed: totalNeeded,
        available: availableBalance,
    };
}

// ═══════════════════════════════════════════════════════════
// FEE CALCULATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Estimate fee for trade
 */
export function estimateFee(
    notional: number,
    feeRate: number,
    tradingCommissionPerLot?: number,
    contractSize?: number,
): FeeEstimate {
    let fee = 0;

    // Prefer per-lot fee if available
    if (tradingCommissionPerLot && contractSize && contractSize > 0) {
        const lots = notional / contractSize;
        fee = tradingCommissionPerLot * lots;
    } else {
        // Fall back to percentage
        fee = notional * feeRate;
    }

    return {
        amount: fee,
        rate: feeRate,
        total: notional + fee,
    };
}

// ═══════════════════════════════════════════════════════════
// ROUNDING UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Round price to nearest tick size
 */
export function roundToTick(price: number, pipSize: number): number {
    if (pipSize <= 0) return price;
    return Math.round(price / pipSize) * pipSize;
}

/**
 * Round amount down to volume step (conservative for balance check)
 */
export function roundToStep(amount: number, step: number): number {
    if (step <= 0) return amount;
    return Math.floor(amount / step) * step;
}

/**
 * Get decimal places from a number
 */
export function getDecimalPlaces(num: number): number {
    const str = String(num);
    const index = str.indexOf('.');
    return index > -1 ? str.length - index - 1 : 0;
}

// ═══════════════════════════════════════════════════════════
// STOP/LIMIT ORDER VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate stop price for stop orders
 */
export function validateStopPrice(
    stopPrice: string | number,
    lastPrice: number,
    side: 'BUY' | 'SELL',
    rules: TradeValidationRules,
): ValidationResult {
    const stop = Number(stopPrice);

    if (!stopPrice || isNaN(stop) || stop <= 0) {
        return { isValid: false, error: 'Stop price must be a positive number' };
    }

    // BUY stop: should be ABOVE last price (trigger above)
    // SELL stop: should be BELOW last price (trigger below)
    if (side === 'BUY' && stop <= lastPrice) {
        return {
            isValid: false,
            error: 'Stop price should be above market for BUY',
            suggestion: Number((lastPrice * 1.02).toFixed(getDecimalPlaces(rules.pipSize))),
        };
    }

    if (side === 'SELL' && stop >= lastPrice) {
        return {
            isValid: false,
            error: 'Stop price should be below market for SELL',
            suggestion: Number((lastPrice * 0.98).toFixed(getDecimalPlaces(rules.pipSize))),
        };
    }

    // Validate tick size
    const rounded = roundToTick(stop, rules.pipSize);
    if (stop !== rounded) {
        return {
            isValid: false,
            error: `Stop price precision error`,
            suggestion: rounded,
        };
    }

    return { isValid: true };
}

// ═══════════════════════════════════════════════════════════
// BRACKET ORDER (TP/SL) VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate take profit price
 */
export function validateTakeProfit(
    tpPrice: string | number,
    entryPrice: number,
    side: 'BUY' | 'SELL',
    rules: TradeValidationRules,
): ValidationResult {
    const tp = Number(tpPrice);

    if (!tpPrice || isNaN(tp) || tp <= 0) {
        return { isValid: false, error: 'Take profit price required' };
    }

    // For BUY: TP should be > entry (profit)
    // For SELL: TP should be < entry (profit)
    if (side === 'BUY' && tp <= entryPrice) {
        return {
            isValid: false,
            error: 'Take profit should be above entry price for BUY',
        };
    }

    if (side === 'SELL' && tp >= entryPrice) {
        return {
            isValid: false,
            error: 'Take profit should be below entry price for SELL',
        };
    }

    return { isValid: true };
}

/**
 * Validate stop loss price
 */
export function validateStopLoss(
    slPrice: string | number,
    entryPrice: number,
    side: 'BUY' | 'SELL',
    rules: TradeValidationRules,
): ValidationResult {
    const sl = Number(slPrice);

    if (!slPrice || isNaN(sl) || sl <= 0) {
        return { isValid: false, error: 'Stop loss price required' };
    }

    // For BUY: SL should be < entry (loss)
    // For SELL: SL should be > entry (loss)
    if (side === 'BUY' && sl >= entryPrice) {
        return {
            isValid: false,
            error: 'Stop loss should be below entry price for BUY',
        };
    }

    if (side === 'SELL' && sl <= entryPrice) {
        return {
            isValid: false,
            error: 'Stop loss should be above entry price for SELL',
        };
    }

    return { isValid: true };
}

// ═══════════════════════════════════════════════════════════
// QUICK CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Calculate notional value (price * amount)
 */
export function calculateNotional(price: number, amount: number): number {
    return new Decimal(price).times(amount).toNumber();
}

/**
 * Calculate max tradeable amount given balance and price
 */
export function calculateMaxAmount(
    availableBalance: number,
    price: number,
    feeRate: number,
    volumeStep: number,
    maxTradeSize: number,
): number {
    // Available / (price * (1 + feeRate))
    const maxByBalance = new Decimal(availableBalance)
        .dividedBy(new Decimal(price).times(1 + feeRate))
        .toNumber();

    // Apply max constraint
    const maxAllowed = Math.min(maxByBalance, maxTradeSize);

    // Round down to volume step
    return roundToStep(maxAllowed, volumeStep);
}

/**
 * Calculate quick % amounts
 */
export function calculateQuickAmounts(
    maxAmount: number,
    percentages: number[] = [25, 50, 75, 100],
): Record<number, number> {
    const result: Record<number, number> = {};
    percentages.forEach((pct) => {
        result[pct] = Math.floor((maxAmount * pct) / 100);
    });
    return result;
}
