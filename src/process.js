import{checkStockSales,checkTransfers,checkMargin}from './rules.js';
export function processFacts({stock=null,transfer=null,margin=null}={}){
const flags=[],skipped=[];
for(const [rule,input,check] of [['stock_sales',stock,checkStockSales],['transfer_paystack',transfer,checkTransfers],['margin_squeeze',margin,checkMargin]]){
if(input===null){skipped.push({rule,reason:'insufficient_evidence'});continue;}
const result=check(input);if(result)flags.push(result);
}
return{flags,skipped};
}