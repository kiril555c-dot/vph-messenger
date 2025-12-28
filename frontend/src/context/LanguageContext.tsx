import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    'welcome': 'WELCOME TO FLICK',
    'select_chat': 'SELECT A CHAT TO START MESSAGING',
    'search': 'SEARCH...',
    'online': 'ONLINE',
    'offline': 'OFFLINE',
    'was_online': 'WAS ONLINE',
    'type_message': 'TYPE A MESSAGE...',
    'profile_settings': 'PROFILE SETTINGS',
    'username': 'USERNAME',
    'avatar_url': 'AVATAR URL',
    'bio': 'BIO',
    'relationship_status': 'RELATIONSHIP STATUS',
    'notifications': 'NOTIFICATIONS',
    'save': 'SAVE',
    'back_to_chat': 'BACK TO CHAT',
    'upload_avatar': 'CLICK TO UPLOAD AVATAR',
    'single': 'Single',
    'dating': 'Dating',
    'married': 'Married',
    'complicated': 'It\'s complicated',
    'searching': 'Active searching',
    'not_specified': 'Not specified',
    'about_me': 'ABOUT ME',
    'unknown_user': 'Unknown User',
    'group_chat': 'Group Chat',
    'voice_message': 'Voice Message',
    'sticker': 'Sticker',
    'new_message_from': 'New message from',
    'browser_not_supported': 'This browser does not support notifications',
    'profile_updated': 'Profile updated successfully!',
    'logout': 'LOGOUT',
    'settings': 'SETTINGS',
    'login': 'LOGIN',
    'register': 'REGISTER',
    'email': 'EMAIL',
    'password': 'PASSWORD',
    'confirm_password': 'CONFIRM PASSWORD',
    'already_have_account': 'Already have an account?',
    'dont_have_account': 'Don\'t have an account?',
    'passwords_dont_match': 'Passwords do not match',
    'registration_failed': 'Registration failed',
    'login_failed': 'Login failed',
    'calling': 'Calling...',
    'incoming_call': 'Incoming Call...',
    'video_call': 'Video Call',
    'audio_call': 'Audio Call',
    'answer': 'Answer',
    'decline': 'Decline',
    'end_call': 'End Call',
  },
  ru: {
    'welcome': 'ДОБРО ПОЖАЛОВАТЬ В VPhMassanger',
    'select_chat': 'ВЫБЕРИТЕ ЧАТ ЧТОБЫ НАЧАТЬ ОБЩЕНИЕ',
    'search': 'ПОИСК...',
    'online': 'В СЕТИ',
    'offline': 'ОФФЛАЙН',
    'was_online': 'БЫЛ(А)',
    'type_message': 'НАПИШИТЕ СООБЩЕНИЕ...',
    'profile_settings': 'НАСТРОЙКИ ПРОФИЛЯ',
    'username': 'ИМЯ ПОЛЬЗОВАТЕЛЯ',
    'avatar_url': 'URL АВАТАРА',
    'bio': 'О СЕБЕ',
    'relationship_status': 'СЕМЕЙНОЕ ПОЛОЖЕНИЕ',
    'notifications': 'УВЕДОМЛЕНИЯ',
    'save': 'СОХРАНИТЬ',
    'back_to_chat': 'НАЗАД В ЧАТ',
    'upload_avatar': 'НАЖМИТЕ ЧТОБЫ ЗАГРУЗИТЬ АВАТАР',
    'single': 'Свободен/Свободна',
    'dating': 'Встречаюсь',
    'married': 'В браке',
    'complicated': 'Всё сложно',
    'searching': 'В активном поиске',
    'not_specified': 'Не указано',
    'about_me': 'О СЕБЕ',
    'unknown_user': 'Неизвестный пользователь',
    'group_chat': 'Групповой чат',
    'voice_message': 'Голосовое сообщение',
    'sticker': 'Стикер',
    'new_message_from': 'Новое сообщение от',
    'browser_not_supported': 'Этот браузер не поддерживает уведомления',
    'profile_updated': 'Профиль обновлен!',
    'logout': 'ВЫЙТИ',
    'settings': 'НАСТРОЙКИ',
    'login': 'ВОЙТИ',
    'register': 'РЕГИСТРАЦИЯ',
    'email': 'EMAIL',
    'password': 'ПАРОЛЬ',
    'confirm_password': 'ПОДТВЕРДИТЕ ПАРОЛЬ',
    'already_have_account': 'Уже есть аккаунт?',
    'dont_have_account': 'Нет аккаунта?',
    'passwords_dont_match': 'Пароли не совпадают',
    'registration_failed': 'Ошибка регистрации',
    'login_failed': 'Ошибка входа',
    'calling': 'Звонок...',
    'incoming_call': 'Входящий звонок...',
    'video_call': 'Видеозвонок',
    'audio_call': 'Аудиозвонок',
    'answer': 'Ответить',
    'decline': 'Отклонить',
    'end_call': 'Завершить',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};