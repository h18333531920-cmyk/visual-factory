export const FEATURE_IDS = ['library','static','icons','dynamic','analytics','home','upload'];
// 允许上传是附加权限位：不进路由选择，也不进旧 product 回退，默认关闭。
export function legacyFeatures(product) {
  if(product==='icons')return ['icons'];
  if(product==='all')return FEATURE_IDS.filter(id=>id!=='home'&&id!=='upload');
  return ['library','static'];
}
export function normalizeFeatures(value) {
  if(!Array.isArray(value)||value.some(id=>!FEATURE_IDS.includes(id)))throw Object.assign(Error('可用功能格式不正确'),{status:400});
  return FEATURE_IDS.filter(id=>value.includes(id));
}
export function accountFeatures(account) {
  if(Array.isArray(account.features))return normalizeFeatures(account.features);
  if(account.features_json!=null){try{return normalizeFeatures(JSON.parse(account.features_json));}catch{return [];}}
  return legacyFeatures(account.product);
}
export function productForFeatures(features) { const only=features.filter(id=>id!=='upload'); return only.includes('icons')?(only.length===1?'icons':'all'):'diy'; }
export function inputFeatures(input) {return Object.hasOwn(input,'features')?normalizeFeatures(input.features):legacyFeatures(input.product);}
export function firstFeatureRoute(features) {return ['static','library','icons','dynamic','analytics','home'].find(id=>features.includes(id))||'admin';}
