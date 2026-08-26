import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image,
  TextInput, Modal, Dimensions, Platform, PanResponder, Linking,
} from 'react-native';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import * as ImageManipulator from 'expo-image-manipulator';
import { getImageConfig, compressToDataUri } from '../img';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import JDatePicker from '../components/JDatePicker';
import PersonalPhotoCapture from '../PersonalPhotoCapture';

const { width: SCREEN_W } = Dimensions.get('window');

const TYPE_META = {
  technical_inspection_fix: {
    icon: '🛠️', title: 'اصلاح و پیوست معاینه فنی',
    fields: [
      ['certificate_serial', 'شماره سریال گواهی معاینه فنی'],
      ['start_date', 'تاریخ شروع معاینه فنی', 'date'],
      ['end_date', 'تاریخ پایان معاینه فنی', 'date'],
    ],
  },
  insurance_fix: {
    icon: '🛡️', title: 'اصلاح و پیوست بیمه‌نامه',
    fields: [
      ['insurance_unique_code', 'کد یکتای بیمه‌نامه'],
      ['start_date', 'تاریخ شروع بیمه‌نامه', 'date'],
      ['end_date', 'تاریخ پایان بیمه‌نامه', 'date'],
    ],
  },
  taxi_license_renewal: { icon: '🚕', title: 'تمدید پروانه تاکسیرانی', fields: [] },
  operation_license_renewal: { icon: '📄', title: 'تمدید پروانه بهره‌برداری', fields: [] },
};

const DOC_LABELS = {
  technical_inspection: 'معاینه فنی', insurance_policy: 'بیمه‌نامه', national_card: 'کارت ملی',
  birth_certificate_page_1: 'شناسنامه صفحه اول', birth_certificate_page_2: 'شناسنامه صفحه دوم',
  residence_document: 'مدرک سکونت', driver_license_front: 'روی گواهینامه',
  driver_license_back: 'پشت گواهینامه', portrait_photo: 'عکس پرسنلی جدید',
  vehicle_card_front: 'روی کارت خودرو', vehicle_card_back: 'پشت کارت خودرو',
};

const SAMPLES = {
  technical_inspection: require('../../assets/company_samples/technical_inspection.jpg'),
  insurance_policy: require('../../assets/company_samples/insurance_policy.jpg'),
  birth_certificate_page_1: require('../../assets/company_samples/birth_certificate_page_1.jpg'),
  birth_certificate_page_2: require('../../assets/company_samples/birth_certificate_page_2.jpg'),
  driver_license_front: require('../../assets/company_samples/driver_license_front.jpg'),
  driver_license_back: require('../../assets/company_samples/driver_license_back.jpg'),
  vehicle_card_front: require('../../assets/company_samples/vehicle_card_front.jpg'),
  vehicle_card_back: require('../../assets/company_samples/vehicle_card_back.jpg'),
};

function money(v) { return Number(v || 0).toLocaleString('fa-IR') + ' ریال'; }
function faStatus(s) {
  return ({ draft:'پیش‌نویس', documents_pending:'در حال تکمیل مدارک', payment_pending:'در انتظار پرداخت',
    pending_review:'در انتظار بررسی', needs_correction:'نیازمند اصلاح', approved:'تأییدشده',
    rejected:'ردشده', completed:'تکمیل‌شده', cancelled:'لغوشده' })[s] || s || '—';
}

function StepHeader({ step, total, title }) {
  return <View style={st.stepHead}><Text style={st.stepCount}>مرحله {step} از {total}</Text><Text style={st.stepTitle}>{title}</Text></View>;
}

function CropEditor({ source, onDone, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const [box, setBox] = useState({ left: 6, top: 6, right: 94, bottom: 94 });
  const boxRef = React.useRef(box);
  useEffect(() => { boxRef.current = box; }, [box]);
  useEffect(() => { Image.getSize(source.uri, (w,h)=>setInfo({w,h}), ()=>setInfo({w:source.width||1200,h:source.height||900})); }, [source]);

  const displayed = useMemo(() => {
    if (!info) return { x:0, y:0, width:layout.width, height:layout.height };
    const scale=Math.min(layout.width/info.w, layout.height/info.h);
    const width=info.w*scale, height=info.h*scale;
    return { x:(layout.width-width)/2, y:(layout.height-height)/2, width, height };
  }, [info, layout]);

  const makeHandle = (corner) => {
    let startBox = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startBox = { ...boxRef.current }; },
      onPanResponderMove: (_, g) => {
        if (!startBox) return;
        const px = g.dx / Math.max(1, displayed.width) * 100;
        const py = g.dy / Math.max(1, displayed.height) * 100;
        const n={...startBox};
        if(corner.includes('l')) n.left=Math.max(0,Math.min(n.right-8,startBox.left+px));
        if(corner.includes('r')) n.right=Math.min(100,Math.max(n.left+8,startBox.right+px));
        if(corner.includes('t')) n.top=Math.max(0,Math.min(n.bottom-8,startBox.top+py));
        if(corner.includes('b')) n.bottom=Math.min(100,Math.max(n.top+8,startBox.bottom+py));
        setBox(n);
      },
      onPanResponderRelease: () => { startBox = null; },
      onPanResponderTerminate: () => { startBox = null; },
    }).panHandlers;
  };
  const handlers = useMemo(() => ({ lt:makeHandle('lt'), rt:makeHandle('rt'), lb:makeHandle('lb'), rb:makeHandle('rb') }), [displayed.width, displayed.height]);

  async function crop() {
    if (!info) return;
    setBusy(true);
    try {
      const originX=Math.max(0,Math.round(info.w*box.left/100));
      const originY=Math.max(0,Math.round(info.h*box.top/100));
      const width=Math.max(1,Math.min(info.w-originX,Math.round(info.w*(box.right-box.left)/100)));
      const height=Math.max(1,Math.min(info.h-originY,Math.round(info.h*(box.bottom-box.top)/100)));
      const out=await ImageManipulator.manipulateAsync(source.uri,[{crop:{originX,originY,width,height}},{resize:{width:getImageConfig().maxWidth}}],{compress:getImageConfig().quality/100,format:ImageManipulator.SaveFormat.JPEG,base64:true});
      if(!out?.base64) throw new Error('crop_base64_missing');
      onDone({uri:out.uri,dataUri:'data:image/jpeg;base64,'+out.base64,cropMeta:{crop:{left:box.left,top:box.top,right:100-box.right,bottom:100-box.bottom},originalWidth:info.w,originalHeight:info.h,capture_source:source.captureSource||'unknown'}});
    } catch(e) { Alert.alert('خطا','کراپ تصویر ناموفق بود. دوباره تصویر را انتخاب کنید.'); }
    finally { setBusy(false); }
  }

  const pos=(x,y)=>({left:displayed.x+displayed.width*x/100,top:displayed.y+displayed.height*y/100});
  const frame={left:displayed.x+displayed.width*box.left/100,top:displayed.y+displayed.height*box.top/100,width:displayed.width*(box.right-box.left)/100,height:displayed.height*(box.bottom-box.top)/100};
  return <View style={st.cropWrap}>
    <Text style={st.cropTitle}>چهار نقطه را جابه‌جا کنید و محدوده مدرک را مشخص کنید</Text>
    <View style={st.cropImageWrap} onLayout={e=>setLayout(e.nativeEvent.layout)}><Image source={{uri:source.uri}} style={st.cropImage} resizeMode="contain" />
      <View pointerEvents="none" style={[st.cropFrame,frame]} />
      <View {...handlers.lt} style={[st.cropHandle,pos(box.left,box.top)]} />
      <View {...handlers.rt} style={[st.cropHandle,pos(box.right,box.top)]} />
      <View {...handlers.lb} style={[st.cropHandle,pos(box.left,box.bottom)]} />
      <View {...handlers.rb} style={[st.cropHandle,pos(box.right,box.bottom)]} />
    </View>
    <View style={st.row}><TouchableOpacity style={[st.btn,st.btnGhost]} onPress={onCancel}><Text style={st.btnGhostTxt}>انصراف</Text></TouchableOpacity>
      <TouchableOpacity style={st.btn} onPress={crop} disabled={busy}>{busy?<ActivityIndicator size={30}/>:<Text style={st.btnTxt}>تأیید کراپ</Text>}</TouchableOpacity></View>
  </View>;
}

function TimePicker({ visible, hour, minute, onClose, onSelect }) {
  const hours=Array.from({length:24},(_,i)=>i), mins=Array.from({length:60},(_,i)=>i);
  const fa=n=>Number(n).toLocaleString('fa-IR',{minimumIntegerDigits:2,useGrouping:false});
  return <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}><View style={st.timeBg}><View style={st.timeCard}>
    <Text style={st.cropTitle}>انتخاب ساعت پرداخت</Text><Text style={st.timeZone}>منطقه زمانی: تهران</Text>
    <View style={st.timeCols}><ScrollView style={st.timeCol}>{hours.map(x=><TouchableOpacity key={x} style={[st.timeItem,x===hour&&st.timeOn]} onPress={()=>onSelect(x,minute)}><Text style={[st.timeTxt,x===hour&&st.timeTxtOn]}>{fa(x)}</Text></TouchableOpacity>)}</ScrollView>
    <Text style={st.timeColon}>:</Text><ScrollView style={st.timeCol}>{mins.map(x=><TouchableOpacity key={x} style={[st.timeItem,x===minute&&st.timeOn]} onPress={()=>onSelect(hour,x)}><Text style={[st.timeTxt,x===minute&&st.timeTxtOn]}>{fa(x)}</Text></TouchableOpacity>)}</ScrollView></View>
    <TouchableOpacity style={st.btnWide} onPress={onClose}><Text style={st.btnTxt}>تأیید ساعت</Text></TouchableOpacity></View></View></Modal>;
}
export default function CompanyRequestsScreen() {
  const [loading,setLoading]=useState(true); const [cfg,setCfg]=useState(null); const [types,setTypes]=useState([]);
  const [mode,setMode]=useState('home'); const [selected,setSelected]=useState(null); const [form,setForm]=useState({});
  const [req,setReq]=useState(null); const [docIndex,setDocIndex]=useState(0); const [files,setFiles]=useState({});
  const [capture,setCapture]=useState(null); const [cropSource,setCropSource]=useState(null); const [busy,setBusy]=useState(false);
  const [items,setItems]=useState([]); const [tracking,setTracking]=useState(''); const [receipt,setReceipt]=useState(null);
  const [paidAmount,setPaidAmount]=useState('');
  const [paidAt,setPaidAt]=useState(''); const [paidAtLabel,setPaidAtLabel]=useState(''); const [payDate,setPayDate]=useState(null); const [showPayDate,setShowPayDate]=useState(false); const [showPayTime,setShowPayTime]=useState(false); const [payHour,setPayHour]=useState(12); const [payMinute,setPayMinute]=useState(0);
  const [payerBank,setPayerBank]=useState('');
  useEffect(()=>{
    if(mode!=='bale-payment-status'||!paymentWatch?.paymentId||paymentWatch?.status==='paid') return;
    const timer=setInterval(async()=>{try{const d=await request(`/company-request/payment-status/${paymentWatch.paymentId}`,{noStore:true});if(d.status==='paid'||d.payment_status==='paid'){setPaymentWatch(x=>({...x,status:'paid',message:'پرداخت با موفقیت ثبت شد و درخواست برای بررسی شرکت ارسال گردید.'}));setReq(x=>x?({...x,payment_status:'paid',status:'pending_review'}):x);}}catch(_e){}},5000);
    return()=>clearInterval(timer);
  },[mode,paymentWatch?.paymentId,paymentWatch?.status]);

  const [cardPaymentId,setCardPaymentId]=useState(null);
  const [dateField,setDateField]=useState(null); const [paymentWatch,setPaymentWatch]=useState(null);
  const [busyMessage,setBusyMessage]=useState('در حال انجام عملیات…');
  const docs=selected?.required_documents||[]; const currentDoc=docs[docIndex];
  useEffect(()=>{ load(); },[]);
  async function load(){ setLoading(true); try{const d=await request('/company-request/settings',{noStore:true});setCfg(d);setTypes(d.types||[]);}catch(e){Alert.alert('خطا',e.message);}finally{setLoading(false);} }
  async function loadList(){ setLoading(true); try{const d=await request('/company-request/list',{noStore:true});setItems(d.items||[]);setMode('list');}catch(e){Alert.alert('خطا',e.message);}finally{setLoading(false);} }
  function reset(){setSelected(null);setForm({});setReq(null);setDocIndex(0);setFiles({});setReceipt(null);setTracking('');setPaidAmount('');setPaidAt('');setPaidAtLabel('');setPayDate(null);setPayerBank('');setCardPaymentId(null);setPaymentWatch(null);setMode('home');}
  function choose(t){setSelected(t);setForm({});setReq(null);setDocIndex(0);setFiles({});setMode('form');}
  const fields=useMemo(()=>TYPE_META[selected?.code]?.fields||[],[selected]);
  async function createRequest(){
    for(const [key,label] of fields){if(!String(form[key]||'').trim()){Alert.alert('اطلاعات ناقص',`وارد کردن «${label}» الزامی است.`);return;}}
    setBusyMessage('در حال ثبت درخواست…');setBusy(true);try{
      const d=req?.id
        ? await request('/company-request/update/'+req.id,{method:'POST',body:{form_data:form}})
        : await request('/company-request/create',{method:'POST',body:{request_type:selected.code,form_data:form}});
      setReq(x=>({...x,...d}));
      const missing=(selected?.required_documents||[]).findIndex(k=>!files[k]); setDocIndex(missing>=0?missing:0); setMode(missing>=0?'documents':'summary');
    }catch(e){Alert.alert('خطا',e.message);}finally{setBusy(false);}
  }
  async function pick(kind){
    if(currentDoc==='portrait_photo'){setCapture('portrait');return;}
    const perm=kind==='camera'?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted){Alert.alert('مجوز لازم است',kind==='camera'?'اجازه دوربین را فعال کنید.':'اجازه گالری را فعال کنید.');return;}
    const r=kind==='camera'?await launchCamera({mediaTypes:['images'],quality:1}):await launchLibrary({mediaTypes:['images'],quality:1});
    if(!r.canceled&&r.assets?.[0]) setCropSource({...r.assets[0],captureSource:kind==='camera'?'camera':'library'});
  }
  async function uploadCropped(out){
    setCropSource(null);setBusyMessage('در حال بارگذاری تصویر مدرک…');setBusy(true);
    try{
      const clientMeta={...out.cropMeta,capture_source:out.cropMeta?.capture_source||'unknown'};
      const d=await request('/company-request/upload',{method:'POST',body:{request_id:req.id,document_type:currentDoc,file_name:`${currentDoc}.jpg`,file_base64:out.dataUri,client_meta:clientMeta,crop_meta:clientMeta}});
      setFiles(x=>({...x,[currentDoc]:{...out,fileId:d.file_id,quality:d.quality}}));if(docIndex<docs.length-1)setDocIndex(x=>x+1);else setMode('summary');
    } catch(e){Alert.alert('خطا',e.message);}finally{setBusy(false);}
  }
  async function finalizeDocuments(){
    if(!req?.id)return;
    setBusyMessage('در حال کنترل مدارک و آماده‌سازی پرداخت…');setBusy(true);
    try{
      const d=await request('/company-document/finalize',{method:'POST',body:{request_id:req.id}});
      setReq(x=>({...x,status:d.status||x?.status}));
      if((d.status||'')==='pending_review'){Alert.alert('ثبت شد','مدارک نهایی و درخواست برای بررسی شرکت ارسال شد.');await loadList();}
      else setMode('payment');
    }catch(e){Alert.alert('خطا',e.message||'نهایی‌سازی مدارک ناموفق بود.');}
    finally{setBusy(false);}
  }
  async function savePortrait(dataUri){setCapture(null);setBusyMessage('در حال بارگذاری عکس پرسنلی…');setBusy(true);try{const d=await request('/company-request/upload',{method:'POST',body:{request_id:req.id,document_type:'portrait_photo',file_name:'portrait_photo.jpg',file_base64:dataUri,client_meta:{capture_source:'camera',faceGuide:true,camera:'front'},crop_meta:{capture_source:'camera',faceGuide:true,camera:'front'}}});setFiles(x=>({...x,portrait_photo:{dataUri,fileId:d.file_id}}));if(docIndex<docs.length-1)setDocIndex(x=>x+1);else setMode('summary');}catch(e){Alert.alert('خطا',e.message);}finally{setBusy(false);}}
  async function submitPayment(method){
    if(method==='card_to_card'&&!tracking.trim()){Alert.alert('شماره پیگیری لازم است','شماره پیگیری کارت‌به‌کارت را وارد کنید.');return;}
    if(method==='card_to_card'&&!receipt){Alert.alert('رسید لازم است','تصویر رسید کارت‌به‌کارت را انتخاب کنید.');return;}
    setBusyMessage(method==='bale_wallet'?'در حال ایجاد صورتحساب کیف پول بله…':'در حال ارسال اطلاعات پرداخت…');setBusy(true);try{
      let receiptPath=null;
      if(receipt){const up=await request('/company-request/upload',{method:'POST',body:{request_id:req.id,document_type:'card_to_card_receipt',file_name:'payment_receipt.jpg',file_base64:receipt.dataUri,crop_meta:receipt.cropMeta}});receiptPath=up.file_path;setReceipt(x=>x?{...x,fileId:up.file_id}:x);}
      const payBody={request_id:req.id,method,tracking_code:tracking,receipt_file_path:receiptPath,receipt_file_id:receipt?.fileId||null,amount:paidAmount||req.amount,paid_at:paidAt,bank_name:payerBank,device_id:Device.modelName||Device.deviceName||'' ,note:method==='bale_wallet'?'درخواست پرداخت از طریق بله':'کارت به کارت'};
      const endpoint=(method==='card_to_card'&&cardPaymentId)?'/company-request/card-payment/resubmit':'/company-request/payment';
      if(cardPaymentId)payBody.payment_id=cardPaymentId;
      const payResult=await request(endpoint,{method:'POST',body:payBody});
      if(method==='bale_wallet'){const msg=payResult.invoice_sent?'صورتحساب به ربات بله ارسال شد. پس از پرداخت، وضعیت را بررسی کنید.':(payResult.invoice_error?('لینک پرداخت ایجاد شد، اما ارسال مستقیم صورتحساب خطا داشت: '+payResult.invoice_error):'برای دریافت صورتحساب، وارد ربات بله شوید و دکمه شروع را بزنید.');setPaymentWatch({paymentId:payResult.payment_id,status:'pending',message:msg});setMode('bale-payment-status'); if(payResult.bot_link){setTimeout(()=>Linking.openURL(payResult.bot_link).catch(()=>{}),250);}}
      else {Alert.alert('ثبت شد','رسید کارت‌به‌کارت برای بررسی ارسال شد.');reset();}
    }catch(e){Alert.alert('خطا',e.message);}finally{setBusy(false);}
  }
  async function editRequest(item){
    setLoading(true); try{
      const d=await request('/company-request/detail/'+item.id,{noStore:true}); const x=d.item||d;
      const t=types.find(z=>z.code===(x.request_type_code||x.request_type))||types.find(z=>z.title===x.request_type_title);
      if(!t) throw new Error('نوع درخواست در تنظیمات فعلی یافت نشد.');
      let fd=x.form_data||{}; if(typeof fd==='string'){try{fd=JSON.parse(fd)||{};}catch(_){fd={};}}
      const f={}; (x.files||[]).forEach(z=>{f[z.document_type]={fileId:z.id,uri:z.file_path,existing:true};});
      setSelected(t);setForm(fd);setReq(x);setFiles(f);setDocIndex(0);setMode('form');
    }catch(e){Alert.alert('خطا',e.message);}finally{setLoading(false);}
  }
  function deleteRequest(item){
    Alert.alert('حذف درخواست','درخواست و تمام مدارک آن حذف شود؟',[{text:'انصراف',style:'cancel'},{text:'حذف',style:'destructive',onPress:async()=>{setLoading(true);try{await request('/company-request/'+item.id,{method:'DELETE'});await loadList();}catch(e){Alert.alert('خطا',e.message);}finally{setLoading(false);}}}]);
  }
  async function chooseReceipt(){const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted)return;const r=await launchLibrary({mediaTypes:['images'],quality:1});if(!r.canceled&&r.assets?.[0]){setBusyMessage('در حال آماده‌سازی تصویر رسید…');setBusy(true);try{const a=r.assets[0];const dataUri=await compressToDataUri(a.uri);if(!dataUri)throw new Error('jpeg_convert_failed');setReceipt({uri:a.uri,dataUri,cropMeta:{receipt:true,capture_source:'library'}});}catch(e){Alert.alert('خطا','آماده‌سازی تصویر رسید ناموفق بود.');}finally{setBusy(false);}}}

  if(loading) return <ActivityIndicator fullScreen size={100} message="در حال دریافت تنظیمات خدمات…"/>;
  if(capture==='portrait') return <PersonalPhotoCapture facing="front" showGuide={false} title="عکس پرسنلی متقاضی" instruction="صورت متقاضی را روبه‌روی دوربین قرار دهید" uniformNotice={true} onCapture={savePortrait} onCancel={()=>setCapture(null)}/>;
  if(cropSource) return <CropEditor source={cropSource} onDone={uploadCropped} onCancel={()=>setCropSource(null)}/>;
  if(busy) return <ActivityIndicator fullScreen size={100} message={busyMessage}/>;

  if(mode==='list') return <ScrollView style={st.page} contentContainerStyle={st.content}><View style={st.topRow}><TouchableOpacity onPress={()=>setMode('home')}><Text style={st.link}>بازگشت</Text></TouchableOpacity><Text style={st.h1}>درخواست‌های من</Text></View>{items.length===0?<Text style={st.empty}>درخواستی ثبت نشده است.</Text>:items.map(x=>{const editable=['draft','documents_pending','payment_pending','needs_correction'].includes(x.status)&&x.payment_status!=='paid';const removable=['draft','documents_pending','payment_pending','needs_correction','cancelled','rejected'].includes(x.status)&&x.payment_status!=='paid';return <View key={x.id} style={st.requestCard}><Text style={st.reqTitle}>{x.request_type_title}</Text><Text style={st.reqMeta}>کد رهگیری: {x.tracking_code}</Text><Text style={st.reqMeta}>وضعیت: {faStatus(x.status)}</Text><Text style={st.reqMeta}>پرداخت: {x.payment_status==='paid'?'پرداخت‌شده':x.payment_status==='pending'?'در انتظار تأیید':x.payment_status==='rejected'?'رد شده':'پرداخت‌نشده'}</Text><Text style={st.price}>{money(x.amount)}</Text>{(editable||removable)?<View style={st.reqActions}>{editable?<TouchableOpacity style={st.reqEdit} onPress={()=>editRequest(x)}><Text style={st.reqEditTxt}>ویرایش و تکمیل</Text></TouchableOpacity>:null}{removable?<TouchableOpacity style={st.reqDelete} onPress={()=>deleteRequest(x)}><Text style={st.reqDeleteTxt}>حذف درخواست</Text></TouchableOpacity>:null}</View>:null}</View>})}</ScrollView>;

  if(mode==='form') return <ScrollView style={st.page} contentContainerStyle={st.content}><StepHeader step={1} total={4} title="اطلاعات درخواست"/><Text style={st.h1}>{TYPE_META[selected.code]?.icon} {selected.title}</Text><JDatePicker visible={!!dateField} initial={dateField?form[dateField.key]:null} minYear={1300} maxYear={1450} onClose={()=>setDateField(null)} onSelect={d=>{if(dateField)setForm(x=>({...x,[dateField.key]:d.label}));setDateField(null);}}/>{fields.length===0?<View style={st.note}><Text style={st.noteTxt}>در مرحله بعد مدارک لازم را یک‌به‌یک ثبت می‌کنید.</Text></View>:fields.map(([key,label,type])=><View key={key} style={st.field}><Text style={st.label}>{label}</Text>{type==='date'?<TouchableOpacity style={st.dateInput} onPress={()=>setDateField({key,label})}><Text style={st.dateText}>{form[key]||'انتخاب تاریخ'}</Text></TouchableOpacity>:<TextInput value={form[key]||''} onChangeText={v=>setForm(x=>({...x,[key]:v}))} style={st.input} textAlign="right"/>}</View>)}<View style={st.priceBox}><Text style={st.priceLabel}>تعرفه این خدمت</Text><Text style={st.price}>{money(selected.price)}</Text></View><View style={st.row}><TouchableOpacity style={[st.btn,st.btnGhost]} onPress={reset}><Text style={st.btnGhostTxt}>انصراف</Text></TouchableOpacity><TouchableOpacity style={st.btn} onPress={createRequest} disabled={busy}>{busy?<ActivityIndicator size={28}/>:<Text style={st.btnTxt}>ثبت و ادامه</Text>}</TouchableOpacity></View></ScrollView>;

  if(mode==='documents') return <ScrollView style={st.page} contentContainerStyle={st.content}><StepHeader step={2} total={4} title="تصویربرداری و کراپ مدارک"/><Text style={st.h1}>{DOC_LABELS[currentDoc]||currentDoc}</Text><Text style={st.docProgress}>مدرک {docIndex+1} از {docs.length}</Text>{SAMPLES[currentDoc]?<View style={st.sampleCard}><Text style={st.sampleTitle}>نمونه تصویر صحیح</Text><Image source={SAMPLES[currentDoc]} style={st.sample} resizeMode="contain"/><Text style={st.help}>تصویر باید کامل، خوانا، بدون بازتاب نور و بدون بریدگی باشد.</Text></View>:<View style={st.note}><Text style={st.noteTxt}>مدرک را صاف، کامل و در نور کافی ثبت کنید.</Text></View>}<View style={st.actions}><TouchableOpacity style={st.actionCard} onPress={()=>pick('camera')}><Text style={st.actionIcon}>📷</Text><Text style={st.actionTxt}>{currentDoc==='portrait_photo'?'گرفتن عکس پرسنلی':'گرفتن عکس'}</Text></TouchableOpacity>{currentDoc!=='portrait_photo'&&<TouchableOpacity style={st.actionCard} onPress={()=>pick('gallery')}><Text style={st.actionIcon}>🖼️</Text><Text style={st.actionTxt}>انتخاب از گالری</Text></TouchableOpacity>}</View>{Object.keys(files).length>0?<Text style={st.uploaded}>✓ {Object.keys(files).length} مدرک بارگذاری شده</Text>:null}<TouchableOpacity onPress={()=>docIndex>0&&setDocIndex(x=>x-1)} disabled={docIndex===0}><Text style={[st.link,docIndex===0&&{opacity:.3}]}>بازگشت به مدرک قبلی</Text></TouchableOpacity></ScrollView>;

  if(mode==='summary') return <ScrollView style={st.page} contentContainerStyle={st.content}><StepHeader step={3} total={4} title="بازبینی درخواست"/><Text style={st.h1}>مدارک با موفقیت بارگذاری شد</Text><View style={st.success}><Text style={st.successIcon}>✓</Text><Text style={st.successText}>کد رهگیری: {req.tracking_code}</Text><Text style={st.successText}>{docs.length} مدرک ثبت شد</Text></View><View style={st.priceBox}><Text style={st.priceLabel}>مبلغ قابل پرداخت</Text><Text style={st.price}>{money(req.amount)}</Text></View><TouchableOpacity style={st.btnWide} onPress={finalizeDocuments} disabled={busy}>{busy?<ActivityIndicator size={28}/>:<Text style={st.btnTxt}>کنترل نهایی و انتخاب روش پرداخت</Text>}</TouchableOpacity></ScrollView>;

  async function checkBalePayment(){
    if(!paymentWatch?.paymentId)return; setBusy(true);
    try{const d=await request(`/company-request/payment-status/${paymentWatch.paymentId}`,{noStore:true});
      if(d.status==='paid'||d.payment_status==='paid')setPaymentWatch(x=>({...x,status:'paid',message:'پرداخت با موفقیت ثبت شد و درخواست برای بررسی شرکت ارسال گردید.'}));
      else setPaymentWatch(x=>({...x,status:d.status||'pending',message:d.last_error||'پرداخت هنوز نهایی نشده است. پس از تکمیل پرداخت در بله دوباره بررسی کنید.'}));
    }catch(e){Alert.alert('خطا',e.message);}finally{setBusy(false);}
  }
  async function sendBalePaymentLink(channel){
    if(!paymentWatch?.paymentId)return;
    setBusy(true);
    try{
      const d=await request('/company-request/payment-link/send',{method:'POST',body:{payment_id:paymentWatch.paymentId,channel}});
      const ok=channel==='sms'?d?.delivery?.sms:d?.delivery?.bale;
      Alert.alert(ok?'ارسال شد':'ارسال کامل نشد',ok?(channel==='sms'?'لینک پرداخت با پیامک ارسال شد.':'لینک پرداخت در ربات بله ارسال شد.'):(d?.delivery?.errors?.join('\n')||'لینک ساخته شد اما سرویس ارسال پاسخ موفق نداد.'));
      if(d?.bot_link && channel==='bale') Linking.openURL(d.bot_link).catch(()=>{});
    }catch(e){Alert.alert('خطا',e.message||'ارسال لینک پرداخت ناموفق بود.');}
    finally{setBusy(false);}
  }

  async function resendBaleInvoice(){
    if(!paymentWatch?.paymentId)return; setBusy(true);
    try{await request('/company-request/payment-resend',{method:'POST',body:{payment_id:paymentWatch.paymentId}});Alert.alert('ارسال شد','صورتحساب مجدداً به ربات بله ارسال شد.');}
    catch(e){Alert.alert('خطا',e.message);}finally{setBusy(false);}
  }

  async function copyCard(){const n=cfg?.payment?.card_number||'';if(!n)return;await Clipboard.setStringAsync(n);Alert.alert('کپی شد','شماره کارت در حافظه کپی شد.');}

  if(mode==='bale-payment-status') return <ScrollView style={st.page} contentContainerStyle={st.content}><StepHeader step={4} total={4} title="پرداخت کیف پول بله"/><Text style={st.h1}>وضعیت پرداخت</Text><View style={paymentWatch?.status==='paid'?st.success:st.note}><Text style={paymentWatch?.status==='paid'?st.successIcon:st.payIcon}>{paymentWatch?.status==='paid'?'✓':'🤖'}</Text><Text style={paymentWatch?.status==='paid'?st.successText:st.noteTxt}>{paymentWatch?.message}</Text></View>{paymentWatch?.status==='paid'?<TouchableOpacity style={st.btnWide} onPress={reset}><Text style={st.btnTxt}>بازگشت به صفحه اصلی</Text></TouchableOpacity>:<><TouchableOpacity style={st.btnWide} onPress={checkBalePayment} disabled={busy}>{busy?<ActivityIndicator size={28}/>:<Text style={st.btnTxt}>بررسی وضعیت پرداخت</Text>}</TouchableOpacity><TouchableOpacity style={[st.btnWide,st.btnGhost]} onPress={resendBaleInvoice} disabled={busy}><Text style={st.btnGhostTxt}>ارسال مجدد صورتحساب</Text></TouchableOpacity><TouchableOpacity style={[st.btnWide,st.btnGhost]} onPress={()=>sendBalePaymentLink('sms')} disabled={busy}><Text style={st.btnGhostTxt}>ارسال لینک پرداخت با پیامک</Text></TouchableOpacity><TouchableOpacity style={[st.btnWide,st.btnGhost]} onPress={()=>sendBalePaymentLink('bale')} disabled={busy}><Text style={st.btnGhostTxt}>ارسال لینک در ربات بله</Text></TouchableOpacity><TouchableOpacity style={[st.btnWide,st.btnGhost]} onPress={loadList}><Text style={st.btnGhostTxt}>پیگیری بعداً</Text></TouchableOpacity></>}</ScrollView>;

  if(mode==='payment') { const pay=cfg?.payment||{}; const setPaymentDate=(d)=>{setPayDate(d);setShowPayDate(false);const hh=String(payHour).padStart(2,'0'),mm=String(payMinute).padStart(2,'0');setPaidAt(`${d.gStr} ${hh}:${mm}:00`);setPaidAtLabel(`${d.label} - ${Number(payHour).toLocaleString('fa-IR',{minimumIntegerDigits:2,useGrouping:false})}:${Number(payMinute).toLocaleString('fa-IR',{minimumIntegerDigits:2,useGrouping:false})}`);}; const setPaymentTime=(h,m)=>{setPayHour(h);setPayMinute(m);if(payDate){setPaidAt(`${payDate.gStr} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);setPaidAtLabel(`${payDate.label} - ${Number(h).toLocaleString('fa-IR',{minimumIntegerDigits:2,useGrouping:false})}:${Number(m).toLocaleString('fa-IR',{minimumIntegerDigits:2,useGrouping:false})}`);}}; return <ScrollView style={st.page} contentContainerStyle={st.content}><StepHeader step={4} total={4} title="پرداخت هزینه"/><Text style={st.h1}>روش پرداخت را انتخاب کنید</Text>{(pay.mode==='both'||pay.mode==='bale_wallet')?<TouchableOpacity style={[st.payCard,!pay.bale_ready&&{opacity:.58}]} disabled={!pay.bale_ready} onPress={()=>submitPayment('bale_wallet')}><Text style={st.payIcon}>🤖</Text><View style={{flex:1}}><Text style={st.payTitle}>پرداخت با کیف پول بله بانک ملی</Text><Text style={st.paySub}>{pay.bale_ready?'برای دریافت و پرداخت صورتحساب وارد ربات بله می‌شوید.':(pay.bale_unavailable_reason||'این روش در تنظیمات سامانه آماده نشده است.')}</Text></View></TouchableOpacity>:null}{(pay.mode==='both'||pay.mode==='card_to_card')&&pay.card_enabled!==false?<View style={st.cardBox}><Text style={st.payTitle}>کارت‌به‌کارت</Text><Text style={st.cardLine}>بانک مقصد: {pay.card_bank||'—'}</Text><Text selectable style={st.cardNumber}>{pay.card_number||'شماره کارت در تنظیمات ثبت نشده است'}</Text><TouchableOpacity style={st.copyBtn} onPress={copyCard}><Text style={st.copyTxt}>کپی شماره کارت</Text></TouchableOpacity><Text style={st.cardLine}>به نام: {pay.card_owner||'—'}</Text>{pay.card_sheba?<Text selectable style={st.cardLine}>شبا: {pay.card_sheba}</Text>:null}{pay.card_description?<Text style={st.help}>{pay.card_description}</Text>:null}<Text style={st.amountDue}>مبلغ قابل پرداخت: {money(req?.amount||selected?.price||0)}</Text><TextInput style={st.input} value={paidAmount} onChangeText={setPaidAmount} placeholder="مبلغ پرداختی به ریال" keyboardType="number-pad" textAlign="right"/><TextInput style={st.input} value={tracking} onChangeText={setTracking} placeholder="شماره پیگیری ۶ تا ۳۰ رقم" keyboardType="number-pad" textAlign="right"/><View style={st.payDateRow}><TouchableOpacity style={[st.dateInput,{flex:1}]} onPress={()=>setShowPayDate(true)}><Text style={st.dateText}>{payDate?payDate.label:"انتخاب تاریخ شمسی"}</Text></TouchableOpacity><TouchableOpacity style={[st.dateInput,{flex:1}]} onPress={()=>setShowPayTime(true)}><Text style={st.dateText}>{paidAtLabel?paidAtLabel.split(" - ")[1]:"انتخاب ساعت"}</Text></TouchableOpacity></View><Text style={st.timeZone}>منطقه زمانی تهران</Text><JDatePicker visible={showPayDate} initial={payDate} minYear={1400} maxYear={1450} onClose={()=>setShowPayDate(false)} onSelect={setPaymentDate}/><TimePicker visible={showPayTime} hour={payHour} minute={payMinute} onClose={()=>setShowPayTime(false)} onSelect={setPaymentTime}/><TextInput style={st.input} value={payerBank} onChangeText={setPayerBank} placeholder="نام بانک مبدأ (اختیاری)" textAlign="right"/><TouchableOpacity style={[st.btnWide,st.btnGhost]} onPress={chooseReceipt}><Text style={st.btnGhostTxt}>{receipt?'✓ رسید انتخاب شد':'انتخاب و کراپ تصویر رسید'}</Text></TouchableOpacity>{receipt?<Image source={{uri:receipt.uri}} style={st.receipt}/>:null}<TouchableOpacity style={st.btnWide} onPress={()=>submitPayment('card_to_card')} disabled={busy}>{busy?<ActivityIndicator size={28}/>:<Text style={st.btnTxt}>{cardPaymentId?'ارسال مجدد رسید':'ارسال رسید برای بررسی'}</Text>}</TouchableOpacity></View>:null}</ScrollView>; }

  return <ScrollView style={st.page} contentContainerStyle={st.content}><View style={st.hero}><Text style={st.heroIcon}>📨</Text><Text style={st.heroTitle}>ارسال برای شرکت</Text><Text style={st.heroSub}>مدارک خود را مرحله‌به‌مرحله ثبت و برای شرکت ارسال کنید.</Text></View><TouchableOpacity style={st.listBtn} onPress={loadList}><Text style={st.listBtnTxt}>پیگیری درخواست‌های قبلی</Text></TouchableOpacity><Text style={st.section}>چه مدرکی را می‌خواهید ارسال کنید؟</Text>{types.map(t=>{const meta=TYPE_META[t.code]||{};return <TouchableOpacity key={t.id} style={st.typeCard} onPress={()=>choose(t)}><View style={st.typeIcon}><Text style={{fontSize:28}}>{meta.icon||'📄'}</Text></View><View style={{flex:1}}><Text style={st.typeTitle}>{t.title}</Text><Text style={st.typeDesc}>{t.description||`مهلت انجام حدود ${t.deadline_days} روز`}</Text><Text style={st.typePrice}>{money(t.price)}</Text></View><Text style={st.chev}>‹</Text></TouchableOpacity>})}</ScrollView>;
}

const st=StyleSheet.create({
  page:{flex:1,backgroundColor:C.paper},content:{padding:16,paddingBottom:40},hero:{backgroundColor:C.brand,borderRadius:22,padding:24,alignItems:'center',marginBottom:14},heroIcon:{fontSize:48},heroTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:22,marginTop:8},heroSub:{fontFamily:FONT.regular,color:'#e7f6f8',textAlign:'center',marginTop:6,lineHeight:22},
  listBtn:{backgroundColor:'#fff',borderWidth:1,borderColor:C.brand,borderRadius:14,padding:14,alignItems:'center'},listBtnTxt:{fontFamily:FONT.bold,color:C.brand},section:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right',marginVertical:18},typeCard:{backgroundColor:'#fff',borderRadius:18,padding:15,marginBottom:12,flexDirection:'row-reverse',alignItems:'center',gap:12,shadowColor:'#000',shadowOpacity:.06,shadowRadius:8,elevation:2},typeIcon:{width:54,height:54,borderRadius:16,backgroundColor:'#eef7f8',alignItems:'center',justifyContent:'center'},typeTitle:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',fontSize:15},typeDesc:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',fontSize:12,marginTop:4},typePrice:{fontFamily:FONT.bold,color:C.brand,textAlign:'right',marginTop:5},chev:{fontSize:30,color:C.muted},
  stepHead:{backgroundColor:'#eef7f8',borderRadius:14,padding:12,marginBottom:16},stepCount:{fontFamily:FONT.regular,color:C.brand,textAlign:'right',fontSize:12},stepTitle:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',marginTop:3},h1:{fontFamily:FONT.bold,fontSize:20,color:C.ink,textAlign:'right',marginBottom:16},field:{marginBottom:14},label:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',marginBottom:7},dateInput:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d7dee4',borderRadius:12,paddingHorizontal:12,paddingVertical:14},dateText:{fontFamily:FONT.regular,color:C.ink,textAlign:'right'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d7dee4',borderRadius:12,paddingHorizontal:12,paddingVertical:11,fontFamily:FONT.regular,color:C.ink},note:{backgroundColor:'#fff9df',borderRadius:14,padding:14,marginBottom:14},noteTxt:{fontFamily:FONT.regular,color:'#775b00',textAlign:'right',lineHeight:21},priceBox:{backgroundColor:'#fff',borderRadius:16,padding:16,alignItems:'center',marginVertical:14},priceLabel:{fontFamily:FONT.regular,color:C.muted},price:{fontFamily:FONT.bold,color:C.brand,fontSize:18,marginTop:5},row:{flexDirection:'row-reverse',gap:10,marginTop:12},btn:{flex:1,backgroundColor:C.brand,borderRadius:13,padding:13,alignItems:'center',justifyContent:'center',minHeight:48},btnTxt:{fontFamily:FONT.bold,color:'#fff'},btnGhost:{backgroundColor:'#fff',borderWidth:1,borderColor:C.brand},btnGhostTxt:{fontFamily:FONT.bold,color:C.brand},btnWide:{backgroundColor:C.brand,borderRadius:13,padding:14,alignItems:'center',marginTop:12},
  docProgress:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',marginBottom:12},sampleCard:{backgroundColor:'#fff',borderRadius:18,padding:12},sampleTitle:{fontFamily:FONT.bold,color:C.brand,textAlign:'right',marginBottom:9},sample:{width:'100%',height:260,borderRadius:12,backgroundColor:'#f1f3f5'},help:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',fontSize:12,lineHeight:20,marginTop:9},actions:{flexDirection:'row-reverse',gap:12,marginTop:16},actionCard:{flex:1,backgroundColor:'#fff',borderRadius:16,padding:18,alignItems:'center',borderWidth:1,borderColor:'#d9e7e9'},actionIcon:{fontSize:34},actionTxt:{fontFamily:FONT.bold,color:C.ink,marginTop:8},uploaded:{fontFamily:FONT.bold,color:'#087f5b',textAlign:'center',marginVertical:14},link:{fontFamily:FONT.bold,color:C.brand,textAlign:'right',padding:8},
  qualityBox:{backgroundColor:'#fff',borderRadius:16,padding:14,marginTop:14},qualityTitle:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',marginBottom:8},qualityRow:{flexDirection:'row-reverse',justifyContent:'space-between',paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#e9ecef'},qualityDoc:{fontFamily:FONT.regular,color:C.ink},qualityScore:{fontFamily:FONT.bold},success:{backgroundColor:'#e8f7ef',borderRadius:18,padding:20,alignItems:'center'},successIcon:{fontSize:38,color:'#087f5b'},successText:{fontFamily:FONT.bold,color:'#087f5b',marginTop:6},payCard:{backgroundColor:'#fff',borderRadius:18,padding:16,flexDirection:'row-reverse',gap:12,alignItems:'center',marginBottom:14,borderWidth:1,borderColor:'#d9e7e9'},payIcon:{fontSize:36},payTitle:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',fontSize:16},paySub:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',fontSize:12,marginTop:5,lineHeight:19},cardBox:{backgroundColor:'#fff',borderRadius:18,padding:16},cardLine:{fontFamily:FONT.regular,color:C.ink,textAlign:'right',marginTop:8},cardNumber:{fontFamily:FONT.bold,color:C.brand,textAlign:'center',fontSize:21,letterSpacing:2,marginVertical:12},copyBtn:{alignSelf:'center',borderWidth:1,borderColor:C.brand,borderRadius:10,paddingHorizontal:14,paddingVertical:8,marginBottom:8},copyTxt:{fontFamily:FONT.bold,color:C.brand},amountDue:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',marginVertical:12},receipt:{width:'100%',height:180,resizeMode:'contain',marginTop:10,borderRadius:12},
  topRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},reqActions:{flexDirection:'row-reverse',gap:8,marginTop:12},reqEdit:{flex:1,backgroundColor:C.brand,borderRadius:10,padding:10,alignItems:'center'},reqEditTxt:{fontFamily:FONT.bold,color:'#fff'},reqDelete:{flex:1,backgroundColor:'#fff0f0',borderWidth:1,borderColor:'#d64545',borderRadius:10,padding:10,alignItems:'center'},reqDeleteTxt:{fontFamily:FONT.bold,color:'#b42318'},empty:{fontFamily:FONT.regular,color:C.muted,textAlign:'center',marginTop:40},requestCard:{backgroundColor:'#fff',borderRadius:16,padding:16,marginBottom:12},reqTitle:{fontFamily:FONT.bold,color:C.ink,textAlign:'right'},reqMeta:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',marginTop:5},
  busyOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.55)',alignItems:'center',justifyContent:'center',padding:24},busyCard:{width:'100%',maxWidth:360,backgroundColor:'#fff',borderRadius:18,padding:24,alignItems:'center'},busyText:{fontFamily:FONT.bold,color:C.ink,fontSize:16,textAlign:'center',marginTop:14},busyHint:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'center',marginTop:8},
  cropWrap:{flex:1,backgroundColor:C.paper,padding:14},cropTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:18,textAlign:'center',marginVertical:10},cropImageWrap:{height:SCREEN_W*.85,backgroundColor:'#111',borderRadius:14,overflow:'hidden',position:'relative'},cropImage:{width:'100%',height:'100%'},cropFrame:{position:'absolute',borderWidth:3,borderColor:'#00e6b8',backgroundColor:'rgba(0,230,184,.08)'},cropHandle:{position:'absolute',width:26,height:26,borderRadius:13,backgroundColor:'#fff',borderWidth:5,borderColor:'#00e6b8',marginLeft:-13,marginTop:-13,elevation:8},timeBg:{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'},timeCard:{backgroundColor:C.paper,borderTopLeftRadius:22,borderTopRightRadius:22,padding:18,maxHeight:'75%'},timeZone:{fontFamily:FONT.regular,color:C.muted,textAlign:'center',fontSize:12,marginTop:6,marginBottom:8},timeCols:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',height:260,gap:12},timeCol:{width:100},timeItem:{padding:10,borderRadius:10,alignItems:'center',marginVertical:2,backgroundColor:'#fff'},timeOn:{backgroundColor:C.brand},timeTxt:{fontFamily:FONT.bold,color:C.ink,fontSize:17},timeTxtOn:{color:'#fff'},timeColon:{fontFamily:FONT.bold,fontSize:28,color:C.ink},payDateRow:{flexDirection:'row-reverse',gap:8,marginTop:8},
});
