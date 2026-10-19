export const thresholds=Object.freeze({stockGapPercent:0.10,stockGapKobo:500000,transferGapKobo:200000,minGrossMargin:0.35});
const validMoney=x=>Number.isSafeInteger(x)&&x>=0;
const validQuantity=x=>Number.isFinite(x)&&x>=0;
export function checkStockSales({opening,restocked,closing,ingredientPerPlate,priceKobo,recordedSalesKobo}){
if(![opening,restocked,closing,ingredientPerPlate].every(validQuantity)||ingredientPerPlate===0||![priceKobo,recordedSalesKobo].every(validMoney))throw Error('Invalid inventory or money');
const used=opening+restocked-closing;if(used<0)throw Error('Closing stock exceeds available stock');
const expectedSalesKobo=Math.round(used/ingredientPerPlate*priceKobo);if(!Number.isSafeInteger(expectedSalesKobo))throw Error('Amount overflow');
const gapKobo=expectedSalesKobo-recordedSalesKobo;return gapKobo>thresholds.stockGapKobo&&gapKobo>expectedSalesKobo*thresholds.stockGapPercent?{rule:'stock_sales',gapKobo,evidence:{used,expectedSalesKobo,recordedSalesKobo}}:null;
}
export function checkTransfers({recordedTransferKobo,verifiedPaystackKobo}){
if(![recordedTransferKobo,verifiedPaystackKobo].every(validMoney))throw Error('Invalid amount');
const signedGapKobo=verifiedPaystackKobo-recordedTransferKobo;return Math.abs(signedGapKobo)>thresholds.transferGapKobo?{rule:'transfer_paystack',gapKobo:Math.abs(signedGapKobo),signedGapKobo,evidence:{recordedTransferKobo,verifiedPaystackKobo}}:null;
}
export function checkMargin({priceKobo,ingredientCostsKobo}){
if(!validMoney(priceKobo)||priceKobo===0||!Array.isArray(ingredientCostsKobo)||!ingredientCostsKobo.every(validMoney))throw Error('Invalid menu or ingredient cost');
const costKobo=ingredientCostsKobo.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(costKobo))throw Error('Amount overflow');
const margin=(priceKobo-costKobo)/priceKobo;return margin<thresholds.minGrossMargin?{rule:'margin_squeeze',margin,proposedPriceKobo:Math.ceil(costKobo/(1-thresholds.minGrossMargin)/5000)*5000,evidence:{priceKobo,costKobo}}:null;
}