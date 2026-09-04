import { Text } from 'react-native';

export const C = {
  ink:'#142033', slate:'#314159', paper:'#f6f8fc', card:'#ffffff', line:'#e1e8f2',
  muted:'#748198', brand:'#086b56', brand2:'#074f42', taxi:'#ffc928',
  danger:'#dc3545', ok:'#12a66a', taxiInk:'#4b3a00',
  soft:'#edf8f4', blue:'#2563eb', purple:'#7c3aed', orange:'#f59e0b', shadow:'rgba(20,32,51,.12)'
};
export const FONT = { regular: 'Vazirmatn', bold: 'Vazirmatn-Bold' };

// The app is Persian/RTL. Components can still override this with their own
// textAlign when a centered/icon/number presentation is required.
Text.defaultProps = {
  ...(Text.defaultProps || {}),
  style: [{ textAlign: 'right', writingDirection: 'rtl' }, ...(Text.defaultProps?.style ? [Text.defaultProps.style] : [])],
};

export const UI = {
  radius:18,
  card:{ backgroundColor:'#fff', borderRadius:18, borderWidth:1, borderColor:'#e1e8f2', shadowColor:'#000', shadowOpacity:.08, shadowRadius:14, shadowOffset:{width:0,height:6}, elevation:3 },
  pill:{ borderRadius:999, paddingHorizontal:14, paddingVertical:9 },
};
