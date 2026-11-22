/**
 * Pure conditional evaluator shared by dynamic Android profile fields.
 * The PHP backend repeats every authorization/required check before save.
 */
const isEmpty=value=>value==null||value===''||(Array.isArray(value)&&value.length===0);
const number=value=>{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  const digits=String(value??'').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
  if(!/^-?\d+(?:\.\d+)?$/.test(digits.trim()))return null;
  return Number(digits);
};
const jalali=value=>typeof value==='string'&&/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value)?value.replaceAll('/','-'):null;
export function profileRuleMatches(rule,values){
  if(!rule||typeof rule!=='object')return false;
  if(Array.isArray(rule.all))return rule.all.length>0&&rule.all.every(r=>profileRuleMatches(r,values));
  if(Array.isArray(rule.any))return rule.any.length>0&&rule.any.some(r=>profileRuleMatches(r,values));
  const actual=values?.[rule.field],wanted=rule.value;
  switch(rule.op){
    case 'empty':return isEmpty(actual);
    case 'not_empty':return !isEmpty(actual);
    case 'true':return actual===true||actual===1||actual==='1';
    case 'false':return actual===false||actual===0||actual==='0'||isEmpty(actual);
    case 'eq':return !isEmpty(actual)&&String(actual)===String(wanted);
    case 'neq':return isEmpty(actual)||String(actual)!==String(wanted);
    case 'contains':return Array.isArray(actual)?actual.includes(wanted):String(actual??'').includes(String(wanted??''));
    case 'not_contains':return Array.isArray(actual)?!actual.includes(wanted):!String(actual??'').includes(String(wanted??''));
    case 'in':return Array.isArray(wanted)&&wanted.map(String).includes(String(actual??''));
    case 'not_in':return Array.isArray(wanted)&&!wanted.map(String).includes(String(actual??''));
    case 'gt':case 'gte':case 'lt':case 'lte':{
      const a=number(actual),b=number(wanted);
      if(a===null||b===null)return false;
      return rule.op==='gt'?a>b:rule.op==='gte'?a>=b:rule.op==='lt'?a<b:a<=b;
    }
    case 'date_between':case 'date_outside':{
      const v=jalali(actual),a=jalali(wanted?.[0]),b=jalali(wanted?.[1]);
      if(!v||!a||!b)return false;
      const inside=v>=a&&v<=b;
      return rule.op==='date_between'?inside:!inside;
    }
    default:return false;
  }
}
export function profileFieldState(field,values){
  const state={visible:field.visible!==false,enabled:field.enabled!==false,required:!!field.required,readonly:!!field.readonly};
  for(const rule of field.rules||[]){
    if(!profileRuleMatches(rule.when,values))continue;
    switch(rule.action){
      case 'show':state.visible=true;break;
      case 'hide':state.visible=false;break;
      case 'enable':state.enabled=true;break;
      case 'disable':state.enabled=false;break;
      case 'require':state.required=true;break;
      case 'optional':state.required=false;break;
      case 'readonly':state.readonly=true;break;
      case 'editable':state.readonly=false;break;
    }
  }
  if(!state.visible||!state.enabled||state.readonly)state.required=false;
  return state;
}
export function profileCanEdit(field,identity){
  const userId=Number(identity?.id)||0,roleId=Number(identity?.role_id)||0;
  const denyUsers=Array.isArray(field?.deny_users)?field.deny_users.map(Number):[];
  const denyRoles=Array.isArray(field?.deny_roles)?field.deny_roles.map(Number):[];
  if(denyUsers.includes(userId)||denyRoles.includes(roleId))return false;
  const users=Array.isArray(field?.edit_users)?field.edit_users.map(Number):[];
  const roles=Array.isArray(field?.edit_roles)?field.edit_roles.map(Number):[];
  if(!users.length&&!roles.length)return true;
  return (userId>0&&users.includes(userId))||(roleId>0&&roles.includes(roleId));
}
export function profileSchemaCustomFields(schema){
  return (schema?.sections||[]).flatMap(s=>s.fields||[])
    .filter(f=>f?.binding==='custom'&&Number.isSafeInteger(Number(f.custom_field_id))&&Number(f.custom_field_id)>0);
}
