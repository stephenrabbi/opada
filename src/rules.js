export const thresholds=Object.freeze({stockGapPercent:0.10,stockGapKobo:500000,transferGapKobo:200000,minGrossMargin:0.35,priceRoundingKobo:5000});
// Every check takes thresholds as an optional last argument so each business can have its own; defaults above.
const validMoney=x=>Number.isSafeInteger(x)&&x>=0;
const validQuantity=x=>Number.isFinite(x)&&x>=0;
export function checkStockSales({opening,restocked,closing,ingredientPerPlate,priceKobo,recordedSalesKobo},t=thresholds){
if(![opening,restocked,closing,ingredientPerPlate].every(validQuantity)||ingredientPerPlate===0||![priceKobo,recordedSalesKobo].every(validMoney))throw Error('Invalid inventory or money');
const used=opening+restocked-closing;if(used<0)throw Error('Closing stock exceeds available stock');
const expectedSalesKobo=Math.round(used/ingredientPerPlate*priceKobo);if(!Number.isSafeInteger(expectedSalesKobo))throw Error('Amount overflow');
const gapKobo=expectedSalesKobo-recordedSalesKobo;return gapKobo>t.stockGapKobo&&gapKobo>expectedSalesKobo*t.stockGapPercent?{rule:'stock_sales',gapKobo,evidence:{used,expectedSalesKobo,recordedSalesKobo}}:null;
}
export function checkTransfers({recordedTransferKobo,verifiedPaystackKobo},t=thresholds){
if(![recordedTransferKobo,verifiedPaystackKobo].every(validMoney))throw Error('Invalid amount');
const signedGapKobo=verifiedPaystackKobo-recordedTransferKobo;return Math.abs(signedGapKobo)>t.transferGapKobo?{rule:'transfer_paystack',gapKobo:Math.abs(signedGapKobo),signedGapKobo,evidence:{recordedTransferKobo,verifiedPaystackKobo}}:null;
}
export function checkMargin({priceKobo,ingredientCostsKobo},t=thresholds){
if(!validMoney(priceKobo)||priceKobo===0||!Array.isArray(ingredientCostsKobo)||!ingredientCostsKobo.every(validMoney))throw Error('Invalid menu or ingredient cost');
const costKobo=ingredientCostsKobo.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(costKobo))throw Error('Amount overflow');
const margin=(priceKobo-costKobo)/priceKobo;return margin<t.minGrossMargin?{rule:'margin_squeeze',margin,proposedPriceKobo:Math.ceil(costKobo/(1-t.minGrossMargin)/t.priceRoundingKobo)*t.priceRoundingKobo,evidence:{priceKobo,costKobo}}:null;
}