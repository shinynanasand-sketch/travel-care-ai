/* eslint-disable no-undef */
// FCM 백그라운드 메시지 수신용 Service Worker
importScripts('/firebase-sw-config.js');
importScripts(
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js'
);

if (self.FIREBASE_SW_CONFIG) {
  firebase.initializeApp(self.FIREBASE_SW_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      payload.notification?.title || payload.data?.title || '저혈당 위험 알림';
    const body =
      payload.notification?.body ||
      payload.data?.body ||
      '현재 혈당이 위험 수치입니다!';

    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'hypoglycemia-alert',
      requireInteraction: true,
      data: payload.data,
    });
  });
}
