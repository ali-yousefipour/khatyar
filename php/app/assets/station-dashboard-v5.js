/* Station dashboard integration: keeps station capture and my stations as normal dashboard items. */
(function () {
  'use strict';
  const ITEMS = [
    {id:'station-capture', title:'ثبت موقعیت و تصویر خطوط', icon:'bi-geo-alt-fill', screen:'StationCaptureV4Screen'},
    {id:'my-stations', title:'ایستگاه‌های ثبت‌شده من', icon:'bi-pin-map-fill', screen:'MyStationsScreen'}
  ];
  window.KhatyarStationDashboard = {items: ITEMS};
})();
