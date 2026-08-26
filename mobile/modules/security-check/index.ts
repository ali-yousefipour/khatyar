import { requireOptionalNativeModule } from 'expo-modules-core';

// requireOptionalNativeModule هرگز throw نمی‌کند — اگر ماژول بومی موجود نباشد
// (مثلاً در Expo Go)، مقدار null برمی‌گرداند. مصرف‌کننده (device.js) قبل از
// فراخوانی متدها، وجودشان را چک می‌کند، پس این رفتار امن است.
export default requireOptionalNativeModule('SecurityCheck');
