import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

/**
 * چون کامپوننت Modal در ری‌اکت‌نیتیو (به‌خصوص در اندروید) در یک پنجرهٔ بومیِ جداگانه
 * رندر می‌شود، KeyboardAvoidingView سطح برنامه (در App.js) داخل آن اثر نمی‌گذارد و
 * تکست‌باکس‌های داخل Modal می‌توانند زیر صفحه‌کلید پنهان بمانند. این کامپوننت را باید
 * بلافاصله داخل هر <Modal> که ورودی متنی دارد قرار داد.
 */
export default function ModalKeyboardView({ style, children, ...rest }) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      {...rest}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
